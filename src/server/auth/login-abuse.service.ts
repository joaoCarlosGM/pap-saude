import {
  AuditOutcome,
  LoginAttemptOutcome,
  Prisma,
} from "@prisma/client";

import { db } from "@/server/db/client";
import {
  LOGIN_FAILURE_WINDOW_SECONDS,
  LOGIN_ORIGIN_BLOCK_SECONDS,
  LOGIN_ORIGIN_DISTINCT_IDENTITY_LIMIT,
} from "@/server/security/constants";
import { sha256 } from "@/server/security/crypto";

import { normalizeEmail } from "./password-authentication.service";

export type LoginThrottleScope =
  | "PAIR_BACKOFF"
  | "ORIGIN_STUFFING";

export interface LoginProtectionContext {
  email: string;
  origin: string;
  userAgent?: string | null;
}

export interface LoginProtectionHashes {
  identityHash: string;
  originHash: string;
}

export interface LoginThrottleDecision {
  allowed: boolean;
  scope?: LoginThrottleScope;
  blockedUntil?: Date;
  pairFailures: number;
  originDistinctIdentities: number;
}

function subtractSeconds(
  date: Date,
  seconds: number,
): Date {
  return new Date(
    date.getTime() - seconds * 1000,
  );
}

function addSeconds(
  date: Date,
  seconds: number,
): Date {
  return new Date(
    date.getTime() + seconds * 1000,
  );
}

function pairBackoffSeconds(
  failures: number,
): number {
  if (failures < 4) {
    return 0;
  }

  if (failures === 4) {
    return 30;
  }

  if (failures === 5) {
    return 60;
  }

  if (failures === 6) {
    return 120;
  }

  if (failures === 7) {
    return 300;
  }

  return 600;
}

export function hashLoginIdentity(
  email: string,
): string {
  return sha256(
    normalizeEmail(email),
  );
}

export function hashLoginOrigin(
  origin: string,
): string {
  const normalized = origin.trim();

  if (!normalized) {
    throw new Error(
      "Login origin is required",
    );
  }

  return sha256(normalized);
}

export function createLoginProtectionHashes(
  context: LoginProtectionContext,
): LoginProtectionHashes {
  return {
    identityHash:
      hashLoginIdentity(context.email),
    originHash:
      hashLoginOrigin(context.origin),
  };
}

