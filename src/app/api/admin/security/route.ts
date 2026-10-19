import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  assertTrustedRequestOrigin,
} from "@/server/auth/http-auth"

import {
  adminErrorResponse,
  readAdminJson,
  requireAdminSession,
} from "@/server/admin/admin-http"

import {
  listAdminSecurityPosture,
  resetAdminUserMfa,
  revokeAdminUserSession,
  revokeAdminUserSessions,
} from "@/server/admin/admin-security.service"

import {
  AdminSecurityPayloadError,
} from "@/server/admin/admin-security.errors"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

export async function GET(
  request: NextRequest,
) {
  try {
    const session =
      await requireAdminSession(
        request,
      )

    const users =
      await listAdminSecurityPosture(
        session.user.id,
        Math.min(100000,Math.max(1,Math.floor(Number(request.nextUrl.searchParams.get("page")??"1")||1))),
      )

    return NextResponse.json(
      {
        users,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    return adminErrorResponse(
      error,
    )
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    assertTrustedRequestOrigin(
      request,
    )

    const session =
      await requireAdminSession(
        request,
      )

    const body =
      await readAdminJson(
        request,
      )

    if (
      typeof body.action !==
        "string" ||
      typeof body.targetUserId !==
        "string"
    ) {
      throw new AdminSecurityPayloadError()
    }

    if (
      body.action ===
      "REVOKE_SESSION"
    ) {
      if (
        typeof body.sessionId !==
        "string"
      ) {
        throw new AdminSecurityPayloadError()
      }

      const result =
        await revokeAdminUserSession({
          actorUserId:
            session.user.id,

          actorSessionId:
            session.session.id,

          targetUserId:
            body.targetUserId,

          targetSessionId:
            body.sessionId,
        })

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    if (
      body.action ===
      "REVOKE_ALL_SESSIONS"
    ) {
      const result =
        await revokeAdminUserSessions({
          actorUserId:
            session.user.id,

          actorSessionId:
            session.session.id,

          targetUserId:
            body.targetUserId,
        })

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    if (
      body.action ===
      "RESET_MFA"
    ) {
      if (
        body.reason !==
          undefined &&
        body.reason !==
          null &&
        typeof body.reason !==
          "string"
      ) {
        throw new AdminSecurityPayloadError()
      }

      const result =
        await resetAdminUserMfa({
          actorUserId:
            session.user.id,

          actorSessionId:
            session.session.id,

          targetUserId:
            body.targetUserId,

          reason:
            body.reason as
              | string
              | null
              | undefined,
        })

      return NextResponse.json(
        result,
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    throw new AdminSecurityPayloadError()
  } catch (error) {
    return adminErrorResponse(
      error,
    )
  }
}
