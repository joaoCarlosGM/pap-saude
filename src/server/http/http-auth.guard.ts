import type {
  NextRequest,
} from "next/server"

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors"

import {
  readSessionToken,
} from "@/server/auth/http-auth"

import {
  validateSession,
} from "@/server/auth/session.service"

import {
  requirePermission,
} from "@/server/iam/authorization.service"

import {
  AccessDeniedError,
} from "@/server/iam/authorization.errors"

import type {
  PermissionKey,
} from "@/server/iam/permissions"

import {
  HttpAccessDeniedError,
  HttpAuthenticationRequiredError,
  InvalidHttpOrganizationContextError,
} from "./http-auth.errors"

import type {
  AuthenticatedHttpSession,
  AuthorizedHttpContext,
  RequireHttpPermissionInput,
} from "./http-auth.types"

function isSessionAuthenticationError(
  error: unknown,
) {
  return (
    error instanceof
      InvalidSessionError ||
    error instanceof
      ExpiredSessionError ||
    error instanceof
      RevokedSessionError ||
    error instanceof
      InactiveSessionUserError
  )
}

export async function requireHttpSession(
  request: NextRequest,
): Promise<AuthenticatedHttpSession> {
  const token =
    readSessionToken(
      request,
    )

  if (!token) {
    throw new HttpAuthenticationRequiredError()
  }

  try {
    const result =
      await validateSession(
        token,
      )

    return {
      user: {
        id:
          result.user.id,

        email:
          result.user.email,

        displayName:
          result.user.displayName,
      },

      session: {
        id:
          result.session.id,

        expiresAt:
          result.session.expiresAt,
      },
    }
  } catch (error) {
    if (
      isSessionAuthenticationError(
        error,
      )
    ) {
      throw new HttpAuthenticationRequiredError()
    }

    throw error
  }
}

export async function requireHttpPermission(
  input: RequireHttpPermissionInput,
): Promise<AuthorizedHttpContext> {
  const auth =
    await requireHttpSession(
      input.request,
    )

  const organizationId =
    input.organizationId?.trim() ||
    null

  if (
    input.requireOrganization &&
    !organizationId
  ) {
    throw new InvalidHttpOrganizationContextError()
  }

  try {
    await requirePermission({
      userId:
        auth.user.id,

      permission:
        input.permission,

      organizationId:
        organizationId ??
        undefined,
    })
  } catch (error) {
    if (
      error instanceof
      AccessDeniedError
    ) {
      throw new HttpAccessDeniedError()
    }

    throw error
  }

  return {
    auth,
    organizationId,
  }
}

export async function requireHttpGlobalPermission(
  request: NextRequest,
  permission: PermissionKey,
) {
  return requireHttpPermission({
    request,
    permission,
  })
}

export async function requireHttpOrganizationPermission(
  request: NextRequest,
  permission: PermissionKey,
  organizationId:
    | string
    | null
    | undefined,
) {
  return requireHttpPermission({
    request,
    permission,
    organizationId,
    requireOrganization:
      true,
  })
}
