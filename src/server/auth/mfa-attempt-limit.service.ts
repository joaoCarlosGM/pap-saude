import { AuditOutcome } from "@prisma/client";
import { db } from "@/server/db/client";
import { sha256 } from "@/server/security/crypto";
import {
  ConsumedMfaChallengeError,
  ExpiredMfaChallengeError,
  InvalidMfaChallengeError,
  MfaLoginThrottledError,
} from "./mfa.errors";

const WINDOW_MS = 15 * 60_000;
export const MFA_LOGIN_ATTEMPT_LIMITS = {
  challenge: 5,
  identity: 20,
  origin: 100,
} as const;

/** Reserve an attempt BEFORE checking TOTP/recovery. Atomic shared counters bound
 * concurrent workers; a new challenge or source IP cannot reset identity limits.
 * Challenge limits span its entire lifetime, including a time-window boundary.
 * Only domain-separated hashes and counts are stored, never codes, IPs or tokens.
 */
export async function reserveMfaLoginAttempt(
  challenge: { id: string; userId: string; ipHash: string | null },
  origin: string | undefined,
  now: Date,
): Promise<void> {
  const window = Math.floor(now.getTime() / WINDOW_MS);
  const originHash = sha256(`mfa-origin:v1\0${origin?.trim() || challenge.ipHash || "trusted-internal-service"}`);
  const identityHash = sha256(`mfa-identity:v1\0${challenge.userId}`);
  const allowed = await db.$transaction(async tx => {
    const current = await tx.mfaChallenge.findUnique({
      where: { id: challenge.id },
      include: { user: { select: { isActive: true } } },
    });
    if (!current || current.userId !== challenge.userId || current.revokedAt || !current.user.isActive)
      throw new InvalidMfaChallengeError();
    if (current.consumedAt) throw new ConsumedMfaChallengeError();
    if (current.expiresAt <= now) throw new ExpiredMfaChallengeError();
    // All workers acquire shared buckets in the same order.
    const buckets = [
      { scope: "ORIGIN", key: sha256(`mfa-limit-origin:v1:${window}:${originHash}`), limit: MFA_LOGIN_ATTEMPT_LIMITS.origin, expiresAt: new Date((window + 2) * WINDOW_MS) },
      { scope: "IDENTITY", key: sha256(`mfa-limit-identity:v1:${window}:${identityHash}`), limit: MFA_LOGIN_ATTEMPT_LIMITS.identity, expiresAt: new Date((window + 2) * WINDOW_MS) },
      { scope: "CHALLENGE", key: sha256(`mfa-limit-challenge:v1:${challenge.id}`), limit: MFA_LOGIN_ATTEMPT_LIMITS.challenge, expiresAt: current.expiresAt },
    ];
    for (const bucket of buckets) {
      const row = await tx.betaAbuseBucket.upsert({
        where: { key: bucket.key },
        create: { key: bucket.key, count: 1, expiresAt: bucket.expiresAt },
        update: { count: { increment: 1 } },
      });
      if (row.count > bucket.limit) {
        await tx.auditEvent.create({ data: {
          action: "MFA_LOGIN_THROTTLED", resourceType: "AUTHENTICATION", resourceId: identityHash,
          outcome: AuditOutcome.FAILURE, ipHash: originHash, occurredAt: now,
          metadata: { scope: bucket.scope },
        } });
        // Commit counters/audit even when denied. Throwing here would roll them back.
        return false;
      }
    }
    return true;
  });
  if (!allowed) throw new MfaLoginThrottledError();
}
