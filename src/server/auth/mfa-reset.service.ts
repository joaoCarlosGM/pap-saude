import {
  AuditOutcome,
  MfaFactorStatus,
  MfaFactorType,
  SessionRevocationReason,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  MfaResetTargetUnavailableError,
} from "./mfa.errors";

export interface ResetMfaInput {
  userId: string;

  /*
   * Actor is optional so the service can also support trusted
   * system/security workflows. RBAC will decide who may call
   * this operation in Foundation 02.4.
   */
  actorUserId?: string | null;

  reason?: string | null;

  requestId?: string | null;
  correlationId?: string | null;
  sessionId?: string | null;

  ipHash?: string | null;
  userAgent?: string | null;

  now?: Date;
}

export interface ResetMfaResult {
  userId: string;
  revokedFactors: number;
  revokedRecoveryCodes: number;
  revokedChallenges: number;
  revokedSessions: number;
  occurredAt: Date;
}

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength,
  );
}

export async function resetMfaForUser(
  input: ResetMfaInput,
): Promise<ResetMfaResult> {
  const now =
    input.now ?? new Date();

  const user =
    await db.user.findUnique({
      where: {
        id:
          input.userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  /*
   * Inactive users are intentionally still resettable.
   *
   * MFA reset is a security operation and may be required exactly
   * because an account has already been suspended.
   */
  if (!user) {
    throw new MfaResetTargetUnavailableError();
  }

  const actorUserId =
    input.actorUserId ?? null;

  if (actorUserId !== null) {
    const actorExists =
      await db.user.findUnique({
        where: {
          id:
            actorUserId,
        },
        select: {
          id: true,
        },
      });

    if (!actorExists) {
      throw new MfaResetTargetUnavailableError();
    }
  }

  const reason =
    normalizeOptionalText(
      input.reason,
      512,
    );

  return db.$transaction(
    async tx => {
      const factors =
        await tx.mfaFactor.updateMany({
          where: {
            userId:
              input.userId,
            type:
              MfaFactorType.TOTP,
            status: {
              in: [
                MfaFactorStatus.PENDING,
                MfaFactorStatus.ACTIVE,
              ],
            },
          },
          data: {
            status:
              MfaFactorStatus.REVOKED,
            revokedAt:
              now,
          },
        });

      const recoveryCodes =
        await tx.mfaRecoveryCode.updateMany({
          where: {
            userId:
              input.userId,
            usedAt:
              null,
            revokedAt:
              null,
          },
          data: {
            revokedAt:
              now,
          },
        });

      const challenges =
        await tx.mfaChallenge.updateMany({
          where: {
            userId:
              input.userId,
            consumedAt:
              null,
            revokedAt:
              null,
          },
          data: {
            revokedAt:
              now,
          },
        });

      const sessions =
        await tx.session.updateMany({
          where: {
            userId:
              input.userId,
            revokedAt:
              null,
          },
          data: {
            revokedAt:
              now,
            revocationReason:
              SessionRevocationReason.MFA_RESET,
          },
        });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          action:
            "MFA_RESET",
          resourceType:
            "USER",
          resourceId:
            input.userId,
          outcome:
            AuditOutcome.SUCCESS,
          reason,
          requestId:
            normalizeOptionalText(
              input.requestId,
              256,
            ),
          correlationId:
            normalizeOptionalText(
              input.correlationId,
              256,
            ),
          sessionId:
            normalizeOptionalText(
              input.sessionId,
              256,
            ),
          ipHash:
            normalizeOptionalText(
              input.ipHash,
              256,
            ),
          userAgent:
            normalizeOptionalText(
              input.userAgent,
              1024,
            ),
          metadata: {
            revokedFactors:
              factors.count,
            revokedRecoveryCodes:
              recoveryCodes.count,
            revokedChallenges:
              challenges.count,
            revokedSessions:
              sessions.count,
          },
          occurredAt:
            now,
        },
      });

      return {
        userId:
          input.userId,
        revokedFactors:
          factors.count,
        revokedRecoveryCodes:
          recoveryCodes.count,
        revokedChallenges:
          challenges.count,
        revokedSessions:
          sessions.count,
        occurredAt:
          now,
      };
    },
  );
}
