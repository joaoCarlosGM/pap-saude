import {
  MembershipStatus,
  Prisma,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"

import {
  PERMISSIONS,
} from "@/server/iam/permissions"

import {
  assignSystemRole,
} from "@/server/iam/role-assignment.service"

import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_KEYS,
  getSystemRoleDefinition,
  type SystemRoleKey,
} from "@/server/iam/system-role-catalog"

import {
  requirePermission,
} from "@/server/iam/authorization.service"

import { AccessDeniedError } from "@/server/iam/authorization.errors"

import {
  getEffectiveAccessProfile,
} from "@/server/iam/effective-access-profile.service"

import {
  listAccessibleOrganizationIds,
} from "./admin-access.service"

import {
  AdminRoleAssignmentNotFoundError,
  ConcurrentAdminRoleMutationError,
  LastPapAdminError,
  UnsupportedAdminRoleError,
} from "./admin-role.errors"

function isSystemRoleKey(
  value: string,
): value is SystemRoleKey {
  return SYSTEM_ROLES.some(
    (
      role,
    ) =>
      role.key ===
      value,
  )
}

/**
 * Keep the role mutation and its AuditEvent in the same database transaction.
 * A serialization conflict is retried with fresh authorization-independent
 * state, so two concurrent last-admin removals cannot both succeed.
 */
async function roleMutationTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(callback, {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      ) {
        throw error
      }

      if (attempt === 2) {
        throw new ConcurrentAdminRoleMutationError()
      }
    }
  }

  throw new ConcurrentAdminRoleMutationError()
}

export async function getAdminRoleOverview(
  actorUserId: string,
) {
  const profile =
    await getEffectiveAccessProfile(
      actorUserId,
    )

  if (
    !profile ||
    !profile.permissions.includes(
      PERMISSIONS.ROLE_READ,
    )
  ) {
    const access =
      await listAccessibleOrganizationIds(
        actorUserId,
        PERMISSIONS.ROLE_READ,
      )

    if (
      !access.global &&
      access.organizationIds.length ===
        0
    ) {
      return {
        roles: [],
        assignments: [],
        canManage: false,
      }
    }
  }

  const access =
    await listAccessibleOrganizationIds(
      actorUserId,
      PERMISSIONS.ROLE_READ,
    )

  const assignments =
    await db.roleAssignment.findMany({
      where:
        access.global
          ? {
              role: {
                system:
                  true,
              },
            }
          : {
              organizationId: {
                in:
                  access.organizationIds,
              },

              role: {
                system:
                  true,
              },
            },

      select: {
        id: true,
        organizationId:
          true,

        user: {
          select: {
            id: true,
            email: true,
            displayName:
              true,
            isActive:
              true,
          },
        },

        role: {
          select: {
            key: true,
            name: true,
          },
        },

        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },

      orderBy: [
        {
          role: {
            key:
              "asc",
          },
        },
        {
          user: {
            displayName:
              "asc",
          },
        },
      ],
    })

  const canManage =
    profile?.roles.some(
      (
        role,
      ) =>
        role.permissions.includes(
          PERMISSIONS.ROLE_MANAGE,
        ),
    ) ??
    false

  return {
    roles:
      SYSTEM_ROLES.map(
        (
          role,
        ) => ({
          key:
            role.key,
          name:
            role.name,
          description:
            role.description,
          scope:
            role.scope,
          permissions:
            [
              ...role.permissions,
            ].sort(),
        }),
      ),

    assignments,

    canManage,
  }
}

