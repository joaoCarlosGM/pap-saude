import { db } from "@/server/db/client"

import {
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "./permissions"

import {
  SYSTEM_ROLES,
} from "./system-role-catalog"

function permissionDescription(
  key: PermissionKey,
) {
  return `System permission: ${key}`
}

export async function bootstrapSystemIam() {
  return db.$transaction(async (tx) => {
    for (const key of ALL_PERMISSION_KEYS) {
      await tx.permission.upsert({
        where: { key },
        create: {
          key,
          description: permissionDescription(key),
        },
        update: {
          description: permissionDescription(key),
        },
      })
    }

    for (const definition of SYSTEM_ROLES) {
      const role = await tx.role.upsert({
        where: {
          key: definition.key,
        },
        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          system: true,
        },
        update: {
          name: definition.name,
          description: definition.description,
          system: true,
        },
      })

      const desiredPermissions =
        await tx.permission.findMany({
          where: {
            key: {
              in: [...definition.permissions],
            },
          },
          select: {
            id: true,
            key: true,
          },
        })

      if (
        desiredPermissions.length !==
        definition.permissions.length
      ) {
        throw new Error(
          `IAM bootstrap failed for role ${definition.key}: permission catalog mismatch`,
        )
      }

      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: {
            notIn: desiredPermissions.map(
              (permission) => permission.id,
            ),
          },
        },
      })

      await tx.rolePermission.createMany({
        data: desiredPermissions.map(
          (permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          }),
        ),
        skipDuplicates: true,
      })
    }

    return {
      permissions: ALL_PERMISSION_KEYS.length,
      roles: SYSTEM_ROLES.length,
    }
  })
}
