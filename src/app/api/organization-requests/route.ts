import { NextRequest } from "next/server";
import {
  assertTrustedRequestOrigin,
  resolveTrustedClientOrigin,
} from "@/server/auth/http-auth";
import { readAdminJson } from "@/server/admin/admin-http";
import { submitPublicRequest } from "@/server/admin-beta/requests.service";
import { betaRateLimit } from "@/server/admin-beta/policy";
import { betaError, betaJson } from "@/server/admin-beta/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertTrustedRequestOrigin(request);
    await betaRateLimit(
      "public-origin",
      resolveTrustedClientOrigin(request),
      10,
    );
    const body = await readAdminJson(request);
    // Global safety ceiling also limits attacks from many origins; no enumeration endpoint.
    await betaRateLimit("public-global", "requests", 200);
    return betaJson(await submitPublicRequest(body), 202);
  } catch (error) {
    return betaError(error);
  }
}
