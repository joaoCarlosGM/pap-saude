import { db } from "@/server/db/client";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";

export const FIRST_ACCESS_KEY = "security-first-access";
export class FirstAccessError extends Error {}
const key = (userId: string) => ({
  userId,
  tourKey: FIRST_ACCESS_KEY,
  tourVersion: 1,
});

export async function firstAccessState(userId: string, sessionId: string) {
  const [profile, progress, session, factor] = await Promise.all([
    getEffectiveAccessProfile(userId),
    db.userOnboardingProgress.findUnique({
      where: { userId_tourKey_tourVersion: key(userId) },
    }),
    db.session.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { mfaVerifiedAt: true, createdAt: true },
    }),
    db.mfaFactor.findFirst({
      where: { userId, type: "TOTP", status: "ACTIVE" },
      select: { enabledAt: true },
    }),
  ]);
  const verified = !!(
    session?.mfaVerifiedAt &&
    factor?.enabledAt &&
    session.mfaVerifiedAt >= factor.enabledAt &&
    session.mfaVerifiedAt >= session.createdAt &&
    session.mfaVerifiedAt <= new Date()
  );
  return {
    profile,
    progress,
    mfaRequired: !!profile?.canAccessAdmin,
    verified,
    active: !!factor,
  };
}

// Progress is user-scoped metadata, never an authorization grant. Monotonic steps
// prevent a stale tab from reopening completed onboarding or losing recovery ACK.
export async function advanceFirstAccess(
  userId: string,
  step: number,
  status: "STARTED" | "SKIPPED" | "COMPLETED" = "STARTED",
  sessionId?: string,
) {
  const where = key(userId);
  const dates = {
    completedAt: status === "COMPLETED" ? new Date() : null,
    skippedAt: status === "SKIPPED" ? new Date() : null,
  };
  await db.$transaction(async (tx) => {
    await tx.userOnboardingProgress.upsert({
      where: { userId_tourKey_tourVersion: where },
      create: { ...where, currentStep: step, status, ...dates },
      update: {},
    });
    await tx.userOnboardingProgress.updateMany({
      where: {
        ...where,
        status: { not: "COMPLETED" },
        currentStep: { lte: step },
      },
      data: { currentStep: step, status, ...dates },
    });
    if (sessionId)
      await tx.auditEvent.create({
        data: {
          actorUserId: userId,
          sessionId,
          action: "SECURITY_ONBOARDING_UPDATED",
          resourceType: "USER",
          resourceId: userId,
        },
      });
  });
}

export async function runFirstAccessAction(
  userId: string,
  sessionId: string,
  action: string,
  step?: number,
) {
  const state = await firstAccessState(userId, sessionId);
  if (action === "ONBOARDING_STEP" || action === "PAUSE_ONBOARDING") {
    if (!Number.isInteger(step) || step! < 0 || step! > 4)
      throw new FirstAccessError("INVALID_STEP");
    await advanceFirstAccess(
      userId,
      step!,
      action === "PAUSE_ONBOARDING" ? "SKIPPED" : "STARTED",
      sessionId,
    );
  } else if (action === "ACK_RECOVERY") {
    if (
      !state.active ||
      !(await db.mfaRecoveryCode.count({
        where: { userId, usedAt: null, revokedAt: null },
      }))
    )
      throw new FirstAccessError("RECOVERY_REQUIRED");
    await advanceFirstAccess(userId, 6, "STARTED", sessionId);
  } else if (action === "COMPLETE_ONBOARDING") {
    if (
      !state.active ||
      !state.verified ||
      (state.progress?.currentStep ?? 0) < 6
    )
      throw new FirstAccessError("MFA_LOGIN_REQUIRED");
    await advanceFirstAccess(userId, 7, "COMPLETED", sessionId);
  } else if (action === "DEFER_OPTIONAL_MFA") {
    if (state.mfaRequired || state.active)
      throw new FirstAccessError("MFA_REQUIRED");
    await advanceFirstAccess(userId, 7, "COMPLETED", sessionId);
  } else throw new FirstAccessError("INVALID_ACTION");
  return { ok: true };
}
