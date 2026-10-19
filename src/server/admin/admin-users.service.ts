import {
  db,
} from "@/server/db/client"

import {
  PERMISSIONS,
} from "@/server/iam/permissions"

import {
  listAccessibleOrganizationIds,
} from "./admin-access.service"

export async function listAdminUsers(
  userId: string,
) {
  const access =
    await listAccessibleOrganizationIds(
      userId,
      PERMISSIONS.USER_READ,
    )

  if (
    !access.global &&
    access.organizationIds.length ===
      0
  ) {
    return []
  }

  const users =
    await db.user.findMany({
      where:
        access.global
          ? undefined
          : {
              memberships: {
                some: {
                  organizationId:
                    {
                      in:
                        access.organizationIds,
                    },
                },
              },
            },

      select: {
        id: true,
        email: true,
        displayName:
          true,
        isActive:
          true,
        createdAt:
          true,

        memberships: {
          select: {
            id: true,
            status: true,

            organization: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },

        roleAssignments: {
          select: {
            id: true,

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
        },
      },

      orderBy: {
        displayName:
          "asc",
      },

      take:
        250,
    })

  if (access.global) {
    return users
  }

  const allowedIds =
    new Set(
      access.organizationIds,
    )

  return users.map(
    (user) => ({
      ...user,

      memberships:
        user.memberships.filter(
          (membership) =>
            allowedIds.has(
              membership
                .organization.id,
            ),
        ),

      roleAssignments:
        user.roleAssignments.filter(
          (assignment) =>
            assignment.organization &&
            allowedIds.has(
              assignment
                .organization.id,
            ),
        ),
    }),
  )
}
