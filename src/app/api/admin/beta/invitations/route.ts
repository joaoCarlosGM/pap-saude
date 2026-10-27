import { NextRequest } from "next/server";
import { assertTrustedRequestOrigin, readSessionToken } from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import {
  listBetaInvitations,
  mutateBetaInvitation,
} from "@/server/admin-beta/invitations.service";
import {
  betaError,
  betaJson,
  requireBetaSession,
} from "@/server/admin-beta/http";
import { betaRateLimit, uuid, invalid } from "@/server/admin-beta/policy";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const session = await requireBetaSession(request),
      p = request.nextUrl.searchParams;
    if (
      [...p.keys()].some(
        (k) =>
          !["organizationId", "page"].includes(k) || p.getAll(k).length !== 1,
      )
    )
      invalid();
    return betaJson(
      await listBetaInvitations(
        session.user.id,
        uuid(p.get("organizationId")),
        Number(p.get("page") || 1),
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
    await betaRateLimit("invites", session.user.id, 30);
    return betaJson(
      await mutateBetaInvitation(session.user.id, await readAdminJson(request), readSessionToken(request) ?? undefined),
      201,
    );
  } catch (error) {
    return betaError(error);
  }
}
