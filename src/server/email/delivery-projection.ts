import type { Prisma } from "@prisma/client";
/** Delivery metadata only; never changes consent, grants, factors or activation. */
export async function projectDelivery(tx: Prisma.TransactionClient, email: {
  referenceKind: string | null; referenceId: string | null; referenceVersion: number | null;
}, status: string, providerMessageId?: string) {
  if (!email.referenceId) return;
  if (email.referenceKind === "ACCESS_INVITATION")
    await tx.accessInvitation.updateMany({ where: { id: email.referenceId, tokenVersion: email.referenceVersion! }, data: { deliveryStatus: status } });
  if (email.referenceKind === "ACCESS_NOTIFICATION")
    await tx.userNotification.updateMany({ where: { id: email.referenceId, emailStatus: { not: "NOT_REQUESTED" } }, data: { emailStatus: status } });
  if (email.referenceKind === "INSTITUTIONAL_INVITATION")
    await tx.userInvitation.updateMany({ where: { id: email.referenceId }, data: { deliveryStatus: status, ...(providerMessageId ? { providerMessageId } : {}),
      ...(["CAPTURED", "ACCEPTED_BY_PROVIDER"].includes(status) ? { deliveryAttemptedAt: new Date() } : {}) } });
  if (email.referenceKind === "UBS_ACTIVATED")
    await tx.organizationActivationNotice.updateMany({ where: { id: email.referenceId }, data: { emailStatus: status } });
}
