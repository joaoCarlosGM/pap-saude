import { AccountSecurityError } from "@/server/auth/account-security.service"
import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  Prisma,
} from "@prisma/client"

import {
  readSessionToken,
} from "@/server/auth/http-auth"

import {
  validateSession,
} from "@/server/auth/session.service"

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "@/server/auth/session.errors"

import {
  AccessDeniedError,
} from "@/server/iam/authorization.errors"

import {
  InvalidRequestOriginError,
} from "@/server/auth/http-auth.errors"

import {
  InvitationError,
} from "@/server/invitations/invitation.errors"

import {
  AdminRoleError,
} from "@/server/admin/admin-role.errors"

import {
  AdminSecurityError,
} from "@/server/admin/admin-security.errors"

import {
  RoleAssignmentError,
} from "@/server/iam/role-assignment.errors"

import {
  InvalidOrganizationHierarchyError,
  InvalidOrganizationIdentifierError,
  OrganizationAlreadyArchivedError,
} from "@/server/organizations/organization.errors"

import {
  requireAdminActor,
  AdminMfaRequiredError,
} from "./admin-session.service";
export { AdminMfaRequiredError } from "./admin-session.service";
const MAX_ADMIN_BODY_BYTES = 32 * 1024;
export async function requireAdminSession(request: NextRequest) {
  const token = readSessionToken(request);
  if (!token) throw new InvalidSessionError();
  const { user } = await validateSession(token);
  return requireAdminActor(user.id, token);
}

export async function readAdminJson(
  request: Request,
): Promise<
  Record<string, unknown>
> {
  const contentType =
    request.headers.get(
      "content-type",
    ) ?? ""

  if (
    !contentType
      .toLowerCase()
      .startsWith(
        "application/json",
      )
  ) {
    throw new Error(
      "INVALID_ADMIN_PAYLOAD",
    )
  }

  const contentLength =
    request.headers.get(
      "content-length",
    )

  if (contentLength) {
    const numeric =
      Number(
        contentLength,
      )

    if (
      !Number.isFinite(
        numeric,
      ) ||
      numeric < 0 ||
      numeric >
        MAX_ADMIN_BODY_BYTES
    ) {
      throw new Error(
        "INVALID_ADMIN_PAYLOAD",
      )
    }
  }

  const text =
    await request.text()

  if (
    new TextEncoder()
      .encode(text)
      .byteLength >
    MAX_ADMIN_BODY_BYTES
  ) {
    throw new Error(
      "INVALID_ADMIN_PAYLOAD",
    )
  }

  let body:
    unknown

  try {
    body =
      JSON.parse(
        text,
      )
  } catch {
    throw new Error(
      "INVALID_ADMIN_PAYLOAD",
    )
  }

  if (
    typeof body !==
      "object" ||
    body === null ||
    Array.isArray(
      body,
    )
  ) {
    throw new Error(
      "INVALID_ADMIN_PAYLOAD",
    )
  }

  return body as Record<
    string,
    unknown
  >
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
  }
}

export function adminErrorResponse(
  error: unknown,
) {
  if (error instanceof AccountSecurityError) {
    return NextResponse.json({ error: error.message }, { status: error.message === "REAUTH_THROTTLED" ? 429 : 403, headers: noStoreHeaders() })
  }
  if (error instanceof AdminMfaRequiredError) {
    return NextResponse.json({ error: "ADMIN_MFA_REQUIRED" }, {
      status: 403, headers: noStoreHeaders(),
    })
  }
  if (
    error instanceof
      InvalidSessionError ||
    error instanceof
      ExpiredSessionError ||
    error instanceof
      RevokedSessionError ||
    error instanceof
      InactiveSessionUserError
  ) {
    return NextResponse.json(
      {
        error:
          "UNAUTHENTICATED",
      },
      {
        status: 401,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    AdminSecurityError
  ) {
    return NextResponse.json(
      {
        error:
          error.code,
      },
      {
        status:
          error.status,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    AdminRoleError
  ) {
    return NextResponse.json(
      {
        error:
          error.code,
      },
      {
        status:
          error.status,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    RoleAssignmentError
  ) {
    return NextResponse.json(
      {
        error:
          error.code,
      },
      {
        status: 409,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    InvitationError
  ) {
    return NextResponse.json(
      {
        error:
          error.code,
      },
      {
        status:
          error.status,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    InvalidRequestOriginError
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_REQUEST_ORIGIN",
      },
      {
        status: 403,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    AccessDeniedError
  ) {
    return NextResponse.json(
      {
        error:
          "ACCESS_DENIED",
        message:
          "Access to this resource is denied.",
      },
      {
        status: 403,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
      InvalidOrganizationHierarchyError ||
    error instanceof
      InvalidOrganizationIdentifierError
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_ORGANIZATION",
      },
      {
        status: 400,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
    OrganizationAlreadyArchivedError
  ) {
    return NextResponse.json(
      {
        error:
          "ORGANIZATION_ARCHIVED",
      },
      {
        status: 409,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code ===
      "P2002"
  ) {
    return NextResponse.json(
      {
        error:
          "ORGANIZATION_CONFLICT",
      },
      {
        status: 409,
        headers:
          noStoreHeaders(),
      },
    )
  }

  if (
    error instanceof
      Error &&
    error.message ===
      "INVALID_ADMIN_PAYLOAD"
  ) {
    return NextResponse.json(
      {
        error:
          "INVALID_PAYLOAD",
      },
      {
        status: 400,
        headers:
          noStoreHeaders(),
      },
    )
  }

  console.error(
    "admin request failed",
  )

  return NextResponse.json(
    {
      error:
        "INTERNAL_ERROR",
    },
    {
      status: 500,
      headers:
        noStoreHeaders(),
    },
  )
}
