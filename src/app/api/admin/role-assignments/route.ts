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
  createAdminRoleAssignment,
} from "@/server/admin/admin-roles.service"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

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
      typeof body.userId !==
        "string" ||
      typeof body.roleKey !==
        "string"
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }

    if (
      body.organizationId !==
        undefined &&
      body.organizationId !==
        null &&
      typeof body.organizationId !==
        "string"
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }

    const assignment =
      await createAdminRoleAssignment({
        actorUserId:
          session.user.id,

        targetUserId:
          body.userId,

        roleKey:
          body.roleKey,

        organizationId:
          body.organizationId as
            | string
            | null
            | undefined,
      })

    return NextResponse.json(
      {
        assignment,
      },
      {
        status: 201,

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
