import argon2 from "argon2";

import {
  ARGON2_OPTIONS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/server/security/constants";

import { PasswordPolicyError } from "./auth.errors";

export function validatePasswordPolicy(password: string): void {
  if (typeof password !== "string") {
    throw new PasswordPolicyError("Password must be a string");
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new PasswordPolicyError(
      `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new PasswordPolicyError("Password is too long");
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordPolicy(password);

  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: ARGON2_OPTIONS.memoryCost,
    timeCost: ARGON2_OPTIONS.timeCost,
    parallelism: ARGON2_OPTIONS.parallelism,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (!hash || !password) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, {
      memoryCost: ARGON2_OPTIONS.memoryCost,
      timeCost: ARGON2_OPTIONS.timeCost,
      parallelism: ARGON2_OPTIONS.parallelism,
    });
  } catch {
    return true;
  }
}
