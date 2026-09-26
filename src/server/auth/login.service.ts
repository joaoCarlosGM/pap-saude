import {
  InactiveUserError,
  InvalidCredentialsError,
  LoginThrottledError,
  PasswordChangeRequiredError,
} from "./auth.errors";

import {
  authenticateWithPassword,
} from "./password-authentication.service";

import {
  createLoginProtectionHashes,
  evaluateLoginThrottle,
  recordCredentialAcceptedButDenied,
  recordLoginFailure,
  recordLoginSuccess,
  recordLoginThrottle,
} from "./login-abuse.service";

import type {
  PasswordAuthenticationResult,
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
): Promise<PasswordAuthenticationResult> {
  const now = input.now ?? new Date();

  const context = {
    email: input.email,
    origin: input.origin,
    userAgent:
      input.userAgent,
  };

  const hashes =
    createLoginProtectionHashes(context);

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
    const result =
      await authenticateWithPassword({
        email: input.email,
        password: input.password,
        ipHash:
          hashes.originHash,
        userAgent:
          input.userAgent,
        now,
      });

    await recordLoginSuccess(
      context,
      result.user.id,
      now,
    );

    return result;
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
