import { NextResponse } from "next/server";
import {
  requireAdminSession,
  adminErrorResponse,
} from "@/server/admin/admin-http";
import { BetaRateLimitError } from "./policy";
// Compatibility alias: both old and Beta routes use the same mandatory MFA policy.
export const requireBetaSession = requireAdminSession;
export function betaError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status =
    error instanceof BetaRateLimitError
      ? 429
      : message === "BETA_QUERY_TOO_LARGE"
        ? 400
        : message === "BETA_TRANSITION_CONFLICT"
          ? 409
          : 0;
  if (status)
    return NextResponse.json(
      { error: status === 429 ? "RATE_LIMITED" : message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 429 ? { "Retry-After": "3600" } : {}),
        },
      },
    );
  return adminErrorResponse(error);
}
export function betaJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
