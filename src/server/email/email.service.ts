import { createHash, randomUUID } from "node:crypto";
import { db } from "@/server/db/client";
import { projectDelivery } from "./delivery-projection";
import { captureLocalDemoMail } from "./local-demo-mail";
import { EmailDeliveryError } from "@/server/invitations/invitation.errors";
import { invitationBaseUrl, mailProvider } from "./email-config";
import { transactionalTemplate } from "./templates";
export { invitationBaseUrl, requireTransactionalMail } from "./email-config";
export type EmailDeliveryStatus = "NOT_REQUESTED" | "CAPTURED" | "ACCEPTED_BY_PROVIDER" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED";
export type EmailDeliveryResult =
  | { mode: "DEVELOPMENT"; status: "NOT_REQUESTED" | "CAPTURED" }
  | { mode: "RESEND"; status: EmailDeliveryStatus; providerMessageId: string };
export type MailReference = { kind: "ACCESS_INVITATION" | "ACCESS_NOTIFICATION" | "INSTITUTIONAL_INVITATION" | "PASSWORD_RESET" | "UBS_ACTIVATED"; id: string; version?: number };
export type PlatformEmailInput = {
  to: string; subject: string; text: string; html: string;
  messageId?: string; eventTime?: string; idempotencyKey?: string;
  localDemoOnly?: boolean; reference?: MailReference;
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
/** A database lock serializes same-message retries across workers. Bodies and bearer
 * links never enter the ledger/audit. Resend idempotency is bounded to <24 hours. */
export async function sendPlatformEmail(input: PlatformEmailInput): Promise<EmailDeliveryResult> {
  const provider = mailProvider();
  if (input.localDemoOnly && provider !== "LOCAL_DEMO") throw new EmailDeliveryError();
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(input.to) || /[\r\n]/.test(input.subject)) throw new EmailDeliveryError();
  // Explicitly disabled development transport is not delivery or capture.
  if (provider === "DISABLED") return { mode: "DEVELOPMENT", status: "NOT_REQUESTED" };
  const keyHash = hash(input.idempotencyKey || input.messageId || randomUUID());
  const contentHash = hash(JSON.stringify([input.to, input.subject, input.text, input.html, input.reference || null]));
  await db.transactionalEmail.createMany({ skipDuplicates: true, data: {
    keyHash, contentHash, provider, referenceKind: input.reference?.kind,
    referenceId: input.reference?.id, referenceVersion: input.reference?.version,
  } });
  const result = await db.$transaction(async tx => {
    // A no-change Prisma UPDATE obtains the PostgreSQL row lock. No raw SQL.
    const row = await tx.transactionalEmail.update({ where: { keyHash }, data: { keyHash } });
    if (row.contentHash !== contentHash || row.provider !== provider) return null;
    if (row.status === "CAPTURED") return { mode: "DEVELOPMENT" as const, status: "CAPTURED" as const };
    if (row.providerMessageId) return { mode: "RESEND" as const, status: row.status as EmailDeliveryStatus, providerMessageId: row.providerMessageId };
    if (provider === "RESEND" && row.attempts && Date.now() - row.createdAt.getTime() >= 23 * 3600_000) return null;
    await tx.transactionalEmail.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    try {
      let providerMessageId: string | undefined;
      if (provider === "LOCAL_DEMO") await captureLocalDemoMail({ ...input, messageId: input.messageId || keyHash, eventTime: input.eventTime || row.createdAt.toISOString() });
      else {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", signal: AbortSignal.timeout(10_000), redirect: "error",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json", "Idempotency-Key": `pap-mail/${keyHash}` },
          body: JSON.stringify({ from: process.env.PAP_EMAIL_FROM!.trim(), to: [input.to], subject: input.subject, text: input.text, html: input.html }),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.id)) throw new Error();
        providerMessageId = data.id;
      }
      const status = provider === "LOCAL_DEMO" ? "CAPTURED" : "ACCEPTED_BY_PROVIDER";
      await tx.transactionalEmail.update({ where: { id: row.id }, data: { status, providerMessageId } });
      await projectDelivery(tx, row, status, providerMessageId);
      await tx.auditEvent.create({ data: { action: "TRANSACTIONAL_EMAIL_STATUS", resourceType: "TRANSACTIONAL_EMAIL", resourceId: row.id, after: { status, provider } } });
      return providerMessageId ? { mode: "RESEND" as const, status: "ACCEPTED_BY_PROVIDER" as const, providerMessageId } : { mode: "DEVELOPMENT" as const, status: "CAPTURED" as const };
    } catch {
      await tx.transactionalEmail.update({ where: { id: row.id }, data: { status: "FAILED" } });
      await tx.auditEvent.create({ data: { action: "TRANSACTIONAL_EMAIL_STATUS", resourceType: "TRANSACTIONAL_EMAIL", resourceId: row.id, after: { status: "FAILED", provider } } });
      return null;
    }
  }, { timeout: 20_000, maxWait: 20_000 });
  if (!result) throw new EmailDeliveryError();
  return result;
}
export type InvitationEmailInput = {
  to: string; displayName: string; organizationName: string; invitationUrl: string;
  invitationId?: string; roleKey?: string; expiresAt?: Date;
};
export function invitationTemplate(input: InvitationEmailInput) {
  const safeLink = new URL(input.invitationUrl);
  const legacyToken = safeLink.searchParams.get("token");
  if (legacyToken) { safeLink.searchParams.delete("token"); safeLink.hash = `token=${encodeURIComponent(legacyToken)}`; }
  return transactionalTemplate({ kind: "INVITATION", displayName: input.displayName,
    organizationName: input.organizationName, roleKey: input.roleKey, url: safeLink.toString(),
    expiresAt: input.expiresAt || new Date(Date.now() + 48 * 3600_000) });
}
export async function sendInvitationEmail(input: InvitationEmailInput): Promise<EmailDeliveryResult> {
  if (new URL(input.invitationUrl).origin !== invitationBaseUrl()) throw new EmailDeliveryError();
  return sendPlatformEmail({ to: input.to, ...invitationTemplate(input),
    messageId: input.invitationId ? `institutional/${input.invitationId}` : undefined,
    idempotencyKey: input.invitationId ? `pap-invitation/${input.invitationId}` : undefined,
    reference: input.invitationId ? { kind: "INSTITUTIONAL_INVITATION", id: input.invitationId } : undefined });
}
