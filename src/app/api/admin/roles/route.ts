import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  adminErrorResponse,
  requireAdminSession,
} from "@/server/admin/admin-http"

import {
  getAdminRoleOverview,
} from "@/server/admin/admin-roles.service"

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

    const overview =
      await getAdminRoleOverview(
        session.user.id,
      )

    return NextResponse.json(
      overview,
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
