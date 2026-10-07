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
  createProfessionalInvitation,
} from "@/server/invitations/invitation.service"

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
      typeof body.email !==
        "string" ||
      typeof body.displayName !==
        "string" ||
      typeof body.organizationId !==
        "string"
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }

    const result =
      await createProfessionalInvitation({
        invitedByUserId:
          session.user.id,

        email:
          body.email,

        displayName:
          body.displayName,

        organizationId:
          body.organizationId,
      })

    return NextResponse.json(
      result,
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
