import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors";

import {
  getExpiredSessionCookieOptions,
  readSessionToken,
} from "@/server/auth/http-auth";

import {
  validateSession,
} from "@/server/auth/session.service";

import {
  SESSION_COOKIE_NAME,
} from "@/server/security/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(
  clearCookie: boolean,
): NextResponse {
  const response =
    NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );

  if (clearCookie) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
  }

  return response;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const token =
    readSessionToken(request);

  if (!token) {
    return unauthorized(false);
  }

  try {
    const result =
      await validateSession(token);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName:
            result.user.displayName,
        },
        session: {
          expiresAt:
            result.session.expiresAt,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
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
      return unauthorized(true);
    }

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  }
}
