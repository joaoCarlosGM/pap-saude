import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminBetaOnly, adminBetaPathAllowed } from "./lib/admin-beta-policy";

export function proxy(request: NextRequest) {
  if (!adminBetaOnly(process.env.PAP_ADMIN_BETA_ONLY)) return NextResponse.next();
  const path = request.nextUrl.pathname;
  const health = path === "/api/health" && ["GET", "HEAD"].includes(request.method);
  const expected = process.env.PAP_ADMIN_BETA_PROXY_TOKEN || "";
  const received = request.headers.get("x-pap-beta-proxy-token") || "";
  const trusted = /^[A-Za-z0-9_-]{32,128}$/.test(expected) && /^[A-Za-z0-9_-]{32,128}$/.test(received) && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  const internalOverride = ["x-middleware-subrequest", "x-middleware-rewrite", "x-middleware-override-headers", "x-invoke-path", "x-invoke-query", "x-matched-path", "next-action"].some(header => request.headers.has(header));
  const approvedEmail = process.env.PAP_BETA_EMAIL_APPROVED === "1" && process.env.PAP_EMAIL_PROVIDER === "resend" && process.env.PAP_EMAIL_EXTERNAL_ENABLED === "1";
  if ((!health && !trusted) || !adminBetaPathAllowed(path, request.method, approvedEmail) || internalOverride) {
    return NextResponse.json({ error: "ADMIN_BETA_ROUTE_DISABLED" }, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" } });
  }
  if (path === "/") return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
