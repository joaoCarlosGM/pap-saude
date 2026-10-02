import {
  SessionRevocationReason,
  type Session,
  type User,
} from "@prisma/client";

import { db } from "@/server/db/client";
import {
  SESSION_LAST_SEEN_UPDATE_INTERVAL_SECONDS,
  SESSION_TTL_SECONDS,
} from "@/server/security/constants";
import { hashSessionToken } from "@/server/security/crypto";

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "./session.errors";
import { createSessionToken } from "./session-token";

export interface CreateSessionInput {
  userId: string;
  ipHash?: string | null;
  userAgent?: string | null;
  now?: Date;
}

export interface CreatedSession {
  token: string;
  session: Session;
}

export interface ValidatedSession {
  session: Session;
  user: User;
}

export interface ValidateSessionOptions {
  now?: Date;
  updateLastSeen?: boolean;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function shouldUpdateLastSeen(lastSeenAt: Date, now: Date): boolean {
  const intervalMs =
    SESSION_LAST_SEEN_UPDATE_INTERVAL_SECONDS * 1000;

  return now.getTime() - lastSeenAt.getTime() >= intervalMs;
}

export async function createSession(
  input: CreateSessionInput,
): Promise<CreatedSession> {
  const now = input.now ?? new Date();
  const { token, tokenHash } = createSessionToken();

  const session = await db.session.create({
    data: {
      userId: input.userId,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: addSeconds(now, SESSION_TTL_SECONDS),
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return { token, session };
}

export async function validateSession(
  token: string,
  options: ValidateSessionOptions = {},
): Promise<ValidatedSession> {
  if (!token) {
    throw new InvalidSessionError();
  }

  const now = options.now ?? new Date();

  const result = await db.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: true,
    },
  });

  if (!result) {
    throw new InvalidSessionError();
  }

  if (result.revokedAt !== null) {
    throw new RevokedSessionError();
  }

  if (result.expiresAt.getTime() <= now.getTime()) {
    throw new ExpiredSessionError();
  }

  if (!result.user.isActive) {
    throw new InactiveSessionUserError();
  }

  let session: Session = result;

  if (
    options.updateLastSeen !== false &&
    shouldUpdateLastSeen(result.lastSeenAt, now)
  ) {
    session = await db.session.update({
      where: {
        id: result.id,
      },
      data: {
        lastSeenAt: now,
      },
    });
  }

  return {
    session,
    user: result.user,
  };
}

export async function revokeSessionByToken(
  token: string,
  reason: SessionRevocationReason,
  now = new Date(),
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const result = await db.session.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: now,
      revocationReason: reason,
    },
  });

  return result.count > 0;
}

export async function revokeSessionById(
  sessionId: string,
  reason: SessionRevocationReason,
  now = new Date(),
): Promise<boolean> {
  const result = await db.session.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
      revocationReason: reason,
    },
  });

  return result.count > 0;
}

export async function revokeAllUserSessions(
  userId: string,
  reason: SessionRevocationReason,
  now = new Date(),
): Promise<number> {
  const result = await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
      revocationReason: reason,
    },
  });

  return result.count;
}

export async function deleteExpiredSessions(
  now = new Date(),
): Promise<number> {
  const result = await db.session.deleteMany({
    where: {
      expiresAt: {
        lte: now,
      },
    },
  });

  return result.count;
}
