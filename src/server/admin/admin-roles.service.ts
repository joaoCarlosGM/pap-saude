import { requireAdminActor } from "./admin-session.service"
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
    profile?.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL) &&
    !profile.permissions.includes(PERMISSIONS.ROLE_READ)
  ) {
    const eligible = {
      isActive: true,
      id: { not: actorUserId },
      roleAssignments: {
        every: {
          role: { key: "COMMERCIAL", system: true },
          organizationId: null,
        },
      },
    };
    const [assignableUsers, assignments] = await Promise.all([
      db.user.findMany({
        where: eligible,
        select: { id: true, email: true, displayName: true, isActive: true },
        orderBy: { displayName: "asc" },
        take: 200,
      }),
      db.roleAssignment.findMany({
        where: {
          organizationId: null,
          role: { key: "COMMERCIAL", system: true },
          user: eligible,
        },
        select: {
          id: true,
          organizationId: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              isActive: true,
            },
          },
          role: { select: { key: true, name: true } },
          organization: { select: { id: true, name: true, type: true } },
        },
      }),
    ]);
    return {
      delegated: true,
      roles: SYSTEM_ROLES.filter((r) => r.key === "COMMERCIAL"),
      assignments,
      assignableUsers,
      canManage: true,
    };
  }
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
      throw new AccessDeniedError()
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

/** Called inside the mutation transaction: revocation cannot leave a stale authority snapshot. */
async function requireRoleMutation(
  actorUserId: string,
  token: string | undefined,
  targetUserId: string,
  roleKey: string,
  organizationId: string | null | undefined,
  tx: Prisma.TransactionClient,
) {
  await requireAdminActor(actorUserId, token, tx);
  const profile = await getEffectiveAccessProfile(actorUserId, tx);
  const full = profile?.roles.some(
    (r) =>
      r.key === "PAP_ADMIN" &&
      r.scope === "GLOBAL" &&
      r.permissions.includes(PERMISSIONS.ROLE_MANAGE),
  );
  if (full) {
    await requirePermission(
      {
        userId: actorUserId,
        permission: PERMISSIONS.ROLE_MANAGE,
        organizationId,
      },
      tx,
    );
    return;
  }
  if (
    roleKey !== "COMMERCIAL" ||
    organizationId != null ||
    targetUserId === actorUserId ||
    !profile?.roles.some(
      (r) =>
        r.key === "PAP_MANAGER" &&
        r.scope === "GLOBAL" &&
        r.permissions.includes(PERMISSIONS.ROLE_ASSIGN_COMMERCIAL),
    )
  )
    throw new AccessDeniedError();
  // A commercial delegate may never alter an existing privileged account.
  const privileged = await tx.roleAssignment.count({
    where: {
      userId: targetUserId,
      OR: [
        { organizationId: { not: null } },
        { role: { key: { not: "COMMERCIAL" } } },
        { role: { system: false } },
      ],
    },
  });
  if (privileged) throw new AccessDeniedError();
}

export async function createAdminRoleAssignment(input: {
  actorUserId: string;
  actorSessionToken?: string;
  targetUserId: string;
  roleKey: string;
  organizationId?: string | null;
}) {
  if (!isSystemRoleKey(input.roleKey)) throw new UnsupportedAdminRoleError();
  const definition = getSystemRoleDefinition(input.roleKey)!;
  if (
    (definition.scope === "GLOBAL" && input.organizationId != null) ||
    (definition.scope !== "GLOBAL" && !input.organizationId)
  )
    throw new UnsupportedAdminRoleError();
  return roleMutationTransaction(async (tx) => {
    await requireRoleMutation(
      input.actorUserId,
      input.actorSessionToken,
      input.targetUserId,
      input.roleKey,
      input.organizationId,
      tx,
    );
    const target = await tx.user.findUnique({
      where: { id: input.targetUserId },
      select: { isActive: true },
    });
    if (!target?.isActive) throw new UnsupportedAdminRoleError();
    if (definition.scope !== "GLOBAL") {
      const member = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.targetUserId,
            organizationId: input.organizationId!,
          },
        },
      });
      if (member?.status !== MembershipStatus.ACTIVE)
        throw new UnsupportedAdminRoleError();
    }
    const role = await tx.role.findUnique({ where: { key: input.roleKey } });
    if (!role) throw new UnsupportedAdminRoleError();
    const existing = await tx.roleAssignment.findFirst({
      where: {
        userId: input.targetUserId,
        roleId: role.id,
        organizationId: input.organizationId ?? null,
      },
    });
    const assignment = await assignSystemRole(
      {
        userId: input.targetUserId,
        roleKey: input.roleKey as SystemRoleKey,
        organizationId: input.organizationId,
      },
      tx,
    );
    if (!existing)
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
      });
    return assignment;
  });
}

export async function revokeAdminRoleAssignment(input: {
  actorUserId: string;
  actorSessionToken?: string;
  assignmentId: string;
}) {
  return roleMutationTransaction(async (tx) => {
    const current = await tx.roleAssignment.findUnique({
      where: { id: input.assignmentId },
      include: { role: true, user: true },
    });
    if (!current) throw new AdminRoleAssignmentNotFoundError();
    if (!getSystemRoleDefinition(current.role.key))
      throw new UnsupportedAdminRoleError();
    try {
      await requireRoleMutation(
        input.actorUserId,
        input.actorSessionToken,
        current.userId,
        current.role.key,
        current.organizationId,
        tx,
      );
    } catch (error) {
      if (error instanceof AccessDeniedError)
        throw new AdminRoleAssignmentNotFoundError();
      throw error;
    }
    if (
      current.role.key === SYSTEM_ROLE_KEYS.PAP_ADMIN &&
      current.user.isActive
    ) {
      const count = await tx.roleAssignment.count({
        where: {
          organizationId: null,
          role: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN },
          user: { isActive: true },
        },
      });
      if (count <= 1) throw new LastPapAdminError();
    }
    const deleted = await tx.roleAssignment.deleteMany({
      where: { id: current.id },
    });
    if (deleted.count !== 1) throw new AdminRoleAssignmentNotFoundError();
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
    });
    return { revoked: true, assignmentId: current.id };
  });
}
