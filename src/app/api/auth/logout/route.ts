import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  SessionRevocationReason,
} from "@prisma/client";

import {
  InvalidRequestOriginError,
} from "@/server/auth/http-auth.errors";

import {
  assertTrustedRequestOrigin,
  getExpiredSessionCookieOptions,
  readSessionToken,
} from "@/server/auth/http-auth";

import {
  revokeSessionByToken,
} from "@/server/auth/session.service";

import {
  SESSION_COOKIE_NAME,
} from "@/server/security/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    assertTrustedRequestOrigin(request);
  } catch (error) {
    if (
      error instanceof
      InvalidRequestOriginError
    ) {
      return NextResponse.json(
        {
          error: "REQUEST_REJECTED",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      );
    }

    throw error;
  }

  const token =
    readSessionToken(request);

  if (token) {
    await revokeSessionByToken(
      token,
      SessionRevocationReason.LOGOUT,
    );
  }

  const response =
    new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getExpiredSessionCookieOptions(),
  );

  return response;
}
