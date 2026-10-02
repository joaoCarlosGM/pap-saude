import {
  randomBytes,
} from "node:crypto";

import { db } from "@/server/db/client";

import {
  MFA_RECOVERY_CODE_BYTES,
  MFA_RECOVERY_CODE_COUNT,
  MFA_RECOVERY_CODE_HASH_DOMAIN,
} from "@/server/security/constants";

import {
  sha256,
} from "@/server/security/crypto";

import {
  InvalidRecoveryCodeError,
  MfaUserUnavailableError,
} from "./mfa.errors";

export interface GeneratedRecoveryCodes {
  codes: string[];
  generatedAt: Date;
}

function normalizeRecoveryCode(
  code: string,
): string {
  const normalized =
    code
      .trim()
      .replace(/[\s-]/g, "")
      .toUpperCase();

  if (!/^[0-9A-F]{20}$/.test(normalized)) {
    throw new InvalidRecoveryCodeError();
  }

  return normalized;
}

function formatRecoveryCode(
  normalized: string,
): string {
  return normalized.match(/.{1,5}/g)?.join("-") ?? normalized;
}

export function hashRecoveryCode(
  code: string,
): string {
  const normalized =
    normalizeRecoveryCode(code);

  return sha256(
    `${MFA_RECOVERY_CODE_HASH_DOMAIN}:${normalized}`,
  );
}

export function generateRecoveryCode(): string {
  const raw =
    randomBytes(
      MFA_RECOVERY_CODE_BYTES,
    )
      .toString("hex")
      .toUpperCase();

  return formatRecoveryCode(raw);
}

export async function generateRecoveryCodes(
  userId: string,
  now = new Date(),
): Promise<GeneratedRecoveryCodes> {
  const user =
    await db.user.findUnique({
      where: {
        id:
          userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (
    !user ||
    !user.isActive
  ) {
    throw new MfaUserUnavailableError();
  }

  const codes =
    Array.from(
      {
        length:
          MFA_RECOVERY_CODE_COUNT,
      },
      () =>
        generateRecoveryCode(),
    );

  const hashes =
    codes.map(
      code =>
        hashRecoveryCode(code),
    );

  if (
    new Set(hashes).size !==
    MFA_RECOVERY_CODE_COUNT
  ) {
    /*
     * Cryptographically negligible, but fail closed instead
     * of issuing duplicate recovery credentials.
     */
    throw new Error(
      "Recovery code collision detected",
    );
  }

  await db.$transaction(
    async tx => {
      await tx.mfaRecoveryCode.updateMany({
        where: {
          userId,
          usedAt:
            null,
          revokedAt:
            null,
        },
        data: {
          revokedAt:
            now,
        },
      });

      await tx.mfaRecoveryCode.createMany({
        data:
          hashes.map(
            codeHash => ({
              userId,
              codeHash,
              createdAt:
                now,
            }),
          ),
      });
    },
  );

  return {
    codes,
    generatedAt:
      now,
  };
}

export async function consumeRecoveryCode(
  userId: string,
  code: string,
  now = new Date(),
): Promise<void> {
  const codeHash =
    hashRecoveryCode(code);

  const result =
    await db.mfaRecoveryCode.updateMany({
      where: {
        userId,
        codeHash,
        usedAt:
          null,
        revokedAt:
          null,
      },
      data: {
        usedAt:
          now,
      },
    });

  if (result.count !== 1) {
    throw new InvalidRecoveryCodeError();
  }
}

export async function revokeRecoveryCodes(
  userId: string,
  now = new Date(),
): Promise<number> {
  const result =
    await db.mfaRecoveryCode.updateMany({
      where: {
        userId,
        usedAt:
          null,
        revokedAt:
          null,
      },
      data: {
        revokedAt:
          now,
      },
    });

  return result.count;
}
