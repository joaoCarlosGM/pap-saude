import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import type { ValidatedSession } from "./session.service";

export class OperationalMfaRequiredError extends Error {
  constructor() { super("MFA_REQUIRED"); this.name = "OperationalMfaRequiredError"; }
}
/** Primary sessions remain usable for enrollment/recovery, never operational work.
 * No role exception: the proof belongs to this live session and current factor. */
export async function requireOperationalMfa(actor: ValidatedSession, client: Prisma.TransactionClient = db, now = new Date()) {
  const factor = await client.mfaFactor.findFirst({
    where: { userId: actor.user.id, type: "TOTP", status: "ACTIVE" },
    orderBy: { enabledAt: "desc" }, select: { enabledAt: true },
  });
  const verified = actor.session.mfaVerifiedAt;
  if (!factor?.enabledAt || !verified || verified < factor.enabledAt || verified < actor.session.createdAt || verified > now)
    throw new OperationalMfaRequiredError();
}
