import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  MfaFactorStatus,
  MfaFactorType,
  PasswordAlgorithm,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  authenticateLogin,
} from "../../src/server/auth/login.service";

import {
  completeMfaLoginWithRecoveryCode,
} from "../../src/server/auth/mfa-login.service";

import {
  InvalidRecoveryCodeError,
} from "../../src/server/auth/mfa.errors";

import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "../../src/server/auth/recovery-code.service";

import {
  hashPassword,
} from "../../src/server/auth/password";

import {
  encryptSecret,
} from "../../src/server/security/secret-encryption";

import {
  MFA_RECOVERY_CODE_COUNT,
} from "../../src/server/security/constants";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f03d";

const OTHER_USER_ID =
  "00000000-0000-4000-8000-00000000f13d";

const EMAIL =
  "foundation-f03d@papsaude.local";

const OTHER_EMAIL =
  "foundation-f03d-other@papsaude.local";

const PASSWORD =
  "Foundation-F03D-Password-2026";

const ORIGIN =
  "203.0.113.104";

const TOTP_SECRET =
  "JBSWY3DPEHPK3PXP";

async function assertSafeDatabase(): Promise<void> {
  const rows =
    await db.$queryRaw<
      Array<{ database: string }>
    >`SELECT current_database() AS database`;

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  );
}

