import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import * as OTPAuth from "otpauth";

import {
  MfaFactorStatus,
  MfaFactorType,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  confirmTotpEnrollment,
  revokeExpiredPendingTotpEnrollments,
  startTotpEnrollment,
} from "../../src/server/auth/totp.service";

import {
  InvalidTotpCodeError,
  MfaEnrollmentExpiredError,
  MfaFactorUnavailableError,
  MfaUserUnavailableError,
} from "../../src/server/auth/mfa.errors";

import {
  decryptSecret,
} from "../../src/server/security/secret-encryption";

import {
  MFA_ENROLLMENT_TTL_SECONDS,
  MFA_TOTP_ALGORITHM,
  MFA_TOTP_DIGITS,
  MFA_TOTP_ISSUER,
  MFA_TOTP_PERIOD_SECONDS,
} from "../../src/server/security/constants";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f03b";

const OTHER_USER_ID =
  "00000000-0000-4000-8000-00000000f13b";

const EMAIL =
  "foundation-f03b@papsaude.local";

const OTHER_EMAIL =
  "foundation-f03b-other@papsaude.local";

async function assertSafeDatabase(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ database: string }>
  >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures(): Promise<void> {
  await db.mfaFactor.deleteMany({
    where: {
      userId: {
        in: [
          USER_ID,
          OTHER_USER_ID,
        ],
      },
    },
  });

  await db.user.deleteMany({
    where: {
      id: {
        in: [
          USER_ID,
          OTHER_USER_ID,
        ],
      },
    },
  });
}

async function createUsers(): Promise<void> {
  await db.user.createMany({
    data: [
      {
        id: USER_ID,
        email: EMAIL,
        displayName:
          "Foundation F03B",
        isActive: true,
      },
      {
        id: OTHER_USER_ID,
        email: OTHER_EMAIL,
        displayName:
          "Foundation F03B Other",
        isActive: true,
      },
    ],
  });
}

function generateCode(
  secret: string,
  timestamp: Date,
): string {
  const totp =
    new OTPAuth.TOTP({
      issuer:
        MFA_TOTP_ISSUER,
      label:
        EMAIL,
      algorithm:
        MFA_TOTP_ALGORITHM,
      digits:
        MFA_TOTP_DIGITS,
      period:
        MFA_TOTP_PERIOD_SECONDS,
      secret,
    });

  return totp.generate({
    timestamp:
      timestamp.getTime(),
  });
}

before(async () => {
  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
  await createUsers();
});

after(async () => {
  await clearFixtures();
});

test(
  "start enrollment creates encrypted PENDING TOTP factor",
  async () => {
    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now,
      });

    const factor =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            enrollment.factorId,
        },
      });

    assert.equal(
      factor.status,
      MfaFactorStatus.PENDING,
    );

    assert.equal(
      factor.type,
      MfaFactorType.TOTP,
    );

    assert.notEqual(
      factor.secretEncrypted,
      enrollment.secret,
    );

    assert.equal(
      decryptSecret(
        factor.secretEncrypted,
      ),
      enrollment.secret,
    );

    assert.equal(
      enrollment.expiresAt.getTime(),
      now.getTime() +
        MFA_ENROLLMENT_TTL_SECONDS * 1000,
    );
  },
);

test(
  "provisioning URI contains PAP issuer and enrollment secret",
  async () => {
    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
      });

    assert.match(
      enrollment.provisioningUri,
      /^otpauth:\/\/totp\//,
    );

    const parsed =
      OTPAuth.URI.parse(
        enrollment.provisioningUri,
      );

    assert.ok(
      parsed instanceof
        OTPAuth.TOTP,
    );

    assert.equal(
      parsed.issuer,
      MFA_TOTP_ISSUER,
    );

    assert.equal(
      parsed.secret.base32,
      enrollment.secret,
    );
  },
);

test(
  "starting a new enrollment revokes previous pending factor",
  async () => {
    const firstAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const secondAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const first =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          firstAt,
      });

    const second =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          secondAt,
      });

    const oldFactor =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            first.factorId,
        },
      });

    const newFactor =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            second.factorId,
        },
      });

    assert.equal(
      oldFactor.status,
      MfaFactorStatus.REVOKED,
    );

    assert.equal(
      oldFactor.revokedAt?.getTime(),
      secondAt.getTime(),
    );

    assert.equal(
      newFactor.status,
      MfaFactorStatus.PENDING,
    );
  },
);

test(
  "valid TOTP code activates pending factor",
  async () => {
    const startedAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const confirmedAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          startedAt,
      });

    const code =
      generateCode(
        enrollment.secret,
        confirmedAt,
      );

    const confirmed =
      await confirmTotpEnrollment({
        userId:
          USER_ID,
        factorId:
          enrollment.factorId,
        code,
        now:
          confirmedAt,
      });

    assert.equal(
      confirmed.status,
      MfaFactorStatus.ACTIVE,
    );

    assert.equal(
      confirmed.enabledAt.getTime(),
      confirmedAt.getTime(),
    );

    const stored =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            enrollment.factorId,
        },
      });

    assert.equal(
      stored.status,
      MfaFactorStatus.ACTIVE,
    );

    assert.equal(
      decryptSecret(
        stored.secretEncrypted,
      ),
      enrollment.secret,
    );

    assert.notEqual(
      stored.secretEncrypted,
      enrollment.secret,
    );
  },
);

