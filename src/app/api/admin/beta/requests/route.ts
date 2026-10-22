import { readSessionToken } from "@/server/auth/http-auth";
import { NextRequest } from "next/server";
import { assertTrustedRequestOrigin } from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import {
  listBetaRequests,
  reviewBetaRequest,
} from "@/server/admin-beta/requests.service";
import {
  betaError,
  betaJson,
  requireBetaSession,
} from "@/server/admin-beta/http";
import { betaRateLimit, invalid } from "@/server/admin-beta/policy";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const session = await requireBetaSession(request),
      params = request.nextUrl.searchParams;
    if (
      request.nextUrl.search.length > 500 ||
      [...params.keys()].some(
        (k) =>
          !["page", "status", "q"].includes(k) || params.getAll(k).length !== 1,
      )
    )
      invalid();
    return betaJson(
      await listBetaRequests(
        session.user.id,
        Number(params.get("page") || 1),
        params.get("status") || undefined,
        params.get("q") || undefined,
      ),
    );
  } catch (error) {
    return betaError(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    const session = await requireBetaSession(request);
    await betaRateLimit("review", session.user.id, 100);
    return betaJson(
      await reviewBetaRequest(session.user.id, await readAdminJson(request), readSessionToken(request) ?? undefined),
    );
  } catch (error) {
    return betaError(error);
  }
}