async function clearFixtures(): Promise<void> {
  await db.mfaChallenge.deleteMany();

  await db.mfaRecoveryCode.deleteMany({
    where: {
      userId: {
        in: [
          USER_ID,
          OTHER_USER_ID,
        ],
      },
    },
  });

  await db.loginAttempt.deleteMany();
  await db.auditEvent.deleteMany();

  await db.session.deleteMany({
    where: {
      userId: {
        in: [
          USER_ID,
          OTHER_USER_ID,
        ],
      },
    },
  });

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

  await db.passwordCredential.deleteMany({
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

async function createUser(
  id = USER_ID,
  email = EMAIL,
): Promise<void> {
  const enabledAt =
    new Date(
      "2030-01-01T10:00:00.000Z",
    );

  await db.user.create({
    data: {
      id,
      email,
      displayName:
        "Foundation F03D",
      isActive:
        true,
    },
  });

  await db.passwordCredential.create({
    data: {
      userId:
        id,
      passwordHash:
        await hashPassword(
          PASSWORD,
        ),
      algorithm:
        PasswordAlgorithm.ARGON2ID,
    },
  });

  await db.mfaFactor.create({
    data: {
      userId:
        id,
      type:
        MfaFactorType.TOTP,
      status:
        MfaFactorStatus.ACTIVE,
      secretEncrypted:
        encryptSecret(
          TOTP_SECRET,
        ),
      label:
        email,
      createdAt:
        enabledAt,
      enabledAt,
    },
  });
}

before(async () => {
  await assertSafeDatabase();
  await clearFixtures();
});

beforeEach(async () => {
  await clearFixtures();
  await createUser();
});

after(async () => {
  await clearFixtures();
});

test(
  "recovery code generation creates the configured number of unique codes",
  async () => {
    const result =
      await generateRecoveryCodes(
        USER_ID,
      );

    assert.equal(
      result.codes.length,
      MFA_RECOVERY_CODE_COUNT,
    );

    assert.equal(
      new Set(
        result.codes,
      ).size,
      MFA_RECOVERY_CODE_COUNT,
    );

    assert.equal(
      await db.mfaRecoveryCode.count({
        where: {
          userId:
            USER_ID,
        },
      }),
      MFA_RECOVERY_CODE_COUNT,
    );
  },
);

test(
  "database stores only recovery-code hashes",
  async () => {
    const result =
      await generateRecoveryCodes(
        USER_ID,
      );

    const stored =
      await db.mfaRecoveryCode.findMany({
        where: {
          userId:
            USER_ID,
        },
      });

    for (
      const code of result.codes
    ) {
      assert.equal(
        stored.some(
          row =>
            row.codeHash ===
            code,
        ),
        false,
      );

      assert.equal(
        stored.some(
          row =>
            row.codeHash ===
            hashRecoveryCode(
              code,
            ),
        ),
        true,
      );
    }
  },
);

test(
  "recovery code is consumed exactly once",
  async () => {
    const result =
      await generateRecoveryCodes(
        USER_ID,
      );

    const selected =
      result.codes[0];

    await consumeRecoveryCode(
      USER_ID,
      selected,
    );

    await assert.rejects(
      () =>
        consumeRecoveryCode(
          USER_ID,
          selected,
        ),
      InvalidRecoveryCodeError,
    );

    const row =
      await db.mfaRecoveryCode.findUniqueOrThrow({
        where: {
          codeHash:
            hashRecoveryCode(
              selected,
            ),
        },
      });

    assert.ok(
      row.usedAt,
    );
  },
);

test(
  "recovery code accepts formatting normalization",
  async () => {
    const result =
      await generateRecoveryCodes(
        USER_ID,
      );

    const selected =
      result.codes[0];

    const normalizedInput =
      selected
        .replace(/-/g, "")
        .toLowerCase();

    await consumeRecoveryCode(
      USER_ID,
      normalizedInput,
    );

    const row =
      await db.mfaRecoveryCode.findUniqueOrThrow({
        where: {
          codeHash:
            hashRecoveryCode(
              selected,
            ),
        },
      });

    assert.ok(
      row.usedAt,
    );
  },
);

test(
  "generating a new set revokes previous unused recovery codes",
  async () => {
    const first =
      await generateRecoveryCodes(
        USER_ID,
      );

    const secondAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    await generateRecoveryCodes(
      USER_ID,
      secondAt,
    );

    const old =
      await db.mfaRecoveryCode.findUniqueOrThrow({
        where: {
          codeHash:
            hashRecoveryCode(
              first.codes[0],
            ),
        },
      });

    assert.equal(
      old.revokedAt?.getTime(),
      secondAt.getTime(),
    );

    await assert.rejects(
      () =>
        consumeRecoveryCode(
          USER_ID,
          first.codes[0],
        ),
      InvalidRecoveryCodeError,
    );
  },
);

test(
  "recovery code belonging to another user cannot be consumed",
  async () => {
    await createUser(
      OTHER_USER_ID,
      OTHER_EMAIL,
    );

    const result =
      await generateRecoveryCodes(
        USER_ID,
      );

    await assert.rejects(
      () =>
        consumeRecoveryCode(
          OTHER_USER_ID,
          result.codes[0],
        ),
      InvalidRecoveryCodeError,
    );
  },
);

test(
  "recovery code completes MFA challenge and creates session",
  async () => {
    const recovery =
      await generateRecoveryCodes(
        USER_ID,
      );

    const login =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          new Date(
            "2030-01-01T12:00:00.000Z",
          ),
      });

    assert.equal(
      login.status,
      "MFA_REQUIRED",
    );

    if (
      login.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    const completed =
      await completeMfaLoginWithRecoveryCode({
        challengeToken:
          login.challengeToken,
        recoveryCode:
          recovery.codes[0],
        now:
          new Date(
            "2030-01-01T12:01:00.000Z",
          ),
      });

    assert.equal(
      completed.user.id,
      USER_ID,
    );

    assert.equal(
      await db.session.count({
        where: {
          userId:
            USER_ID,
        },
      }),
      1,
    );
  },
);

test(
  "used recovery code cannot authenticate another challenge",
  async () => {
    const recovery =
      await generateRecoveryCodes(
        USER_ID,
      );

    const first =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
      });

    assert.equal(
      first.status,
      "MFA_REQUIRED",
    );

    if (
      first.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    await completeMfaLoginWithRecoveryCode({
      challengeToken:
        first.challengeToken,
      recoveryCode:
        recovery.codes[0],
    });

    const second =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
      });

    assert.equal(
      second.status,
      "MFA_REQUIRED",
    );

    if (
      second.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    await assert.rejects(
      () =>
        completeMfaLoginWithRecoveryCode({
          challengeToken:
            second.challengeToken,
          recoveryCode:
            recovery.codes[0],
        }),
      InvalidRecoveryCodeError,
    );

    assert.equal(
      await db.session.count({
        where: {
          userId:
            USER_ID,
        },
      }),
      1,
    );
  },
);

test(
  "concurrent use of one recovery code succeeds only once",
  async () => {
    const recovery =
      await generateRecoveryCodes(
        USER_ID,
      );

    const code =
      recovery.codes[0];

    const results =
      await Promise.allSettled([
        consumeRecoveryCode(
          USER_ID,
          code,
        ),
        consumeRecoveryCode(
          USER_ID,
          code,
        ),
      ]);

    assert.equal(
      results.filter(
        result =>
          result.status ===
          "fulfilled",
      ).length,
      1,
    );

    assert.equal(
      results.filter(
        result =>
          result.status ===
          "rejected",
      ).length,
      1,
    );
  },
);
