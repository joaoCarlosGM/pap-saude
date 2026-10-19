export type AccessScope =
  | "GLOBAL"
  | "MUNICIPALITY"
  | "HEALTH_UNIT"

export type AdminOrganizationType =
  | "PAP"
  | "MUNICIPALITY"
  | "HEALTH_UNIT"

export type EffectiveAccessOrganization = {
  id: string
  name: string
  type: AdminOrganizationType
  parentId: string | null
}

export type EffectiveAccessRole = {
  key: string
  name: string
  scope: AccessScope
  organization: EffectiveAccessOrganization | null
  permissions: string[]
}

export type EffectiveAccessProfile = {
  user: {
    id: string
    email: string
    displayName: string
  }
  roles: EffectiveAccessRole[]
  permissions: string[]
  organizations: EffectiveAccessOrganization[]
  canAccessAdmin: boolean
}
