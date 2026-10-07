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

import {
  getEffectiveAccessProfile,
} from "@/server/iam/effective-access-profile.service"

import {
  listAccessibleOrganizationIds,
} from "./admin-access.service"

import {
  AdminRoleAssignmentNotFoundError,
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

  const targetUser =
    await db.user.findUnique({
      where: {
        id:
          input.targetUserId,
      },

      select: {
        id: true,
        isActive: true,
      },
    })

  if (
    !targetUser?.isActive
  ) {
    throw new UnsupportedAdminRoleError()
  }

  if (
    definition.scope !==
    "GLOBAL"
  ) {
    const membership =
      await db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId:
              input.targetUserId,

            organizationId:
              input.organizationId!,
          },
        },

        select: {
          status:
            true,
        },
      })

    if (
      membership?.status !==
      MembershipStatus.ACTIVE
    ) {
      throw new UnsupportedAdminRoleError()
    }
  }

  return assignSystemRole({
    userId:
      input.targetUserId,

    roleKey:
      input.roleKey,

    organizationId:
      input.organizationId,
  })
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
  } else {
    if (
      !assignment.organizationId
    ) {
      throw new UnsupportedAdminRoleError()
    }

    await requirePermission({
      userId:
        input.actorUserId,

      permission:
        PERMISSIONS.ROLE_MANAGE,

      organizationId:
        assignment.organizationId,
    })
  }

  if (
    assignment.role.key !==
    SYSTEM_ROLE_KEYS.PAP_ADMIN
  ) {
    const result =
      await db.roleAssignment.deleteMany({
        where: {
          id:
            assignment.id,
        },
      })

    if (
      result.count !==
      1
    ) {
      throw new AdminRoleAssignmentNotFoundError()
    }

    return {
      revoked:
        true,
      assignmentId:
        assignment.id,
    }
  }

  return db.$transaction(
    async (
      tx,
    ) => {
      const current =
        await tx.roleAssignment.findUnique({
          where: {
            id:
              assignment.id,
          },

          include: {
            user: {
              select: {
                isActive:
                  true,
              },
            },

            role: {
              select: {
                key: true,
              },
            },
          },
        })

      if (
        !current
      ) {
        throw new AdminRoleAssignmentNotFoundError()
      }

      if (
        current.role.key !==
        SYSTEM_ROLE_KEYS.PAP_ADMIN
      ) {
        throw new UnsupportedAdminRoleError()
      }

      if (
        current.user.isActive
      ) {
        const activePapAdmins =
          await tx.roleAssignment.count({
            where: {
              organizationId:
                null,

              role: {
                key:
                  SYSTEM_ROLE_KEYS.PAP_ADMIN,
              },

              user: {
                isActive:
                  true,
              },
            },
          })

        if (
          activePapAdmins <=
          1
        ) {
          throw new LastPapAdminError()
        }
      }

      const deleted =
        await tx.roleAssignment.deleteMany({
          where: {
            id:
              current.id,
          },
        })

      if (
        deleted.count !==
        1
      ) {
        throw new AdminRoleAssignmentNotFoundError()
      }

      return {
        revoked:
          true,
        assignmentId:
          current.id,
      }
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    },
  )
}
