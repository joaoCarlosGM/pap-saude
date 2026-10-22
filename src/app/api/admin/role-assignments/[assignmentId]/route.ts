import { readSessionToken } from "@/server/auth/http-auth"
import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  assertTrustedRequestOrigin,
} from "@/server/auth/http-auth"

import {
  adminErrorResponse,
  requireAdminSession,
} from "@/server/admin/admin-http"

import {
  revokeAdminRoleAssignment,
} from "@/server/admin/admin-roles.service"

export const runtime =
  "nodejs"

export const dynamic =
  "force-dynamic"

type RouteContext = {
  params:
    Promise<{
      assignmentId: string
    }>
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    assertTrustedRequestOrigin(
      request,
    )

    const session =
      await requireAdminSession(
        request,
      )

    const {
      assignmentId,
    } =
      await context.params

    const result =
      await revokeAdminRoleAssignment({
        actorUserId:
          session.user.id,
        actorSessionToken: readSessionToken(request) ?? undefined,

        assignmentId,
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
  } catch (error) {
    return adminErrorResponse(
      error,
    )
  }
}
