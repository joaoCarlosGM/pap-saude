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
  PasswordAlgorithm,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  authenticateLogin,
} from "../../src/server/auth/login.service";

import {
  completeMfaLogin,
} from "../../src/server/auth/mfa-login.service";

import {
  ConsumedMfaChallengeError,
  ExpiredMfaChallengeError,
  InvalidTotpCodeError,
  TotpReplayError,
} from "../../src/server/auth/mfa.errors";

import {
  hashPassword,
} from "../../src/server/auth/password";

import {
  encryptSecret,
} from "../../src/server/security/secret-encryption";

import {
  MFA_CHALLENGE_TTL_SECONDS,
  MFA_TOTP_ALGORITHM,
  MFA_TOTP_DIGITS,
  MFA_TOTP_ISSUER,
  MFA_TOTP_PERIOD_SECONDS,
} from "../../src/server/security/constants";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f03c";

const EMAIL =
  "foundation-f03c@papsaude.local";

const PASSWORD =
  "Foundation-F03C-Password-2026";

const ORIGIN =
  "203.0.113.103";

const TOTP_SECRET =
  "JBSWY3DPEHPK3PXP";

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
  await db.mfaChallenge.deleteMany();
  await db.loginAttempt.deleteMany();
  await db.auditEvent.deleteMany();

  await db.session.deleteMany({
    where: {
      userId:
        USER_ID,
    },
  });

  await db.mfaFactor.deleteMany({
    where: {
      userId:
        USER_ID,
    },
  });

  await db.passwordCredential.deleteMany({
    where: {
      userId:
        USER_ID,
    },
  });

  await db.user.deleteMany({
    where: {
      id:
        USER_ID,
    },
  });
}

async function createUser(
  withMfa = true,
): Promise<void> {
  await db.user.create({
    data: {
      id:
        USER_ID,
      email:
        EMAIL,
      displayName:
        "Foundation F03C",
      isActive:
        true,
    },
  });

  await db.passwordCredential.create({
    data: {
      userId:
        USER_ID,
      passwordHash:
        await hashPassword(
          PASSWORD,
        ),
      algorithm:
        PasswordAlgorithm.ARGON2ID,
    },
  });

  if (withMfa) {
    const now =
      new Date(
        "2030-01-01T10:00:00.000Z",
      );

    await db.mfaFactor.create({
      data: {
        userId:
          USER_ID,
        type:
          MfaFactorType.TOTP,
        status:
          MfaFactorStatus.ACTIVE,
        secretEncrypted:
          encryptSecret(
            TOTP_SECRET,
          ),
        label:
          EMAIL,
        createdAt:
          now,
        enabledAt:
          now,
      },
    });
  }
}

function generateTotp(
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
      secret:
        TOTP_SECRET,
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
});

after(async () => {
  await clearFixtures();
});

test(
  "password login with ACTIVE TOTP creates challenge but no session",
  async () => {
    await createUser();

    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now,
      });

    assert.equal(
      result.status,
      "MFA_REQUIRED",
    );

    if (
      result.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    assert.ok(
      result.challengeToken,
    );

    assert.equal(
      await db.session.count({
        where: {
          userId:
            USER_ID,
        },
      }),
      0,
    );

    const challenge =
      await db.mfaChallenge.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.notEqual(
      challenge.tokenHash,
      result.challengeToken,
    );

    assert.equal(
      challenge.expiresAt.getTime(),
      now.getTime() +
      MFA_CHALLENGE_TTL_SECONDS * 1000,
    );
  },
);

