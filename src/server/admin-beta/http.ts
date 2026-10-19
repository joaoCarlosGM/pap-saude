import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminSession,
  adminErrorResponse,
} from "@/server/admin/admin-http";
import { db } from "@/server/db/client";
import { BetaRateLimitError } from "./policy";
export async function requireBetaSession(request: NextRequest) {
  const result = await requireAdminSession(request);
  const factor = await db.mfaFactor.findFirst({
    where: { userId: result.user.id, status: "ACTIVE" },
  });
  if (
    !factor ||
    !result.session.mfaVerifiedAt ||
    (factor.enabledAt && factor.enabledAt > result.session.mfaVerifiedAt)
  )
    throw new Error("BETA_MFA_REQUIRED");
  return result;
}
export function betaError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const status =
    error instanceof BetaRateLimitError
      ? 429
      : message === "BETA_QUERY_TOO_LARGE"
        ? 400
        : message === "BETA_MFA_REQUIRED"
          ? 403
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
