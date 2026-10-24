import { NextRequest } from "next/server";
import {
  assertTrustedRequestOrigin,
  readSessionToken,
  resolveTrustedClientOrigin,
} from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import { betaRateLimit, invalid } from "@/server/admin-beta/policy";
import {
  accessJson,
  accessError,
  onlyFields,
} from "@/server/access-invitations/access-invitation-http";
import {
  inspectAccessInvitation,
  acceptAccessInvitation,
  hashAccessToken,
} from "@/server/access-invitations/access-invitation.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Secret is received only in a bounded POST body, never query string or JSON response.
export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    if (request.nextUrl.search) invalid();
    const body = await readAdminJson(request);
    onlyFields(body, ["operation", "token", "password"]);
    if (
      typeof body.token !== "string" ||
      !["INSPECT", "ACCEPT"].includes(String(body.operation))
    )
      invalid();
    await betaRateLimit(
      `access-public/${body.operation}`,
      resolveTrustedClientOrigin(request),
      100,
    );
    if (body.operation === "INSPECT")
      return accessJson({
        invitation: await inspectAccessInvitation(body.token),
      });
    if (typeof body.password !== "string") invalid();
    await betaRateLimit("access-identity", hashAccessToken(body.token), 10);
    return accessJson(
      await acceptAccessInvitation({
        token: body.token,
        password: body.password,
        sessionToken: readSessionToken(request) ?? undefined,
      }),
    );
  } catch (error) {
    return accessError(error);
  }
}
