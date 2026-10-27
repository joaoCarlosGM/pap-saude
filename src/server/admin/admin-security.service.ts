import type { Prisma } from "@prisma/client"
import { serializable } from "@/server/admin-beta/policy"
import { requireAdminActor } from "./admin-session.service"
import {
  AuditOutcome,
  MfaFactorStatus,
  MfaFactorType,
  SessionRevocationReason,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"

import {
  PERMISSIONS,
} from "@/server/iam/permissions"

import {
  requirePermission,
} from "@/server/iam/authorization.service"

import {
  resetMfaForUser,
} from "@/server/auth/mfa-reset.service"

import {
  AdminSecuritySessionNotFoundError,
  AdminSecurityTargetNotFoundError,
} from "./admin-security.errors"

async function requireSecurityTarget(
  targetUserId: string,
  client: Prisma.TransactionClient = db,
) {
  const user =
    await client.user.findUnique({
      where: {
        id:
          targetUserId,
      },

      select: {
        id: true,
        email: true,
        displayName:
          true,
        isActive:
          true,
      },
    })

  if (!user) {
    throw new AdminSecurityTargetNotFoundError()
  }

  return user
}

export async function listAdminSecurityPosture(
  actorUserId: string,
  page = 1,
) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new AdminSecurityTargetNotFoundError();
  await requirePermission({
    userId:
      actorUserId,

    permission:
      PERMISSIONS.USER_SECURITY_MANAGE,
  })

  const now =
    new Date()

  const users =
    await db.user.findMany({
      skip: (page-1) * 25,
      select: {
        id: true,
        email: true,
        displayName:
          true,
        isActive:
          true,

        mfaFactors: {
          where: {
            type:
              MfaFactorType.TOTP,

            status: {
              in: [
                MfaFactorStatus.PENDING,
                MfaFactorStatus.ACTIVE,
              ],
            },
          },

          select: {
            status:
              true,
            createdAt:
              true,
            enabledAt:
              true,
          },
        },

        _count: {
          select: {
            mfaRecoveryCodes: {where: {usedAt:null,revokedAt:null}},
            sessions: {where: {revokedAt:null,expiresAt:{gt:now}}},
          },
        },
        mfaRecoveryCodes: {
          where: {
            usedAt:
              null,
            revokedAt:
              null,
          },

          select: {
            id:
              true,
          },
        },

        sessions: {
          where: {
            revokedAt:
              null,

            expiresAt: {
              gt:
                now,
            },
          },

          select: {
            id: true,
            createdAt:
              true,
            expiresAt:
              true,
            lastSeenAt:
              true,
            userAgent:
              true,
          },

          orderBy: {
            lastSeenAt:
              "desc",
          },

          take:
            20,
        },
      },

      orderBy: {
        displayName:
          "asc",
      },

      take:
        25,
    })

  return users.map(
    (
      user,
    ) => ({
      id:
        user.id,
      email:
        user.email,
      displayName:
        user.displayName,
      isActive:
        user.isActive,

      mfa: {
        activeFactors:
          user.mfaFactors.filter(
            (
              factor,
            ) =>
              factor.status ===
              MfaFactorStatus.ACTIVE,
          ).length,

        pendingFactors:
          user.mfaFactors.filter(
            (
              factor,
            ) =>
              factor.status ===
              MfaFactorStatus.PENDING,
          ).length,

        unusedRecoveryCodes:
          user._count.mfaRecoveryCodes,
      },

      sessions: {
        active:
          user._count.sessions,

        items:
          user.sessions,
      },
    }),
  )
}

/** Authorization and the security mutation share one retryable snapshot. */
async function securityMutation<T>(
  input: { actorUserId: string; actorSessionToken?: string; targetUserId: string },
  permission: typeof PERMISSIONS.USER_SECURITY_MANAGE | typeof PERMISSIONS.MFA_RESET,
  action: (tx: Prisma.TransactionClient, actorSessionId: string) => Promise<T>,
) {
  return serializable(async tx => {
    const actor = await requireAdminActor(input.actorUserId, input.actorSessionToken, tx);
    await requirePermission({ userId: input.actorUserId, permission }, tx);
    await requireSecurityTarget(input.targetUserId, tx);
    return action(tx, actor.session.id);
  });
}

export async function revokeAdminUserSession(input: {
  actorUserId: string;
  actorSessionToken?: string;
  actorSessionId?: string | null;
  targetUserId: string;
  targetSessionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await securityMutation(input, PERMISSIONS.USER_SECURITY_MANAGE, async (tx, actorSessionId) => {
    const changed = await tx.session.updateMany({
      where: { id: input.targetSessionId, userId: input.targetUserId, revokedAt: null },
      data: { revokedAt: now, revocationReason: SessionRevocationReason.ADMIN_REVOKED },
    });
    if (changed.count !== 1) throw new AdminSecuritySessionNotFoundError();
    await tx.auditEvent.create({ data: {
      actorUserId: input.actorUserId, action: "SESSION_REVOKED", resourceType: "USER_SESSION",
      resourceId: input.targetSessionId, outcome: AuditOutcome.SUCCESS,
      sessionId: actorSessionId, metadata: { targetUserId: input.targetUserId }, occurredAt: now,
    } });
  });
  return { revoked: true, sessionId: input.targetSessionId };
}

export async function revokeAdminUserSessions(input: {
  actorUserId: string;
  actorSessionToken?: string;
  actorSessionId?: string | null;
  targetUserId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const count = await securityMutation(input, PERMISSIONS.USER_SECURITY_MANAGE, async (tx, actorSessionId) => {
    const changed = await tx.session.updateMany({
      where: { userId: input.targetUserId, revokedAt: null },
      data: { revokedAt: now, revocationReason: SessionRevocationReason.ADMIN_REVOKED },
    });
    await tx.auditEvent.create({ data: {
      actorUserId: input.actorUserId, action: "USER_SESSIONS_REVOKED", resourceType: "USER",
      resourceId: input.targetUserId, outcome: AuditOutcome.SUCCESS,
      sessionId: actorSessionId, metadata: { revokedSessions: changed.count }, occurredAt: now,
    } });
    return changed.count;
  });
  return { revokedSessions: count };
}

export async function resetAdminUserMfa(input: {
  actorUserId: string;
  actorSessionToken?: string;
  actorSessionId?: string | null;
  targetUserId: string;
  reason?: string | null;
  now?: Date;
}) {
  return securityMutation(input, PERMISSIONS.MFA_RESET, (tx, actorSessionId) => resetMfaForUser({
    userId: input.targetUserId, actorUserId: input.actorUserId,
    reason: input.reason, sessionId: actorSessionId, now: input.now,
  }, tx));
}