export async function createAdminRoleAssignment(
  input: {
    actorUserId: string
    targetUserId: string
    roleKey: string
    organizationId?: string | null
  },
) {
  if (
    !isSystemRoleKey(
      input.roleKey,
    )
  ) {
    throw new UnsupportedAdminRoleError()
  }

  const definition =
    getSystemRoleDefinition(
      input.roleKey,
    )

  if (!definition) {
    throw new UnsupportedAdminRoleError()
  }

  if (
    definition.scope ===
    "GLOBAL"
  ) {
    await requirePermission({
      userId:
        input.actorUserId,

      permission:
        PERMISSIONS.ROLE_MANAGE,
    })

    if (
      input.organizationId !=
      null
    ) {
      throw new UnsupportedAdminRoleError()
    }
  } else {
    if (
      !input.organizationId
    ) {
      throw new UnsupportedAdminRoleError()
    }

    await requirePermission({
      userId:
        input.actorUserId,

      permission:
        PERMISSIONS.ROLE_MANAGE,

      organizationId:
        input.organizationId,
    })
  }

  return roleMutationTransaction(
    async (tx) => {
      const targetUser =
        await tx.user.findUnique({
          where: { id: input.targetUserId },
          select: { id: true, isActive: true },
        })

      if (!targetUser?.isActive) {
        throw new UnsupportedAdminRoleError()
      }

      if (definition.scope !== "GLOBAL") {
        const membership =
          await tx.membership.findUnique({
            where: {
              userId_organizationId: {
                userId: input.targetUserId,
                organizationId: input.organizationId!,
              },
            },
            select: { status: true },
          })

        if (membership?.status !== MembershipStatus.ACTIVE) {
          throw new UnsupportedAdminRoleError()
        }
      }

      const role = await tx.role.findUnique({
        where: { key: input.roleKey },
        select: { id: true },
      })

      // assignSystemRole remains the canonical scope/type validator.
      if (!role) {
        throw new UnsupportedAdminRoleError()
      }

      const existing = await tx.roleAssignment.findFirst({
        where: {
          userId: input.targetUserId,
          roleId: role.id,
          organizationId: input.organizationId ?? null,
        },
        select: { id: true },
      })

      const assignment = await assignSystemRole(
        {
          userId: input.targetUserId,
          roleKey: input.roleKey as SystemRoleKey,
          organizationId: input.organizationId,
        },
        tx,
      )

      // Idempotent assignments should not generate false audit events.
      if (!existing) {
        await tx.auditEvent.create({
          data: {
            actorUserId: input.actorUserId,
            organizationId: assignment.organizationId,
            action: "ROLE_ASSIGNED",
            resourceType: "ROLE_ASSIGNMENT",
            resourceId: assignment.id,
            after: {
              targetUserId: input.targetUserId,
              roleKey: input.roleKey,
              organizationId: assignment.organizationId,
            },
          },
        })
      }

      return assignment
    },
  )
}

export async function revokeAdminRoleAssignment(
  input: {
    actorUserId: string
    assignmentId: string
  },
) {
  const assignment =
    await db.roleAssignment.findUnique({
      where: {
        id:
          input.assignmentId,
      },

      include: {
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },

        role: true,

        organization: {
          select: {
            id: true,
          },
        },
      },
    })

  if (
    !assignment
  ) {
    throw new AdminRoleAssignmentNotFoundError()
  }

  const definition =
    getSystemRoleDefinition(
      assignment.role.key,
    )

  if (!definition) {
    throw new UnsupportedAdminRoleError()
  }

  try {
    if (definition.scope === "GLOBAL") {
      await requirePermission({
        userId: input.actorUserId,
        permission: PERMISSIONS.ROLE_MANAGE,
      })
    } else {
      if (!assignment.organizationId) {
        throw new UnsupportedAdminRoleError()
      }

      await requirePermission({
        userId: input.actorUserId,
        permission: PERMISSIONS.ROLE_MANAGE,
        organizationId: assignment.organizationId,
      })
    }
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      // A foreign assignment must not be distinguishable from a missing one.
      throw new AdminRoleAssignmentNotFoundError()
    }
    throw error
  }

  return roleMutationTransaction(
    async (tx) => {
      const current = await tx.roleAssignment.findUnique({
        where: { id: assignment.id },
        include: {
          user: { select: { id: true, isActive: true } },
          role: { select: { key: true } },
        },
      })

      if (!current) {
        throw new AdminRoleAssignmentNotFoundError()
      }

      // Block any role/key substitution between authorization and delete.
      if (
        current.role.key !== assignment.role.key ||
        current.organizationId !== assignment.organizationId ||
        current.userId !== assignment.userId
      ) {
        throw new UnsupportedAdminRoleError()
      }

      if (
        current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
        current.user.isActive
      ) {
        const activePapAdmins = await tx.roleAssignment.count({
          where: {
            organizationId: null,
            role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
            user: { isActive: true },
          },
        })

        if (activePapAdmins <= 1) {
          throw new LastPapAdminError()
        }
      }

      const deleted = await tx.roleAssignment.deleteMany({
        where: { id: current.id },
      })

      if (deleted.count !== 1) {
        throw new AdminRoleAssignmentNotFoundError()
      }

      await tx.auditEvent.create({
        data: {
          actorUserId: input.actorUserId,
          organizationId: current.organizationId,
          action: "ROLE_REVOKED",
          resourceType: "ROLE_ASSIGNMENT",
          resourceId: current.id,
          before: {
            targetUserId: current.userId,
            roleKey: current.role.key,
            organizationId: current.organizationId,
          },
        },
      })

      return { revoked: true, assignmentId: current.id }
    },
  )
}
