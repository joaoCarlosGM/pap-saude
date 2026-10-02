import type {
  NextRequest,
} from "next/server"

import type {
  PermissionKey,
} from "@/server/iam/permissions"

export type AuthenticatedHttpSession = {
  user: {
    id: string
    email: string
    displayName: string
  }

  session: {
    id: string
    expiresAt: Date
  }
}

export type RequireHttpPermissionInput = {
  request: NextRequest
  permission: PermissionKey
  organizationId?: string | null
  requireOrganization?: boolean
}

export type AuthorizedHttpContext = {
  auth: AuthenticatedHttpSession
  organizationId: string | null
}
