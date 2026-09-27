import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  InactiveUserError,
  InvalidCredentialsError,
  LoginThrottledError,
  PasswordChangeRequiredError,
} from "@/server/auth/auth.errors";

import {
  InvalidLoginPayloadError,
  InvalidRequestOriginError,
  UntrustedClientOriginError,
} from "@/server/auth/http-auth.errors";

import {
  assertTrustedRequestOrigin,
  getMfaChallengeCookieOptions,
  getRequestUserAgent,
  getSessionCookieOptions,
  readLoginPayload,
  resolveTrustedClientOrigin,
} from "@/server/auth/http-auth";

import {
  authenticateLogin,
} from "@/server/auth/login.service";

import {
  MFA_CHALLENGE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/server/security/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  body: unknown,
  status: number,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    assertTrustedRequestOrigin(request);

    const payload =
      await readLoginPayload(request);

    const origin =
      resolveTrustedClientOrigin(request);

    const result =
      await authenticateLogin({
        email: payload.email,
        password: payload.password,
        origin,
        userAgent:
          getRequestUserAgent(request),
      });

    if (
      result.status ===
      "MFA_REQUIRED"
    ) {
      const response = json(
        {
          authenticated: false,
          mfaRequired: true,
          challengeExpiresAt:
            result.challengeExpiresAt,
        },
        200,
      );

      response.cookies.set(
        MFA_CHALLENGE_COOKIE_NAME,
        result.challengeToken,
        getMfaChallengeCookieOptions(),
      );

      return response;
    }

    const response = json(
      {
        authenticated: true,
        mfaRequired: false,
        user: {
          id:
            result.user.id,
          email:
            result.user.email,
          displayName:
            result.user.displayName,
        },
      },
      200,
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.sessionToken,
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (
      error instanceof
      InvalidLoginPayloadError
    ) {
      return json(
        {
          error: "INVALID_REQUEST",
        },
        400,
      );
    }

    if (
      error instanceof
        InvalidRequestOriginError ||
      error instanceof
        UntrustedClientOriginError
    ) {
      return json(
        {
          error: "REQUEST_REJECTED",
        },
        403,
      );
    }

    if (
      error instanceof
      InvalidCredentialsError
    ) {
      return json(
        {
          error: "INVALID_CREDENTIALS",
        },
        401,
      );
    }

    if (
      error instanceof
      LoginThrottledError
    ) {
      const response = json(
        {
          error:
            "AUTHENTICATION_TEMPORARILY_UNAVAILABLE",
        },
        429,
      );

      response.headers.set(
        "Retry-After",
        "60",
      );

      return response;
    }

    if (
      error instanceof
      PasswordChangeRequiredError
    ) {
      return json(
        {
          error:
            "PASSWORD_CHANGE_REQUIRED",
        },
        403,
      );
    }

    if (
      error instanceof
      InactiveUserError
    ) {
      return json(
        {
          error:
            "AUTHENTICATION_UNAVAILABLE",
        },
        403,
      );
    }

    return json(
      {
        error: "INTERNAL_ERROR",
      },
      500,
    );
  }
}
