import {
  MembershipStatus,
  OrganizationStatus,
} from "@prisma/client"

import type {
  EffectiveAccessOrganization,
  EffectiveAccessProfile,
  EffectiveAccessRole,
} from "@/lib/admin/types"

import { db } from "@/server/db/client"

import {
  PERMISSIONS,
  type PermissionKey,
} from "./permissions"

import {
  getSystemRoleDefinition,
} from "./system-role-catalog"

const ADMIN_ENTRY_PERMISSIONS =
  new Set<PermissionKey>([
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.MEMBERSHIP_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.USER_SECURITY_MANAGE,
    PERMISSIONS.MFA_RESET,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.COMMERCIAL_READ,
    PERMISSIONS.ORGANIZATION_ANALYTICS_READ,
    PERMISSIONS.FEEDBACK_READ,
    PERMISSIONS.RNDS_INTEGRATION_READ,
  ])

function isOrganizationAvailable(
  organization: {
    status: OrganizationStatus
    isActive: boolean
  },
): boolean {
  return (
    organization.status ===
      OrganizationStatus.ACTIVE &&
    organization.isActive
  )
}

function compareOrganizations(
  left: EffectiveAccessOrganization,
  right: EffectiveAccessOrganization,
): number {
  return left.name.localeCompare(
    right.name,
    "pt-BR",
  )
}

export async function getEffectiveAccessProfile(
  userId: string,
): Promise<EffectiveAccessProfile | null> {
  const user =
    await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,

        memberships: {
          select: {
            status: true,

            organization: {
              select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
                status: true,
                isActive: true,
              },
            },
          },
        },

        roleAssignments: {
          select: {
            organizationId: true,

            organization: {
              select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
                status: true,
                isActive: true,
              },
            },

            role: {
              select: {
                key: true,
                name: true,
                system: true,

                permissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

  if (!user?.isActive) {
    return null
  }

  const activeMemberships =
    user.memberships.filter(
      (membership) =>
        membership.status ===
          MembershipStatus.ACTIVE &&
        isOrganizationAvailable(
          membership.organization,
        ),
    )

  const activeOrganizationIds =
    new Set(
      activeMemberships.map(
        (membership) =>
          membership.organization.id,
      ),
    )

  const organizations:
    EffectiveAccessOrganization[] =
    activeMemberships
      .map((membership) => ({
        id:
          membership.organization.id,
        name:
          membership.organization.name,
        type:
          membership.organization.type,
        parentId:
          membership.organization.parentId,
      }))
      .sort(compareOrganizations)

  const roles:
    EffectiveAccessRole[] = []

  const effectivePermissions =
    new Set<string>()

  for (
    const assignment
    of user.roleAssignments
  ) {
    const definition =
      getSystemRoleDefinition(
        assignment.role.key,
      )

    /*
     * Unknown/custom roles remain fail-closed,
     * matching authorization.service.ts.
     */
    if (!definition || !assignment.role.system) {
      continue
    }

    let organization:
      EffectiveAccessOrganization | null =
      null

    if (
      definition.scope ===
      "GLOBAL"
    ) {
      /*
       * A global role must not carry an
       * organization scope.
       */
      if (
        assignment.organizationId !==
        null
      ) {
        continue
      }
    } else {
      if (
        !assignment.organizationId ||
        !assignment.organization ||
        (definition.scope === "MUNICIPALITY" &&
          assignment.organization.type !== "MUNICIPALITY") ||
        (definition.scope === "HEALTH_UNIT" &&
          assignment.organization.type !== "HEALTH_UNIT") ||
        !activeOrganizationIds.has(
          assignment.organizationId,
        ) ||
        !isOrganizationAvailable(
          assignment.organization,
        )
      ) {
        continue
      }

      organization = {
        id:
          assignment.organization.id,
        name:
          assignment.organization.name,
        type:
          assignment.organization.type,
        parentId:
          assignment.organization.parentId,
      }
    }

    /*
     * Intersect persisted RolePermission rows
     * with the audited system-role catalogue.
     *
     * This prevents database drift from silently
     * granting permissions outside the role
     * definition used by authorize().
     */
    const persistedPermissionKeys =
      new Set(
        assignment.role.permissions.map(
          (entry) =>
            entry.permission.key,
        ),
      )

    const permissions =
      definition.permissions.filter(
        (permission) =>
          persistedPermissionKeys.has(
            permission,
          ),
      )

    for (
      const permission
      of permissions
    ) {
      effectivePermissions.add(
        permission,
      )
    }

    roles.push({
      key:
        definition.key,
      name:
        definition.name,
      scope:
        definition.scope,
      organization,
      permissions: [
        ...permissions,
      ],
    })
  }

  roles.sort(
    (left, right) => {
      if (
        left.scope !==
        right.scope
      ) {
        return left.scope.localeCompare(
          right.scope,
        )
      }

      const keyComparison =
        left.key.localeCompare(
          right.key,
        )

      if (keyComparison !== 0) {
        return keyComparison
      }

      return (
        left.organization?.name ??
        ""
      ).localeCompare(
        right.organization?.name ??
          "",
        "pt-BR",
      )
    },
  )

  const permissions =
    [...effectivePermissions].sort()

  const canAccessAdmin =
    [...ADMIN_ENTRY_PERMISSIONS].some(
      (permission) =>
        effectivePermissions.has(
          permission,
        ),
    )

  return {
    user: {
      id:
        user.id,
      email:
        user.email,
      displayName:
        user.displayName,
    },

    roles,
    permissions,
    organizations,
    canAccessAdmin,
  }
}
