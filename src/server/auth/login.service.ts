import {
  InactiveUserError,
  InvalidCredentialsError,
  LoginThrottledError,
  PasswordChangeRequiredError,
} from "./auth.errors";

import {
  verifyPasswordCredentials,
} from "./password-authentication.service";

import {
  createLoginProtectionHashes,
  evaluateLoginThrottle,
  recordCredentialAcceptedButDenied,
  recordLoginFailure,
  recordLoginSuccess,
  recordLoginThrottle,
} from "./login-abuse.service";

import {
  createMfaChallenge,
  hasActiveTotpFactor,
} from "./mfa-challenge.service";

import {
  createSession,
} from "./session.service";

import type {
  LoginAuthenticationResult,
} from "./auth.types";

export interface ProtectedLoginInput {
  email: string;
  password: string;
  origin: string;
  userAgent?: string | null;
  now?: Date;
}

export async function authenticateLogin(
  input: ProtectedLoginInput,
): Promise<LoginAuthenticationResult> {
  const now =
    input.now ?? new Date();

  const context = {
    email:
      input.email,
    origin:
      input.origin,
    userAgent:
      input.userAgent,
  };

  const hashes =
    createLoginProtectionHashes(
      context,
    );

  const throttle =
    await evaluateLoginThrottle(
      hashes,
      now,
    );

  if (!throttle.allowed) {
    await recordLoginThrottle(
      context,
      throttle,
      now,
    );

    throw new LoginThrottledError();
  }

  try {
    const verified =
      await verifyPasswordCredentials({
        email:
          input.email,
        password:
          input.password,
        ipHash:
          hashes.originHash,
        userAgent:
          input.userAgent,
        now,
      });

    const requiresMfa =
      await hasActiveTotpFactor(
        verified.user.id,
      );

    /*
     * A correct primary credential resets the effective
     * credential-failure history, even when a second factor
     * is still required.
     */
    await recordLoginSuccess(
      context,
      verified.user.id,
      now,
    );

    if (requiresMfa) {
      const challenge =
        await createMfaChallenge({
          userId:
            verified.user.id,
          ipHash:
            hashes.originHash,
          userAgent:
            input.userAgent,
          now,
        });

      return {
        status:
          "MFA_REQUIRED",
        user:
          verified.user,
        challengeToken:
          challenge.token,
        challengeExpiresAt:
          challenge.expiresAt,
      };
    }

    const createdSession =
      await createSession({
        userId:
          verified.user.id,
        ipHash:
          hashes.originHash,
        userAgent:
          input.userAgent,
        now,
      });

    return {
      status:
        "AUTHENTICATED",
      user:
        verified.user,
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
  } catch (error) {
    if (
      error instanceof
      InvalidCredentialsError
    ) {
      await recordLoginFailure(
        context,
        now,
      );

      throw error;
    }

    if (
      error instanceof
      InactiveUserError
    ) {
      await recordCredentialAcceptedButDenied(
        context,
        "USER_INACTIVE",
        now,
      );

      throw error;
    }

    if (
      error instanceof
      PasswordChangeRequiredError
    ) {
      await recordCredentialAcceptedButDenied(
        context,
        "PASSWORD_CHANGE_REQUIRED",
        now,
      );

      throw error;
    }

    throw error;
  }
}
