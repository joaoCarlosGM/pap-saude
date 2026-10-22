import type { Prisma } from "@prisma/client"
import type { EffectiveAccessProfile } from "@/lib/admin/types"
import type {
  PermissionKey,
} from "@/server/iam/permissions"

import {
  AccessDeniedError,
} from "@/server/iam/authorization.errors"

import {
  getEffectiveAccessProfile,
} from "@/server/iam/effective-access-profile.service"

import {
  db,
} from "@/server/db/client"

import {
  roleAllowsOrganization,
} from "./admin-access-policy"

export async function requireAdminOrganizationAccess(
  userId: string,
  permission: PermissionKey,
  organizationId: string,
  client: Prisma.TransactionClient = db,
) {
  const [
    profile,
    organization,
  ] =
    await Promise.all([
      getEffectiveAccessProfile(
        userId, client,
      ),

      client.organization.findUnique({
        where: {
          id:
            organizationId,
        },

        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          parentId: true,
          isActive: true,
        },
      }),
    ])

  if (
    !profile ||
    !organization
  ) {
    throw new AccessDeniedError()
  }

  const allowed =
    profile.roles.some(
      (role) =>
        roleAllowsOrganization(
          {
            scope:
              role.scope,

            organizationId:
              role.organization
                ?.id ??
              null,

            permissions:
              role.permissions,
          },
          permission,
          {
            id:
              organization.id,

            type:
              organization.type,

            parentId:
              organization.parentId,
          },
        ),
    )

  if (!allowed) {
    throw new AccessDeniedError()
  }

  return {
    profile,
    organization,
  }
}

export async function hasGlobalAdminPermission(
  userId: string,
  permission: PermissionKey,
) {
  const profile =
    await getEffectiveAccessProfile(
      userId,
    )

  if (!profile) {
    return false
  }

  return profile.roles.some(
    (role) =>
      role.scope ===
        "GLOBAL" &&
      role.permissions.includes(
        permission,
      ),
  )
}

export async function listAccessibleOrganizationIds(
  userId: string,
  permission: PermissionKey,
  effectiveProfile?: EffectiveAccessProfile,
): Promise<{
  global: boolean
  organizationIds: string[]
}> {
  const profile = effectiveProfile ??
    await getEffectiveAccessProfile(
      userId,
    )

  if (!profile || profile.user.id !== userId) {
    throw new AccessDeniedError()
  }

  const relevantRoles =
    profile.roles.filter(
      (role) =>
        role.permissions.includes(
          permission,
        ),
    )

  if (
    relevantRoles.some(
      (role) =>
        role.scope ===
        "GLOBAL",
    )
  ) {
    return {
      global: true,
      organizationIds: [],
    }
  }

  const directIds =
    new Set<string>()

  const municipalityIds =
    new Set<string>()

  for (
    const role
    of relevantRoles
  ) {
    const organizationId =
      role.organization?.id

    if (!organizationId) {
      continue
    }

    directIds.add(
      organizationId,
    )

    if (
      role.scope ===
      "MUNICIPALITY"
    ) {
      municipalityIds.add(
        organizationId,
      )
    }
  }

  if (
    municipalityIds.size >
    0
  ) {
    const children =
      await db.organization.findMany({
        where: {
          parentId: {
            in: [
              ...municipalityIds,
            ],
          },
        },

        select: {
          id: true,
        },
      })

    for (
      const child
      of children
    ) {
      directIds.add(
        child.id,
      )
    }
  }

  return {
    global: false,
    organizationIds: [
      ...directIds,
    ],
  }
}
