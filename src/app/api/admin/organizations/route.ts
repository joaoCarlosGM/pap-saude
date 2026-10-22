import { readSessionToken } from "@/server/auth/http-auth"
import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  OrganizationType,
} from "@prisma/client"

import {
  assertTrustedRequestOrigin,
} from "@/server/auth/http-auth"

import {
  createAdminOrganization,
  listAdminOrganizations,
} from "@/server/admin/admin-organizations.service"

import {
  adminErrorResponse,
  readAdminJson,
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

    const organizations =
      await listAdminOrganizations(
        session.user.id,
      )

    return NextResponse.json(
      {
        organizations,
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
      body.type !==
        OrganizationType.MUNICIPALITY &&
      body.type !==
        OrganizationType.HEALTH_UNIT
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }

    if (
      typeof body.name !==
        "string" ||
      typeof body.parentId !==
        "string"
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }

    const optionalString = (
      key: string,
    ) => {
      const value =
        body[key]

      if (
        value ===
        undefined ||
        value === null
      ) {
        return value
      }

      if (
        typeof value !==
        "string"
      ) {
        throw new Error(
          "INVALID_ADMIN_PAYLOAD",
        )
      }

      return value
    }

    const organization =
      await createAdminOrganization(
        session.user.id,
        {
          type:
            body.type,

          name:
            body.name,

          parentId:
            body.parentId,

          code:
            optionalString(
              "code",
            ),

          cnes:
            optionalString(
              "cnes",
            ),

          cnpj:
            optionalString(
              "cnpj",
            ),

          city:
            optionalString(
              "city",
            ),

          state:
            optionalString(
              "state",
            ),

          address:
            optionalString(
              "address",
            ),
        },
        readSessionToken(request) ?? undefined,
      )

    return NextResponse.json(
      {
        organization,
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