export async function evaluateLoginThrottle(
  hashes: LoginProtectionHashes,
  now = new Date(),
): Promise<LoginThrottleDecision> {
  const windowStart = subtractSeconds(
    now,
    LOGIN_FAILURE_WINDOW_SECONDS,
  );

  const lastSuccess =
    await db.loginAttempt.findFirst({
      where: {
        identityHash: hashes.identityHash,
        originHash: hashes.originHash,
        outcome: LoginAttemptOutcome.SUCCESS,
        occurredAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

  const effectivePairStart =
    lastSuccess &&
    lastSuccess.occurredAt > windowStart
      ? lastSuccess.occurredAt
      : windowStart;

  const [
    pairFailures,
    lastPairFailure,
    distinctOriginIdentities,
    lastOriginFailure,
  ] = await Promise.all([
    db.loginAttempt.count({
      where: {
        identityHash:
          hashes.identityHash,
        originHash:
          hashes.originHash,
        outcome:
          LoginAttemptOutcome.FAILURE,
        occurredAt: {
          gt: effectivePairStart,
          lte: now,
        },
      },
    }),

    db.loginAttempt.findFirst({
      where: {
        identityHash:
          hashes.identityHash,
        originHash:
          hashes.originHash,
        outcome:
          LoginAttemptOutcome.FAILURE,
        occurredAt: {
          gt: effectivePairStart,
          lte: now,
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
    }),

    db.loginAttempt.findMany({
      where: {
        originHash:
          hashes.originHash,
        outcome:
          LoginAttemptOutcome.FAILURE,
        occurredAt: {
          gte: windowStart,
          lte: now,
        },
      },
      distinct: [
        "identityHash",
      ],
      select: {
        identityHash: true,
      },
    }),

    db.loginAttempt.findFirst({
      where: {
        originHash:
          hashes.originHash,
        outcome:
          LoginAttemptOutcome.FAILURE,
        occurredAt: {
          gte: windowStart,
          lte: now,
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
    }),
  ]);

  const originDistinctIdentities =
    distinctOriginIdentities.length;

  if (
    originDistinctIdentities >=
      LOGIN_ORIGIN_DISTINCT_IDENTITY_LIMIT &&
    lastOriginFailure
  ) {
    const blockedUntil = addSeconds(
      lastOriginFailure.occurredAt,
      LOGIN_ORIGIN_BLOCK_SECONDS,
    );

    if (blockedUntil > now) {
      return {
        allowed: false,
        scope: "ORIGIN_STUFFING",
        blockedUntil,
        pairFailures,
        originDistinctIdentities,
      };
    }
  }

  const backoffSeconds =
    pairBackoffSeconds(pairFailures);

  if (
    backoffSeconds > 0 &&
    lastPairFailure
  ) {
    const blockedUntil = addSeconds(
      lastPairFailure.occurredAt,
      backoffSeconds,
    );

    if (blockedUntil > now) {
      return {
        allowed: false,
        scope: "PAIR_BACKOFF",
        blockedUntil,
        pairFailures,
        originDistinctIdentities,
      };
    }
  }

  return {
    allowed: true,
    pairFailures,
    originDistinctIdentities,
  };
}

async function writeAttemptAndAudit(input: {
  identityHash: string;
  originHash: string;
  outcome: LoginAttemptOutcome;
  auditAction: string;
  auditOutcome: AuditOutcome;
  reason?: string;
  actorUserId?: string;
  userAgent?: string | null;
  occurredAt: Date;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.$transaction([
    db.loginAttempt.create({
      data: {
        identityHash:
          input.identityHash,
        originHash:
          input.originHash,
        outcome:
          input.outcome,
        occurredAt:
          input.occurredAt,
      },
    }),

    db.auditEvent.create({
      data: {
        actorUserId:
          input.actorUserId,
        action:
          input.auditAction,
        resourceType:
          "AUTHENTICATION",
        resourceId:
          input.identityHash,
        outcome:
          input.auditOutcome,
        reason:
          input.reason,
        ipHash:
          input.originHash,
        userAgent:
          input.userAgent ?? null,
        metadata:
          input.metadata,
        occurredAt:
          input.occurredAt,
      },
    }),
  ]);
}

export async function recordLoginFailure(
  context: LoginProtectionContext,
  now = new Date(),
): Promise<void> {
  const hashes =
    createLoginProtectionHashes(context);

  await writeAttemptAndAudit({
    ...hashes,
    outcome:
      LoginAttemptOutcome.FAILURE,
    auditAction:
      "LOGIN_FAILED",
    auditOutcome:
      AuditOutcome.FAILURE,
    reason:
      "INVALID_CREDENTIALS",
    userAgent:
      context.userAgent,
    occurredAt:
      now,
  });
}

export async function recordLoginThrottle(
  context: LoginProtectionContext,
  decision: LoginThrottleDecision,
  now = new Date(),
): Promise<void> {
  const hashes =
    createLoginProtectionHashes(context);

  await writeAttemptAndAudit({
    ...hashes,
    outcome:
      LoginAttemptOutcome.THROTTLED,
    auditAction:
      "LOGIN_THROTTLED",
    auditOutcome:
      AuditOutcome.FAILURE,
    reason:
      decision.scope,
    userAgent:
      context.userAgent,
    occurredAt:
      now,
    metadata: {
      pairFailures:
        decision.pairFailures,
      originDistinctIdentities:
        decision.originDistinctIdentities,
      blockedUntil:
        decision.blockedUntil?.toISOString(),
    },
  });
}

export async function recordLoginSuccess(
  context: LoginProtectionContext,
  actorUserId: string,
  now = new Date(),
): Promise<void> {
  const hashes =
    createLoginProtectionHashes(context);

  await writeAttemptAndAudit({
    ...hashes,
    outcome:
      LoginAttemptOutcome.SUCCESS,
    auditAction:
      "LOGIN_SUCCEEDED",
    auditOutcome:
      AuditOutcome.SUCCESS,
    actorUserId,
    userAgent:
      context.userAgent,
    occurredAt:
      now,
  });
}

export async function recordCredentialAcceptedButDenied(
  context: LoginProtectionContext,
  reason: string,
  now = new Date(),
): Promise<void> {
  const hashes =
    createLoginProtectionHashes(context);

  await writeAttemptAndAudit({
    ...hashes,
    outcome:
      LoginAttemptOutcome.SUCCESS,
    auditAction:
      "LOGIN_DENIED",
    auditOutcome:
      AuditOutcome.FAILURE,
    reason,
    userAgent:
      context.userAgent,
    occurredAt:
      now,
  });
}
