import { NextRequest } from "next/server";
import { resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { consumePasswordReset } from "@/server/auth/password-security.service";
import { AccountSecurityError } from "@/server/auth/account-security.service";
import { readSecurityBody, securityFailure, securityJson, stringField, validateOrigin } from "@/server/auth/security-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    validateOrigin(request); resolveTrustedClientOrigin(request);
    const body = await readSecurityBody(request);
    if (Object.keys(body).some(k => !["token", "newPassword", "confirmPassword"].includes(k))) throw new AccountSecurityError("INVALID_BODY");
    const newPassword = stringField(body, "newPassword", 256);
    if (stringField(body, "confirmPassword", 256) !== newPassword) throw new AccountSecurityError("INVALID_BODY");
    await consumePasswordReset({ token: stringField(body, "token", 128), newPassword });
    return securityJson({ ok: true });
  } catch (error) { return securityFailure(error); }
}
