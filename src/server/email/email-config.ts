import { isIP } from "node:net";
import { EmailDeliveryError } from "@/server/invitations/invitation.errors";
export function invitationBaseUrl() {
  const production = process.env.NODE_ENV === "production";
  try {
    const base = new URL(process.env.PAP_PUBLIC_URL?.trim() || (production ? "" : "http://localhost:3000"));
    const allowed = (process.env.PAP_EMAIL_ALLOWED_HOSTS || "").split(",").map(h => h.trim()).filter(Boolean);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/" ||
        (production && (base.protocol !== "https:" || !allowed.includes(base.host)))) throw new Error();
    return base.origin;
  } catch { throw new EmailDeliveryError(); }
}
export function mailProvider(): "LOCAL_DEMO" | "RESEND" | "DISABLED" {
  const provider = process.env.PAP_EMAIL_PROVIDER?.trim().toLowerCase() || "disabled";
  if (provider === "local-demo") return "LOCAL_DEMO";
  if (provider === "disabled" && process.env.NODE_ENV !== "production") return "DISABLED";
  if (provider !== "resend") throw new EmailDeliveryError();
  // A public origin/allowlist must never override the local laboratory boundary.
  // Inspect configuration only; do not connect to or read the operator's database.
  let database: URL;
  try { database = new URL(process.env.DATABASE_URL || ""); }
  catch { throw new EmailDeliveryError(); }
  if (process.env.PAP_LOCAL_DEMO === "1" || process.env.PAP_LOCAL_DEMO_TEST === "1" ||
      !!process.env.PAP_LOCAL_MAIL_TEST_DIR ||
      process.env.PAP_LOCAL_PROFILE === "p0-acceptance" ||
      database.pathname === "/pap_admin_beta1_local" || database.pathname === "/pap_p0_acceptance") throw new EmailDeliveryError();
  const base = new URL(invitationBaseUrl());
  const allowedHosts = (process.env.PAP_EMAIL_ALLOWED_HOSTS || "").split(",").map(s => s.trim());
  const from = process.env.PAP_EMAIL_FROM?.trim() || "";
  const match = from.match(/^(?:[^<>\r\n]+ <([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>|([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+))$/);
  const address = match?.[1] || match?.[2];
  const allowedSenders = (process.env.PAP_EMAIL_ALLOWED_SENDERS || "").split(",").map(s => s.trim().toLowerCase());
  if (process.env.PAP_EMAIL_EXTERNAL_ENABLED !== "1" || !process.env.RESEND_API_KEY?.trim() ||
      base.protocol !== "https:" || isIP(base.hostname) || !base.hostname.includes(".") ||
      /(^|\.)(localhost|local|invalid|internal)$/.test(base.hostname) || !allowedHosts.includes(base.host) ||
      !address || !allowedSenders.includes(address.toLowerCase())) throw new EmailDeliveryError();
  return "RESEND";
}
export function requireTransactionalMail() {
  if (mailProvider() === "DISABLED") throw new EmailDeliveryError();
}
