import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  listAdminUsers,
} from "@/server/admin/admin-users.service"

import {
  adminErrorResponse,
  requireAdminSession,
} from "@/server/admin/admin-http"

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
      await listAdminUsers(
        session.user.id,
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
