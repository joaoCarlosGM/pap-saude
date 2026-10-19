import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  OnboardingStatus,
} from "@prisma/client"

import {
  assertTrustedRequestOrigin,
  readSessionToken,
} from "@/server/auth/http-auth"

import {
  InvalidRequestOriginError,
} from "@/server/auth/http-auth.errors"

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors"

import {
  validateSession,
} from "@/server/auth/session.service"

import {
  getOnboardingProgress,
  setOnboardingProgress,
  validateCurrentStep,
  validateTourKey,
  validateTourVersion,
} from "@/server/onboarding/onboarding.service"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

type RouteContext = {
  params:
    Promise<{
      tourKey: string
    }>
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
  }
}

function errorResponse(
  error: unknown,
) {
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
    return NextResponse.json(
      {
        error:
          "UNAUTHENTICATED",
      },
      {
        status: 401,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    InvalidRequestOriginError
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_REQUEST_ORIGIN",
      },
      {
        status: 403,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
      Error &&
    error.message ===
      "INVALID_ONBOARDING"
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_ONBOARDING",
      },
      {
        status: 400,
        headers:
          noStoreHeaders(),
      },
    )
  }

  console.error(
    "onboarding request failed",
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

async function authenticatedUserId(
  request: NextRequest,
) {
  const token =
    readSessionToken(
      request,
    )

  if (!token) {
    throw new InvalidSessionError()
  }

  const session =
    await validateSession(
      token,
    )

  return session.user.id
}

function versionFromRequest(
  request: NextRequest,
) {
  const raw =
    request.nextUrl
      .searchParams
      .get(
        "version",
      )

  const version =
    Number(
      raw,
    )

  return validateTourVersion(
    version,
  )
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const userId =
      await authenticatedUserId(
        request,
      )

    const {
      tourKey,
    } =
      await context.params

    const validatedKey =
      validateTourKey(
        tourKey,
      )

    const version =
      versionFromRequest(
        request,
      )

    const progress =
      await getOnboardingProgress(
        userId,
        validatedKey,
        version,
      )

    return NextResponse.json(
      {
        progress,
      },
      {
        headers:
          noStoreHeaders(),
      },
    )
  } catch (error) {
    return errorResponse(
      error,
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    assertTrustedRequestOrigin(
      request,
    )

    const userId =
      await authenticatedUserId(
        request,
      )

    const {
      tourKey,
    } =
      await context.params

    const validatedKey =
      validateTourKey(
        tourKey,
      )

    const contentType =
      request.headers.get(
        "content-type",
      ) ?? ""

    if (
      !contentType
        .toLowerCase()
        .startsWith(
          "application/json",
        )
    ) {
      throw new Error(
        "INVALID_ONBOARDING",
      )
    }

    const raw =
      await request.text()

    if (
      new TextEncoder()
        .encode(
          raw,
        )
        .byteLength >
      8192
    ) {
      throw new Error(
        "INVALID_ONBOARDING",
      )
    }

    let body:
      unknown

    try {
      body =
        JSON.parse(
          raw,
        )
    } catch {
      throw new Error(
        "INVALID_ONBOARDING",
      )
    }

    if (
      typeof body !==
        "object" ||
      body === null ||
      Array.isArray(
        body,
      )
    ) {
      throw new Error(
        "INVALID_ONBOARDING",
      )
    }

    const record =
      body as Record<
        string,
        unknown
      >

    const version =
      validateTourVersion(
        Number(
          record.version,
        ),
      )

    const currentStep =
      validateCurrentStep(
        Number(
          record.currentStep,
        ),
      )

    if (
      record.status !==
        OnboardingStatus.STARTED &&
      record.status !==
        OnboardingStatus.COMPLETED &&
      record.status !==
        OnboardingStatus.SKIPPED
    ) {
      throw new Error(
        "INVALID_ONBOARDING",
      )
    }

    const progress =
      await setOnboardingProgress({
        userId,
        tourKey:
          validatedKey,
        tourVersion:
          version,
        status:
          record.status,
        currentStep,
      })

    return NextResponse.json(
      {
        progress,
      },
      {
        headers:
          noStoreHeaders(),
      },
    )
  } catch (error) {
    return errorResponse(
      error,
    )
  }
}
