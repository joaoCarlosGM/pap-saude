import { readSessionToken } from "@/server/auth/http-auth"
import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  assertTrustedRequestOrigin,
} from "@/server/auth/http-auth"

import {
  mutateAdminOrganization,
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

type RouteContext = {
  params:
    Promise<{
      organizationId:
        string
    }>
}

export async function PATCH(
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
      organizationId,
    } =
      await context.params

    const body =
      await readAdminJson(
        request,
      )

    const operation =
      body.operation

    if (
      operation ===
        "ACTIVATE" ||
      operation ===
        "SUSPEND" ||
      operation ===
        "ARCHIVE"
    ) {
      const organization =
        await mutateAdminOrganization(
          session.user.id,
          organizationId,
          operation === "ARCHIVE" ? {
            operation,
            confirmationName: typeof body.confirmationName === "string" ? body.confirmationName : undefined,
            password: typeof body.password === "string" ? body.password : undefined,
            code: typeof body.code === "string" ? body.code : undefined,
          } : { operation },
          readSessionToken(request) ?? undefined,
        )

      return NextResponse.json(
        {
          organization,
        },
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        },
      )
    }

    if (
      operation !==
      "UPDATE"
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
      await mutateAdminOrganization(
        session.user.id,
        organizationId,
        {
          operation:
            "UPDATE",

          name:
            typeof body.name === "string"
              ? body.name
              : undefined,

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
