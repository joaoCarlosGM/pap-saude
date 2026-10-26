import { createHash } from "node:crypto";
import { invitationBaseUrl, requireTransactionalMail, sendPlatformEmail } from "./email.service";
import { transactionalTemplate } from "./templates";
// Fragment is never sent in HTTP requests, Referer or access logs.
export async function sendPasswordResetEmail(to: string, token: string, metadata?: { id: string; expiresAt: Date; createdAt: Date }): Promise<void> {
  requireTransactionalMail();
  const url = new URL("/redefinir-senha", invitationBaseUrl());
  url.hash = `token=${encodeURIComponent(token)}`;
  const tokenDigest = createHash("sha256").update(token).digest("hex");
  await sendPlatformEmail({ to, ...transactionalTemplate({ kind: "PASSWORD_RESET", url: url.toString(), expiresAt: metadata?.expiresAt || new Date(Date.now() + 30 * 60_000) }),
    messageId: `password-reset/${metadata?.id || tokenDigest}`, eventTime: metadata?.createdAt.toISOString(),
    reference: metadata ? { kind: "PASSWORD_RESET", id: metadata.id } : undefined });
}
