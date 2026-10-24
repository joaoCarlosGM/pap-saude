import { betaRateLimit, BetaRateLimitError } from "@/server/admin-beta/policy";
import { resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import { NextRequest, NextResponse } from "next/server";

import { assertTrustedRequestOrigin } from "@/server/auth/http-auth";

import { InvalidRequestOriginError } from "@/server/auth/http-auth.errors";

import {
  InvitationError,
  InvitationPayloadError,
} from "@/server/invitations/invitation.errors";

import {
  acceptInvitation,
  inspectInvitation,
} from "@/server/invitations/invitation.service";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof BetaRateLimitError)
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
      },
    );

  if (error instanceof InvalidRequestOriginError) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST_ORIGIN",
      },
      {
        status: 403,

        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  if (error instanceof InvitationError) {
    return NextResponse.json(
      {
        error: error.code,
      },
      {
        status: error.status,

        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  console.error("invitation request failed");

  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
    },
    {
      status: 500,

      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  try {
    await betaRateLimit(
      "invitation-inspect",
      resolveTrustedClientOrigin(request),
      100,
    );
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      throw new InvitationPayloadError();
    }

    const invitation = await inspectInvitation(token);

    return NextResponse.json(
      {
        invitation,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);

    await betaRateLimit(
      "invitation-accept",
      resolveTrustedClientOrigin(request),
      50,
    );
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("application/json")) {
      throw new InvitationPayloadError();
    }

    let body: Record<string, unknown>;
    try {
      body = await readAdminJson(request);
    } catch {
      throw new InvitationPayloadError();
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new InvitationPayloadError();
    }

    const record = body as Record<string, unknown>;

    if (typeof record.token !== "string") {
      throw new InvitationPayloadError();
    }

    if (record.operation === "INSPECT") {
      const invitation = await inspectInvitation(record.token);
      return NextResponse.json({ invitation }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    }
    if (record.operation !== undefined) throw new InvitationPayloadError();

    if (record.password !== undefined && typeof record.password !== "string") {
      throw new InvitationPayloadError();
    }

    const result = await acceptInvitation({
      token: record.token,

      password: record.password as string | undefined,
    });

    return NextResponse.json(
      {
        accepted: true,

        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