test(
  "user without MFA still receives normal authenticated session",
  async () => {
    await createUser(false);

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
      });

    assert.equal(
      result.status,
      "AUTHENTICATED",
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

    assert.equal(
      await db.mfaChallenge.count({
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
  "valid TOTP completes MFA and creates session",
  async () => {
    await createUser();

    const loginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const verifyAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          loginAt,
      });

    assert.equal(
      result.status,
      "MFA_REQUIRED",
    );

    if (
      result.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    const completed =
      await completeMfaLogin({
        challengeToken:
          result.challengeToken,
        code:
          generateTotp(
            verifyAt,
          ),
        now:
          verifyAt,
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

    const challenge =
      await db.mfaChallenge.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.ok(
      challenge.consumedAt,
    );
  },
);

test(
  "invalid TOTP does not consume challenge or create session",
  async () => {
    await createUser();

    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now,
      });

    assert.equal(
      result.status,
      "MFA_REQUIRED",
    );

    if (
      result.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    await assert.rejects(
      () =>
        completeMfaLogin({
          challengeToken:
            result.challengeToken,
          code:
            "000000",
          now,
        }),
      InvalidTotpCodeError,
    );

    const challenge =
      await db.mfaChallenge.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.equal(
      challenge.consumedAt,
      null,
    );

    assert.equal(
      await db.session.count(),
      0,
    );
  },
);

test(
  "expired challenge cannot authenticate",
  async () => {
    await createUser();

    const loginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          loginAt,
      });

    assert.equal(
      result.status,
      "MFA_REQUIRED",
    );

    if (
      result.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    const expiredAt =
      new Date(
        loginAt.getTime() +
        MFA_CHALLENGE_TTL_SECONDS * 1000,
      );

    await assert.rejects(
      () =>
        completeMfaLogin({
          challengeToken:
            result.challengeToken,
          code:
            generateTotp(
              expiredAt,
            ),
          now:
            expiredAt,
        }),
      ExpiredMfaChallengeError,
    );

    assert.equal(
      await db.session.count(),
      0,
    );
  },
);

test(
  "consumed challenge cannot be replayed",
  async () => {
    await createUser();

    const loginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const verifyAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const result =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          loginAt,
      });

    assert.equal(
      result.status,
      "MFA_REQUIRED",
    );

    if (
      result.status !==
      "MFA_REQUIRED"
    ) {
      return;
    }

    const code =
      generateTotp(
        verifyAt,
      );

    await completeMfaLogin({
      challengeToken:
        result.challengeToken,
      code,
      now:
        verifyAt,
    });

    await assert.rejects(
      () =>
        completeMfaLogin({
          challengeToken:
            result.challengeToken,
          code,
          now:
            verifyAt,
        }),
      ConsumedMfaChallengeError,
    );

    assert.equal(
      await db.session.count(),
      1,
    );
  },
);

test(
  "same TOTP time-step cannot be reused across a second challenge",
  async () => {
    await createUser();

    const loginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const verifyAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const first =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          loginAt,
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

    const code =
      generateTotp(
        verifyAt,
      );

    await completeMfaLogin({
      challengeToken:
        first.challengeToken,
      code,
      now:
        verifyAt,
    });

    const second =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          new Date(
            verifyAt.getTime() +
            1000,
          ),
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
        completeMfaLogin({
          challengeToken:
            second.challengeToken,
          code,
          now:
            new Date(
              verifyAt.getTime() +
              1000,
            ),
        }),
      TotpReplayError,
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
  "concurrent completion of the same MFA challenge creates exactly one session",
  async () => {
    await createUser();

    const loginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const verifyAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
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
          loginAt,
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

    const code =
      generateTotp(
        verifyAt,
      );

    const results =
      await Promise.allSettled([
        completeMfaLogin({
          challengeToken:
            login.challengeToken,
          code,
          now:
            verifyAt,
        }),

        completeMfaLogin({
          challengeToken:
            login.challengeToken,
          code,
          now:
            verifyAt,
        }),
      ]);

    const fulfilled =
      results.filter(
        result =>
          result.status ===
          "fulfilled",
      );

    const rejected =
      results.filter(
        result =>
          result.status ===
          "rejected",
      );

    assert.equal(
      fulfilled.length,
      1,
    );

    assert.equal(
      rejected.length,
      1,
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

    const challenge =
      await db.mfaChallenge.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.ok(
      challenge.consumedAt,
    );
  },
);

test(
  "concurrent challenges cannot reuse the same TOTP time-step",
  async () => {
    await createUser();

    const firstLoginAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const secondLoginAt =
      new Date(
        "2030-01-01T12:00:01.000Z",
      );

    const verifyAt =
      new Date(
        "2030-01-01T12:01:00.000Z",
      );

    const first =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          firstLoginAt,
      });

    const second =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
        now:
          secondLoginAt,
      });

    assert.equal(
      first.status,
      "MFA_REQUIRED",
    );

    assert.equal(
      second.status,
      "MFA_REQUIRED",
    );

    if (
      first.status !==
        "MFA_REQUIRED" ||
      second.status !==
        "MFA_REQUIRED"
    ) {
      return;
    }

    const code =
      generateTotp(
        verifyAt,
      );

    const results =
      await Promise.allSettled([
        completeMfaLogin({
          challengeToken:
            first.challengeToken,
          code,
          now:
            verifyAt,
        }),

        completeMfaLogin({
          challengeToken:
            second.challengeToken,
          code,
          now:
            verifyAt,
        }),
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
