import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  assertTrustedRequestOrigin,
} from "@/server/auth/http-auth"

import {
  readAdminJson,
} from "@/server/admin/admin-http"

import { requireBetaSession, betaError } from "@/server/admin-beta/http"
import { betaRateLimit } from "@/server/admin-beta/policy"

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
      await requireBetaSession(
        request,
      )

    await betaRateLimit("invites",session.user.id,30)

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
    return betaError(
      error,
    )
  }
}
