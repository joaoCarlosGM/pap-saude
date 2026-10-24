import type { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { validateSession } from "@/server/auth/session.service";
import { InvalidSessionError } from "@/server/auth/session.errors";

export class AdminMfaRequiredError extends Error {
  constructor() {
    super("ADMIN_MFA_REQUIRED");
  }
}
/** Proof belongs to this exact live session, never another session of the actor. */
export async function requireAdminActor(
  userId: string,
  token?: string,
  client: Prisma.TransactionClient = db,
) {
  if (!token) throw new AdminMfaRequiredError();
  const result = await validateSession(token, {
    updateLastSeen: false,
    client,
  });
  if (result.user.id !== userId) throw new InvalidSessionError();
  const verified = result.session.mfaVerifiedAt;
  const factor = await client.mfaFactor.findFirst({
    where: { userId, type: "TOTP", status: "ACTIVE" },
    orderBy: { enabledAt: "desc" },
    select: { enabledAt: true },
  });
  if (
    !verified ||
    !factor?.enabledAt ||
    verified < factor.enabledAt ||
    verified < result.session.createdAt ||
    verified > new Date()
  )
    throw new AdminMfaRequiredError();
  return result;
}
