import {
  createSession,
} from "./session.service";

import {
  consumeMfaChallenge,
  loadMfaChallenge,
} from "./mfa-challenge.service";

import {
  verifyActiveTotp,
} from "./totp-login.service";

import {
  ConsumedMfaChallengeError,
} from "./mfa.errors";

export interface CompleteMfaLoginInput {
  challengeToken: string;
  code: string;
  now?: Date;
}

export async function completeMfaLogin(
  input: CompleteMfaLoginInput,
) {
  const now =
    input.now ?? new Date();

  const challenge =
    await loadMfaChallenge(
      input.challengeToken,
      now,
    );

  await verifyActiveTotp(
    challenge.userId,
    input.code,
    now,
  );

  /*
   * Atomic compare-and-set on consumedAt.
   *
   * Only one concurrent request can consume a challenge.
   */
  const consumed =
    await consumeMfaChallenge(
      challenge.id,
      now,
    );

  if (!consumed) {
    throw new ConsumedMfaChallengeError();
  }

  /*
   * The challenge is intentionally consumed BEFORE session creation.
   * If session persistence fails, authentication fails closed and the
   * user must restart login rather than risk challenge replay.
   */
  const createdSession =
    await createSession({
      userId:
        challenge.userId,
      ipHash:
        challenge.ipHash,
      userAgent:
        challenge.userAgent,
      now,
    });

  return {
    user: {
      id:
        challenge.user.id,
      email:
        challenge.user.email,
      displayName:
        challenge.user.displayName,
      isActive:
        challenge.user.isActive,
    },
    session: {
      id:
        createdSession.session.id,
      userId:
        createdSession.session.userId,
      createdAt:
        createdSession.session.createdAt,
      expiresAt:
        createdSession.session.expiresAt,
      lastSeenAt:
        createdSession.session.lastSeenAt,
    },
    sessionToken:
      createdSession.token,
  };
}