test(
  "invalid TOTP code does not activate factor",
  async () => {
    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now,
      });

    await assert.rejects(
      () =>
        confirmTotpEnrollment({
          userId:
            USER_ID,
          factorId:
            enrollment.factorId,
          code:
            "000000",
          now: new Date(
            "2030-01-01T12:01:00.000Z",
          ),
        }),
      InvalidTotpCodeError,
    );

    const stored =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            enrollment.factorId,
        },
      });

    assert.equal(
      stored.status,
      MfaFactorStatus.PENDING,
    );

    assert.equal(
      stored.enabledAt,
      null,
    );
  },
);

test(
  "expired enrollment is revoked and cannot be activated",
  async () => {
    const startedAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const expiredAt =
      new Date(
        startedAt.getTime() +
        MFA_ENROLLMENT_TTL_SECONDS * 1000,
      );

    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          startedAt,
      });

    const code =
      generateCode(
        enrollment.secret,
        expiredAt,
      );

    await assert.rejects(
      () =>
        confirmTotpEnrollment({
          userId:
            USER_ID,
          factorId:
            enrollment.factorId,
          code,
          now:
            expiredAt,
        }),
      MfaEnrollmentExpiredError,
    );

    const stored =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            enrollment.factorId,
        },
      });

    assert.equal(
      stored.status,
      MfaFactorStatus.REVOKED,
    );

    assert.equal(
      stored.revokedAt?.getTime(),
      expiredAt.getTime(),
    );
  },
);

test(
  "user cannot confirm another user's factor",
  async () => {
    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now,
      });

    const code =
      generateCode(
        enrollment.secret,
        now,
      );

    await assert.rejects(
      () =>
        confirmTotpEnrollment({
          userId:
            OTHER_USER_ID,
          factorId:
            enrollment.factorId,
          code,
          now,
        }),
      MfaFactorUnavailableError,
    );
  },
);

test(
  "activating replacement TOTP revokes previous active factor",
  async () => {
    const firstStart =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const firstConfirm =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const first =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          firstStart,
      });

    await confirmTotpEnrollment({
      userId:
        USER_ID,
      factorId:
        first.factorId,
      code:
        generateCode(
          first.secret,
          firstConfirm,
        ),
      now:
        firstConfirm,
    });

    const secondStart =
      new Date(
        "2030-01-01T12:02:00.000Z",
      );

    const secondConfirm =
      new Date(
        "2030-01-01T12:03:00.000Z",
      );

    const second =
      await startTotpEnrollment({
        userId:
          USER_ID,
        now:
          secondStart,
      });

    await confirmTotpEnrollment({
      userId:
        USER_ID,
      factorId:
        second.factorId,
      code:
        generateCode(
          second.secret,
          secondConfirm,
        ),
      now:
        secondConfirm,
    });

    const firstStored =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            first.factorId,
        },
      });

    const secondStored =
      await db.mfaFactor.findUniqueOrThrow({
        where: {
          id:
            second.factorId,
        },
      });

    assert.equal(
      firstStored.status,
      MfaFactorStatus.REVOKED,
    );

    assert.equal(
      firstStored.revokedAt?.getTime(),
      secondConfirm.getTime(),
    );

    assert.equal(
      secondStored.status,
      MfaFactorStatus.ACTIVE,
    );

    assert.equal(
      await db.mfaFactor.count({
        where: {
          userId:
            USER_ID,
          type:
            MfaFactorType.TOTP,
          status:
            MfaFactorStatus.ACTIVE,
        },
      }),
      1,
    );
  },
);

test(
  "invalid code format fails before activation",
  async () => {
    const enrollment =
      await startTotpEnrollment({
        userId:
          USER_ID,
      });

    await assert.rejects(
      () =>
        confirmTotpEnrollment({
          userId:
            USER_ID,
          factorId:
            enrollment.factorId,
          code:
            "12-ab",
        }),
      InvalidTotpCodeError,
    );
  },
);

test(
  "inactive user cannot start TOTP enrollment",
  async () => {
    await db.user.update({
      where: {
        id:
          USER_ID,
      },
      data: {
        isActive:
          false,
      },
    });

    await assert.rejects(
      () =>
        startTotpEnrollment({
          userId:
            USER_ID,
        }),
      MfaUserUnavailableError,
    );

    assert.equal(
      await db.mfaFactor.count({
        where: {
          userId:
            USER_ID,
        },
      }),
      0,
    );
  },
);

test(
  "expired pending enrollments can be cleaned in bulk",
  async () => {
    const oldTime =
      new Date(
        "2030-01-01T10:00:00.000Z",
      );

    await startTotpEnrollment({
      userId:
        USER_ID,
      now:
        oldTime,
    });

    const cleanupAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const count =
      await revokeExpiredPendingTotpEnrollments(
        cleanupAt,
      );

    assert.equal(
      count,
      1,
    );

    const factor =
      await db.mfaFactor.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.equal(
      factor.status,
      MfaFactorStatus.REVOKED,
    );

    assert.equal(
      factor.revokedAt?.getTime(),
      cleanupAt.getTime(),
    );
  },
);
