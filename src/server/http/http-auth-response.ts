import {
  NextResponse,
} from "next/server"

import {
  HttpAccessDeniedError,
  HttpAuthenticationRequiredError,
  InvalidHttpOrganizationContextError,
} from "./http-auth.errors"

export function jsonNoStore(
  body: unknown,
  status: number,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  )
}

export function httpAuthErrorResponse(
  error: unknown,
): NextResponse | null {
  if (
    error instanceof
    HttpAuthenticationRequiredError
  ) {
    return jsonNoStore(
      {
        error:
          "AUTHENTICATION_REQUIRED",
      },
      401,
    )
  }

  if (
    error instanceof
    InvalidHttpOrganizationContextError
  ) {
    return jsonNoStore(
      {
        error:
          "INVALID_ORGANIZATION_CONTEXT",
      },
      400,
    )
  }

  if (
    error instanceof
    HttpAccessDeniedError
  ) {
    return jsonNoStore(
      {
        error:
          "ACCESS_DENIED",
      },
      403,
    )
  }

  return null
}
