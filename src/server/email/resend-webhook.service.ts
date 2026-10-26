import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/server/db/client";
import { projectDelivery } from "./delivery-projection";
import { mailProvider } from "./email-config";
const eventKinds: Record<string, string> = {
  "email.delivered": "DELIVERED", "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED", "email.failed": "FAILED",
};
/** Svix/Resend: authenticate the original bytes BEFORE parsing. */
export function verifyResendWebhook(raw: string, headers: Headers, now = Date.now()) {
  if (mailProvider() !== "RESEND") throw new Error("WEBHOOK_DISABLED");
  const configured = process.env.RESEND_WEBHOOK_SECRET || "";
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(configured)) throw new Error("WEBHOOK_DISABLED");
  const key = Buffer.from(configured.slice(6), "base64");
  const id = headers.get("svix-id") || "", timestamp = headers.get("svix-timestamp") || "";
  const signatures = headers.get("svix-signature") || "";
  if (key.length < 24 || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !/^\d{10}$/.test(timestamp) ||
      Math.abs(now / 1000 - Number(timestamp)) > 300 || signatures.length > 2048) throw new Error("INVALID_WEBHOOK");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest();
  const valid = signatures.split(" ").some(s => {
    if (!/^v1,[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
    const signature = Buffer.from(s.slice(3), "base64");
    return signature.length === expected.length && timingSafeEqual(signature, expected);
  });
  if (!valid) throw new Error("INVALID_WEBHOOK");
  return createHash("sha256").update(id).digest("hex");
}
export async function receiveResendWebhook(raw: string, headers: Headers) {
  const eventHash = verifyResendWebhook(raw, headers);
  const event = JSON.parse(raw);
  const kind = eventKinds[event.type];
  if (!kind) return; // Authenticated, unneeded event. Do not store the payload or addresses.
  const providerId = event.data?.email_id, occurredAt = new Date(event.created_at);
  if (typeof providerId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(providerId) || !Number.isFinite(occurredAt.getTime())) throw new Error("INVALID_WEBHOOK");
  await db.$transaction(async tx => {
    const email = await tx.transactionalEmail.findUnique({ where: { providerMessageId: providerId } });
    // May race provider acceptance commit: request a provider retry, never discard.
    if (!email || email.provider !== "RESEND") throw new Error("WEBHOOK_RETRY");
    await tx.transactionalEmail.update({ where: { id: email.id }, data: { keyHash: email.keyHash } });
    if (await tx.transactionalEmailEvent.findUnique({ where: { eventHash } })) return;
    await tx.transactionalEmailEvent.create({ data: { emailId: email.id, eventHash, kind, occurredAt } });
    // Delayed delivery must not overwrite terminal bounce/complaint/failure.
    const current = await tx.transactionalEmail.findUniqueOrThrow({ where: { id: email.id } });
    const priority: Record<string, number> = { PENDING: 0, ACCEPTED_BY_PROVIDER: 1, DELIVERED: 2, FAILED: 3, BOUNCED: 4, COMPLAINED: 5 };
    if ((priority[kind] || 0) >= (priority[current.status] || 0)) {
      await tx.transactionalEmail.update({ where: { id: email.id }, data: { status: kind } });
      await projectDelivery(tx, email, kind, providerId);
    }
    await tx.auditEvent.create({ data: { action: "TRANSACTIONAL_EMAIL_WEBHOOK", resourceType: "TRANSACTIONAL_EMAIL", resourceId: email.id, after: { status: kind } } });
  });
}
