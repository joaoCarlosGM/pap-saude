import { NextRequest, NextResponse } from "next/server";
import { assertTrustedRequestOrigin, getSessionCookieOptions, resolveTrustedClientOrigin } from "@/server/auth/http-auth";
import { readSecurityBody } from "@/server/auth/security-http";
import { CaptchaError, CAPTCHA_COOKIE, issueLoginCaptcha } from "@/server/auth/login-captcha.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  try {
    assertTrustedRequestOrigin(request);
    const origin = resolveTrustedClientOrigin(request), body = await readSecurityBody(request);
    if (Object.keys(body).some(k => k !== "accessible") || (body.accessible !== undefined && typeof body.accessible !== "boolean")) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
    const issued = await issueLoginCaptcha(origin, body.accessible === true);
    const response = NextResponse.json(issued.public, { headers });
    response.cookies.set(CAPTCHA_COOKIE, issued.binding, { ...getSessionCookieOptions(), path: "/api/auth/login", maxAge: 120 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: "VERIFICATION_UNAVAILABLE" }, { status: error instanceof CaptchaError ? error.status : 503, headers });
  }
}
