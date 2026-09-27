import * as OTPAuth from "otpauth";

import {
  MfaFactorStatus,
  MfaFactorType,
  type MfaFactor,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  MFA_ENROLLMENT_TTL_SECONDS,
  MFA_TOTP_ALGORITHM,
  MFA_TOTP_DIGITS,
  MFA_TOTP_ISSUER,
  MFA_TOTP_PERIOD_SECONDS,
  MFA_TOTP_SECRET_BYTES,
  MFA_TOTP_WINDOW,
} from "@/server/security/constants";

import {
  decryptSecret,
  encryptSecret,
} from "@/server/security/secret-encryption";

import {
  InvalidTotpCodeError,
  MfaEnrollmentExpiredError,
  MfaFactorUnavailableError,
  MfaUserUnavailableError,
} from "./mfa.errors";

export interface StartTotpEnrollmentInput {
  userId: string;
  label?: string | null;
  now?: Date;
}

export interface TotpEnrollment {
  factorId: string;
  secret: string;
  provisioningUri: string;
  expiresAt: Date;
}

export interface ConfirmTotpEnrollmentInput {
  userId: string;
  factorId: string;
  code: string;
  now?: Date;
}

export interface ConfirmedTotpEnrollment {
  factorId: string;
  status: MfaFactorStatus;
  enabledAt: Date;
}

function addSeconds(
  date: Date,
  seconds: number,
): Date {
  return new Date(
    date.getTime() + seconds * 1000,
  );
}

function createTotp(
  secret: string | OTPAuth.Secret,
  label: string,
): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: MFA_TOTP_ISSUER,
    label,
    algorithm: MFA_TOTP_ALGORITHM,
    digits: MFA_TOTP_DIGITS,
    period: MFA_TOTP_PERIOD_SECONDS,
    secret,
  });
}

function normalizeTotpCode(
  code: string,
): string {
  const normalized =
    code.trim();

  if (
    !new RegExp(
      `^\\d{${MFA_TOTP_DIGITS}}$`,
    ).test(normalized)
  ) {
    throw new InvalidTotpCodeError();
  }

  return normalized;
}

export async function startTotpEnrollment(
  input: StartTotpEnrollmentInput,
): Promise<TotpEnrollment> {
  const now =
    input.now ?? new Date();

  const user =
    await db.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
      },
    });

  if (
    !user ||
    !user.isActive
  ) {
    throw new MfaUserUnavailableError();
  }

  const requestedLabel =
    input.label?.trim();

  const label =
    requestedLabel ||
    user.email;

  const secret =
    new OTPAuth.Secret({
      size: MFA_TOTP_SECRET_BYTES,
    });

  const secretBase32 =
    secret.base32;

  const encryptedSecret =
    encryptSecret(secretBase32);

  const totp =
    createTotp(
      secret,
      label,
    );

  const factor =
    await db.$transaction(
      async (tx) => {
        await tx.mfaFactor.updateMany({
          where: {
            userId: user.id,
            type: MfaFactorType.TOTP,
            status:
              MfaFactorStatus.PENDING,
          },
          data: {
            status:
              MfaFactorStatus.REVOKED,
            revokedAt: now,
          },
        });

        return tx.mfaFactor.create({
          data: {
            userId: user.id,
            type: MfaFactorType.TOTP,
            status:
              MfaFactorStatus.PENDING,
            secretEncrypted:
              encryptedSecret,
            label,
            createdAt: now,
          },
        });
      },
    );

  return {
    factorId: factor.id,
    secret: secretBase32,
    provisioningUri:
      totp.toString(),
    expiresAt:
      addSeconds(
        now,
        MFA_ENROLLMENT_TTL_SECONDS,
      ),
  };
}

async function expireFactor(
  factor: MfaFactor,
  now: Date,
): Promise<void> {
  await db.mfaFactor.updateMany({
    where: {
      id: factor.id,
      userId: factor.userId,
      status:
        MfaFactorStatus.PENDING,
    },
    data: {
      status:
        MfaFactorStatus.REVOKED,
      revokedAt: now,
    },
  });
}

export async function confirmTotpEnrollment(
  input: ConfirmTotpEnrollmentInput,
): Promise<ConfirmedTotpEnrollment> {
  const now =
    input.now ?? new Date();

  const code =
    normalizeTotpCode(
      input.code,
    );

  const factor =
    await db.mfaFactor.findFirst({
      where: {
        id: input.factorId,
        userId: input.userId,
        type: MfaFactorType.TOTP,
        status:
          MfaFactorStatus.PENDING,
      },
    });

  if (!factor) {
    throw new MfaFactorUnavailableError();
  }

  const expiresAt =
    addSeconds(
      factor.createdAt,
      MFA_ENROLLMENT_TTL_SECONDS,
    );

  if (
    now.getTime() >=
    expiresAt.getTime()
  ) {
    await expireFactor(
      factor,
      now,
    );

    throw new MfaEnrollmentExpiredError();
  }

  const secret =
    decryptSecret(
      factor.secretEncrypted,
    );

  const totp =
    createTotp(
      secret,
      factor.label ??
        "PAP Saúde",
    );

  const delta =
    totp.validate({
      token: code,
      timestamp:
        now.getTime(),
      window:
        MFA_TOTP_WINDOW,
    });

  if (delta === null) {
    throw new InvalidTotpCodeError();
  }

  const activated =
    await db.$transaction(
      async (tx) => {
        /*
         * PostgreSQL's partial unique index permits one ACTIVE
         * TOTP per user. Revoke the old factor first, then
         * promote the pending factor inside one transaction.
         */
        await tx.mfaFactor.updateMany({
          where: {
            userId:
              input.userId,
            type:
              MfaFactorType.TOTP,
            status:
              MfaFactorStatus.ACTIVE,
          },
          data: {
            status:
              MfaFactorStatus.REVOKED,
            revokedAt:
              now,
          },
        });

        const result =
          await tx.mfaFactor.updateMany({
            where: {
              id:
                input.factorId,
              userId:
                input.userId,
              type:
                MfaFactorType.TOTP,
              status:
                MfaFactorStatus.PENDING,
            },
            data: {
              status:
                MfaFactorStatus.ACTIVE,
              enabledAt:
                now,
            },
          });

        if (result.count !== 1) {
          throw new MfaFactorUnavailableError();
        }

        return tx.mfaFactor.findUniqueOrThrow({
          where: {
            id:
              input.factorId,
          },
        });
      },
    );

  if (!activated.enabledAt) {
    throw new MfaFactorUnavailableError();
  }

  return {
    factorId:
      activated.id,
    status:
      activated.status,
    enabledAt:
      activated.enabledAt,
  };
}

export async function revokeExpiredPendingTotpEnrollments(
  now = new Date(),
): Promise<number> {
  const cutoff =
    addSeconds(
      now,
      -MFA_ENROLLMENT_TTL_SECONDS,
    );

  const result =
    await db.mfaFactor.updateMany({
      where: {
        type:
          MfaFactorType.TOTP,
        status:
          MfaFactorStatus.PENDING,
        createdAt: {
          lte: cutoff,
        },
      },
      data: {
        status:
          MfaFactorStatus.REVOKED,
        revokedAt:
          now,
      },
    });

  return result.count;
}
