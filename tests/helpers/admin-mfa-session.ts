import { db } from "../../src/server/db/client";
import { createSession } from "../../src/server/auth/session.service";

/** Actor fixture only. Real enrollment/TOTP/recovery ceremonies have separate HTTP tests. */
export async function createAdminMfaSessionFixture(userId: string) {
  const factor = await db.mfaFactor.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (!factor) {
    const enabledAt = new Date(Date.now() - 1000);
    await db.mfaFactor.create({
      data: {
        userId,
        type: "TOTP",
        status: "ACTIVE",
        secretEncrypted: "synthetic-mfa-session-fixture-only",
        createdAt: enabledAt,
        enabledAt,
      },
    });
  }
  return createSession({
    userId,
    mfaVerified: true,
    userAgent: "PAP-Admin-MFA-Test",
  });
}
