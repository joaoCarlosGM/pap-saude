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
) {
  const user =
    await db.user.findUnique({
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

export async function revokeAdminUserSession(
  input: {
    actorUserId: string
    actorSessionId?: string | null
    targetUserId: string
    targetSessionId: string
    now?: Date
  },
) {
  await requirePermission({
    userId:
      input.actorUserId,

    permission:
      PERMISSIONS.USER_SECURITY_MANAGE,
  })

  await requireSecurityTarget(
    input.targetUserId,
  )

  const now = input.now ?? new Date()
  await db.$transaction(async tx => {
    const changed = await tx.session.updateMany({
      where:{id:input.targetSessionId,userId:input.targetUserId,revokedAt:null},
      data:{revokedAt:now,revocationReason:SessionRevocationReason.ADMIN_REVOKED},
    })
    if(changed.count!==1) throw new AdminSecuritySessionNotFoundError()
    await tx.auditEvent.create({data:{
      actorUserId:input.actorUserId,action:"SESSION_REVOKED",resourceType:"USER_SESSION",
      resourceId:input.targetSessionId,outcome:AuditOutcome.SUCCESS,
      sessionId:input.actorSessionId??null,metadata:{targetUserId:input.targetUserId},occurredAt:now,
    }})
  })

  return {
    revoked:
      true,
    sessionId:
      input.targetSessionId,
  }
}

export async function revokeAdminUserSessions(
  input: {
    actorUserId: string
    actorSessionId?: string | null
    targetUserId: string
    now?: Date
  },
) {
  await requirePermission({
    userId:
      input.actorUserId,

    permission:
      PERMISSIONS.USER_SECURITY_MANAGE,
  })

  await requireSecurityTarget(
    input.targetUserId,
  )

  const now =
    input.now ??
    new Date()

  const count = await db.$transaction(async tx => {
    const changed=await tx.session.updateMany({where:{userId:input.targetUserId,revokedAt:null},
      data:{revokedAt:now,revocationReason:SessionRevocationReason.ADMIN_REVOKED}})
    await tx.auditEvent.create({data:{
      actorUserId:input.actorUserId,action:"USER_SESSIONS_REVOKED",resourceType:"USER",
      resourceId:input.targetUserId,outcome:AuditOutcome.SUCCESS,
      sessionId:input.actorSessionId??null,metadata:{revokedSessions:changed.count},occurredAt:now,
    }})
    return changed.count
  })

  return {
    revokedSessions:
      count,
  }
}

export async function resetAdminUserMfa(
  input: {
    actorUserId: string
    actorSessionId?: string | null
    targetUserId: string
    reason?: string | null
    now?: Date
  },
) {
  await requirePermission({
    userId:
      input.actorUserId,

    permission:
      PERMISSIONS.MFA_RESET,
  })

  await requireSecurityTarget(
    input.targetUserId,
  )

  return resetMfaForUser({
    userId:
      input.targetUserId,

    actorUserId:
      input.actorUserId,

    reason:
      input.reason,

    sessionId:
      input.actorSessionId,

    now:
      input.now,
  })
}
