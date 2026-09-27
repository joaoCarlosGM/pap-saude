import * as OTPAuth from "otpauth";

import {
  MfaFactorStatus,
  MfaFactorType,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  MFA_TOTP_ALGORITHM,
  MFA_TOTP_DIGITS,
  MFA_TOTP_ISSUER,
  MFA_TOTP_PERIOD_SECONDS,
  MFA_TOTP_WINDOW,
} from "@/server/security/constants";

import {
  decryptSecret,
} from "@/server/security/secret-encryption";

import {
  InvalidTotpCodeError,
  MfaFactorUnavailableError,
  TotpReplayError,
} from "./mfa.errors";

function normalizeCode(
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

export async function verifyActiveTotp(
  userId: string,
  code: string,
  now = new Date(),
): Promise<void> {
  const normalized =
    normalizeCode(code);

  const factor =
    await db.mfaFactor.findFirst({
      where: {
        userId,
        type:
          MfaFactorType.TOTP,
        status:
          MfaFactorStatus.ACTIVE,
      },
    });

  if (!factor) {
    throw new MfaFactorUnavailableError();
  }

  const secret =
    decryptSecret(
      factor.secretEncrypted,
    );

  const totp =
    new OTPAuth.TOTP({
      issuer:
        MFA_TOTP_ISSUER,
      label:
        factor.label ??
        "PAP Saúde",
      algorithm:
        MFA_TOTP_ALGORITHM,
      digits:
        MFA_TOTP_DIGITS,
      period:
        MFA_TOTP_PERIOD_SECONDS,
      secret,
    });

  const delta =
    totp.validate({
      token:
        normalized,
      timestamp:
        now.getTime(),
      window:
        MFA_TOTP_WINDOW,
    });

  if (delta === null) {
    throw new InvalidTotpCodeError();
  }

  const currentCounter =
    Math.floor(
      now.getTime() /
      1000 /
      MFA_TOTP_PERIOD_SECONDS,
    );

  const matchedCounter =
    currentCounter + delta;

  const matchedPeriod =
    new Date(
      matchedCounter *
      MFA_TOTP_PERIOD_SECONDS *
      1000,
    );

  const updated =
    await db.mfaFactor.updateMany({
      where: {
        id:
          factor.id,
        userId,
        status:
          MfaFactorStatus.ACTIVE,
        OR: [
          {
            lastUsedAt:
              null,
          },
          {
            lastUsedAt: {
              lt:
                matchedPeriod,
            },
          },
        ],
      },
      data: {
        /*
         * Store the accepted TOTP time-step, not wall-clock
         * verification time. This prevents reuse of the same
         * TOTP code.
         */
        lastUsedAt:
          matchedPeriod,
      },
    });

  if (updated.count !== 1) {
    throw new TotpReplayError();
  }
}
