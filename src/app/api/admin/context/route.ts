import {
  NextRequest,
  NextResponse,
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
  getEffectiveAccessProfile,
} from "@/server/iam/effective-access-profile.service"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
  }
}

function unauthorized() {
  return NextResponse.json(
    {
      authenticated: false,
    },
    {
      status: 401,
      headers:
        noStoreHeaders(),
    },
  )
}

export async function GET(
  request: NextRequest,
) {
  const token =
    readSessionToken(
      request,
    )

  if (!token) {
    return unauthorized()
  }

  try {
    const session =
      await validateSession(
        token,
      )

    const profile =
      await getEffectiveAccessProfile(
        session.user.id,
      )

    if (!profile) {
      return unauthorized()
    }

    if (
      !profile.canAccessAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "ACCESS_DENIED",
          message:
            "Access to this resource is denied.",
        },
        {
          status: 403,
          headers:
            noStoreHeaders(),
        },
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        profile,
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    )
  } catch (error) {
    if (
      error instanceof
        InvalidSessionError ||
      error instanceof
        ExpiredSessionError ||
      error instanceof
        RevokedSessionError ||
      error instanceof
        InactiveSessionUserError
    ) {
      return unauthorized()
    }

    console.error(
      "admin context failed",
    )

    return NextResponse.json(
      {
        error:
          "INTERNAL_ERROR",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      },
    )
  }
}
