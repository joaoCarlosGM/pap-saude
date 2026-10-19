import type {
  PermissionKey,
} from "@/server/iam/permissions"

export type AdminScope =
  | "GLOBAL"
  | "MUNICIPALITY"
  | "HEALTH_UNIT"

export type AdminTargetOrganization = {
  id: string
  type:
    | "PAP"
    | "MUNICIPALITY"
    | "HEALTH_UNIT"
  parentId: string | null
}

export type AdminRoleScope = {
  scope: AdminScope
  organizationId: string | null
  permissions: readonly string[]
}

export function roleAllowsOrganization(
  role: AdminRoleScope,
  permission: PermissionKey,
  target: AdminTargetOrganization,
): boolean {
  if (
    !role.permissions.includes(
      permission,
    )
  ) {
    return false
  }

  if (
    role.scope ===
    "GLOBAL"
  ) {
    return true
  }

  if (
    !role.organizationId
  ) {
    return false
  }

  if (
    role.scope ===
    "HEALTH_UNIT"
  ) {
    return (
      target.type ===
        "HEALTH_UNIT" &&
      target.id ===
        role.organizationId
    )
  }

  if (
    role.scope ===
    "MUNICIPALITY"
  ) {
    if (
      target.type ===
      "MUNICIPALITY"
    ) {
      return (
        target.id ===
        role.organizationId
      )
    }

    if (
      target.type ===
      "HEALTH_UNIT"
    ) {
      return (
        target.parentId ===
        role.organizationId
      )
    }
  }

  return false
}
