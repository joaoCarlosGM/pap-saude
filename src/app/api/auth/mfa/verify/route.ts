import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  InvalidLoginPayloadError,
  InvalidRequestOriginError,
  UntrustedClientOriginError,
} from "@/server/auth/http-auth.errors";

import {
  ConsumedMfaChallengeError,
  ExpiredMfaChallengeError,
  InvalidMfaChallengeError,
  InvalidTotpCodeError,
  MfaFactorUnavailableError,
  TotpReplayError,
} from "@/server/auth/mfa.errors";

import {
  assertTrustedRequestOrigin,
  getExpiredMfaChallengeCookieOptions,
  getSessionCookieOptions,
  readMfaChallengeToken,
  readMfaCodePayload,
  resolveTrustedClientOrigin,
} from "@/server/auth/http-auth";

import {
  completeMfaLogin,
} from "@/server/auth/mfa-login.service";

import {
  MFA_CHALLENGE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/server/security/constants";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

function clearChallenge(
  response: NextResponse,
): void {
  response.cookies.set(
    MFA_CHALLENGE_COOKIE_NAME,
    "",
    getExpiredMfaChallengeCookieOptions(),
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    assertTrustedRequestOrigin(
      request,
    );

    /*
     * Force production proxy configuration to be present,
     * matching the primary login endpoint's trust model.
     */
    resolveTrustedClientOrigin(
      request,
    );

    const challengeToken =
      readMfaChallengeToken(
        request,
      );

    if (!challengeToken) {
      return json(
        {
          error:
            "MFA_CHALLENGE_INVALID",
        },
        401,
      );
    }

    const payload =
      await readMfaCodePayload(
        request,
      );

    const result =
      await completeMfaLogin({
        challengeToken,
        code:
          payload.code,
      });

    const response =
      json(
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

    clearChallenge(
      response,
    );

    return response;
  } catch (error) {
    if (
      error instanceof
        InvalidRequestOriginError ||
      error instanceof
        UntrustedClientOriginError
    ) {
      return json(
        {
          error:
            "REQUEST_REJECTED",
        },
        403,
      );
    }

    if (
      error instanceof
      InvalidLoginPayloadError
    ) {
      return json(
        {
          error:
            "INVALID_REQUEST",
        },
        400,
      );
    }

    if (
      error instanceof
        InvalidTotpCodeError ||
      error instanceof
        TotpReplayError
    ) {
      return json(
        {
          error:
            "INVALID_MFA_CODE",
        },
        401,
      );
    }

    if (
      error instanceof
        InvalidMfaChallengeError ||
      error instanceof
        ExpiredMfaChallengeError ||
      error instanceof
        ConsumedMfaChallengeError ||
      error instanceof
        MfaFactorUnavailableError
    ) {
      const response =
        json(
          {
            error:
              "MFA_CHALLENGE_INVALID",
          },
          401,
        );

      clearChallenge(
        response,
      );

      return response;
    }

    return json(
      {
        error:
          "INTERNAL_ERROR",
      },
      500,
    );
  }
}
