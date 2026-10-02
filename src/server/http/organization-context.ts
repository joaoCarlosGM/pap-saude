import type {
  NextRequest,
} from "next/server"

const ORGANIZATION_HEADER =
  "x-organization-id"

export function readOrganizationIdFromRequest(
  request: NextRequest,
) {
  const headerValue =
    request.headers
      .get(
        ORGANIZATION_HEADER,
      )
      ?.trim()

  return headerValue || null
}

export {
  ORGANIZATION_HEADER,
}
