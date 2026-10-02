import {
  MfaFactorStatus,
  MfaFactorType,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  generateSecureToken,
  sha256,
} from "@/server/security/crypto";

import {
  MFA_CHALLENGE_TOKEN_BYTES,
  MFA_CHALLENGE_TTL_SECONDS,
} from "@/server/security/constants";

import {
  ConsumedMfaChallengeError,
  ExpiredMfaChallengeError,
  InvalidMfaChallengeError,
} from "./mfa.errors";

export interface CreateMfaChallengeInput {
  userId: string;
  ipHash?: string | null;
  userAgent?: string | null;
  now?: Date;
}

export interface CreatedMfaChallenge {
  token: string;
  expiresAt: Date;
}

function addSeconds(
  date: Date,
  seconds: number,
): Date {
  return new Date(
    date.getTime() +
    seconds * 1000,
  );
}

export async function hasActiveTotpFactor(
  userId: string,
): Promise<boolean> {
  const factor =
    await db.mfaFactor.findFirst({
      where: {
        userId,
        type:
          MfaFactorType.TOTP,
        status:
          MfaFactorStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

  return factor !== null;
}

export async function createMfaChallenge(
  input: CreateMfaChallengeInput,
): Promise<CreatedMfaChallenge> {
  const now =
    input.now ?? new Date();

  const hasFactor =
    await hasActiveTotpFactor(
      input.userId,
    );

  if (!hasFactor) {
    throw new InvalidMfaChallengeError();
  }

  const token =
    generateSecureToken(
      MFA_CHALLENGE_TOKEN_BYTES,
    );

  const expiresAt =
    addSeconds(
      now,
      MFA_CHALLENGE_TTL_SECONDS,
    );

  await db.mfaChallenge.create({
    data: {
      userId:
        input.userId,
      tokenHash:
        sha256(token),
      createdAt:
        now,
      expiresAt,
      ipHash:
        input.ipHash ?? null,
      userAgent:
        input.userAgent ?? null,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function loadMfaChallenge(
  token: string,
  now = new Date(),
) {
  if (!token) {
    throw new InvalidMfaChallengeError();
  }

  const challenge =
    await db.mfaChallenge.findUnique({
      where: {
        tokenHash:
          sha256(token),
      },
      include: {
        user: true,
      },
    });

  if (!challenge) {
    throw new InvalidMfaChallengeError();
  }

  if (
    challenge.consumedAt !== null
  ) {
    throw new ConsumedMfaChallengeError();
  }

  if (
    challenge.revokedAt !== null
  ) {
    throw new InvalidMfaChallengeError();
  }

  if (
    challenge.expiresAt.getTime()
    <= now.getTime()
  ) {
    throw new ExpiredMfaChallengeError();
  }

  if (!challenge.user.isActive) {
    throw new InvalidMfaChallengeError();
  }

  return challenge;
}

export async function consumeMfaChallenge(
  challengeId: string,
  now = new Date(),
): Promise<boolean> {
  const result =
    await db.mfaChallenge.updateMany({
      where: {
        id:
          challengeId,
        consumedAt:
          null,
        revokedAt:
          null,
        expiresAt: {
          gt:
            now,
        },
      },
      data: {
        consumedAt:
          now,
      },
    });

  return result.count === 1;
}

export async function deleteExpiredMfaChallenges(
  now = new Date(),
): Promise<number> {
  const result =
    await db.mfaChallenge.deleteMany({
      where: {
        expiresAt: {
          lte:
            now,
        },
      },
    });

  return result.count;
}
