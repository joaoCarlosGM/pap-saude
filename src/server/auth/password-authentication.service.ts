import {
  PasswordAlgorithm,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "./password";

import {
  InactiveUserError,
  InvalidCredentialsError,
  PasswordChangeRequiredError,
} from "./auth.errors";

import {
  createSession,
} from "./session.service";

import type {
  PasswordAuthenticationInput,
  PasswordAuthenticationResult,
} from "./auth.types";

const DUMMY_PASSWORD =
  "PAP-Saude-Dummy-Credential-Only-For-Timing-Defense";

let dummyHashPromise: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(DUMMY_PASSWORD);
  return dummyHashPromise;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface UpgradePasswordHashInput {
  userId: string;
  currentHash: string;
  password: string;
}

export async function upgradePasswordHashIfCurrent(
  input: UpgradePasswordHashInput,
): Promise<boolean> {
  if (!passwordNeedsRehash(input.currentHash)) {
    return false;
  }

  const rehashedPassword =
    await hashPassword(input.password);

  const result =
    await db.passwordCredential.updateMany({
      where: {
        userId: input.userId,
        passwordHash: input.currentHash,
      },
      data: {
        passwordHash: rehashedPassword,
        algorithm: PasswordAlgorithm.ARGON2ID,
      },
    });

  return result.count === 1;
}

export async function authenticateWithPassword(
  input: PasswordAuthenticationInput,
): Promise<PasswordAuthenticationResult> {
  const normalizedEmail = normalizeEmail(input.email ?? "");
  const suppliedPassword = input.password ?? "";

  if (!normalizedEmail || !suppliedPassword) {
    const dummyHash = await getDummyPasswordHash();

    await verifyPassword(
      dummyHash,
      suppliedPassword || DUMMY_PASSWORD,
    );

    throw new InvalidCredentialsError();
  }

  const user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      passwordCredential: true,
    },
  });

  const credential = user?.passwordCredential;

  const hashToVerify =
    credential?.passwordHash ??
    await getDummyPasswordHash();

  const passwordMatches = await verifyPassword(
    hashToVerify,
    suppliedPassword,
  );

  if (
    !user ||
    !credential ||
    !passwordMatches
  ) {
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new InactiveUserError();
  }

  if (credential.mustChange) {
    throw new PasswordChangeRequiredError();
  }

  await upgradePasswordHashIfCurrent({
    userId: user.id,
    currentHash: credential.passwordHash,
    password: suppliedPassword,
  });

  const createdSession = await createSession({
    userId: user.id,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    now: input.now,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
    },
    session: {
      id: createdSession.session.id,
      userId: createdSession.session.userId,
      createdAt: createdSession.session.createdAt,
      expiresAt: createdSession.session.expiresAt,
      lastSeenAt: createdSession.session.lastSeenAt,
    },
    sessionToken: createdSession.token,
  };
}
