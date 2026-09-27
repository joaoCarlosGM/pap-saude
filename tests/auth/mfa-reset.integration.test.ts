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
  SessionRevocationReason,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  authenticateLogin,
} from "../../src/server/auth/login.service";

import {
  loadMfaChallenge,
} from "../../src/server/auth/mfa-challenge.service";

import {
  resetMfaForUser,
} from "../../src/server/auth/mfa-reset.service";

import {
  generateRecoveryCodes,
} from "../../src/server/auth/recovery-code.service";

import {
  createSession,
  validateSession,
} from "../../src/server/auth/session.service";

import {
  hashPassword,
} from "../../src/server/auth/password";

import {
  encryptSecret,
} from "../../src/server/security/secret-encryption";

import {
  InvalidMfaChallengeError,
  MfaResetTargetUnavailableError,
} from "../../src/server/auth/mfa.errors";

import {
  RevokedSessionError,
} from "../../src/server/auth/session.errors";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f03e";

const OTHER_USER_ID =
  "00000000-0000-4000-8000-00000000f13e";

const EMAIL =
  "foundation-f03e@papsaude.local";

const OTHER_EMAIL =
  "foundation-f03e-other@papsaude.local";

const PASSWORD =
  "Foundation-F03E-Password-2026";

const ORIGIN =
  "203.0.113.105";

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

  await db.auditEvent.deleteMany({
    where: {
      OR: [
        {
          actorUserId: {
            in: [
              USER_ID,
              OTHER_USER_ID,
            ],
          },
        },
        {
          resourceType:
            "USER",
          resourceId: {
            in: [
              USER_ID,
              OTHER_USER_ID,
            ],
          },
        },
      ],
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
  withMfa = true,
): Promise<void> {
  const enabledAt =
    new Date(
      "2020-01-01T10:00:00.000Z",
    );

  await db.user.create({
    data: {
      id,
      email,
      displayName:
        "Foundation F03E",
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

  if (withMfa) {
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
}

async function createPendingFactor(): Promise<void> {
  const createdAt =
    new Date(
      "2030-01-01T11:00:00.000Z",
    );

  await db.mfaFactor.create({
    data: {
      userId:
        USER_ID,
      type:
        MfaFactorType.TOTP,
      status:
        MfaFactorStatus.PENDING,
      secretEncrypted:
        encryptSecret(
          "KRUGS4ZANFZSAYJA",
        ),
      label:
        EMAIL,
      createdAt,
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
  "MFA reset revokes factors recovery codes challenges and sessions",
  async () => {
    await createPendingFactor();

    await generateRecoveryCodes(
      USER_ID,
      new Date(
        "2030-01-01T11:10:00.000Z",
      ),
    );

    const session =
      await createSession({
        userId:
          USER_ID,
        now:
          new Date(
            "2030-01-01T11:20:00.000Z",
          ),
      });

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
            "2030-01-01T11:30:00.000Z",
          ),
      });

    assert.equal(
      login.status,
      "MFA_REQUIRED",
    );

    const resetAt =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    const result =
      await resetMfaForUser({
        userId:
          USER_ID,
        actorUserId:
          USER_ID,
        reason:
          "SECURITY_RESET",
        now:
          resetAt,
      });

    assert.equal(
      result.revokedFactors,
      2,
    );

    assert.equal(
      result.revokedRecoveryCodes,
      10,
    );

    assert.equal(
      result.revokedChallenges,
      1,
    );

    assert.equal(
      result.revokedSessions,
      1,
    );

    const factors =
      await db.mfaFactor.findMany({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.equal(
      factors.every(
        factor =>
          factor.status ===
          MfaFactorStatus.REVOKED &&
          factor.revokedAt?.getTime() ===
            resetAt.getTime(),
      ),
      true,
    );

    const recovery =
      await db.mfaRecoveryCode.findMany({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.equal(
      recovery.every(
        code =>
          code.revokedAt?.getTime() ===
          resetAt.getTime(),
      ),
      true,
    );

    const challenge =
      await db.mfaChallenge.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    assert.equal(
      challenge.revokedAt?.getTime(),
      resetAt.getTime(),
    );

    const storedSession =
      await db.session.findUniqueOrThrow({
        where: {
          id:
            session.session.id,
        },
      });

    assert.equal(
      storedSession.revokedAt?.getTime(),
      resetAt.getTime(),
    );

    assert.equal(
      storedSession.revocationReason,
      SessionRevocationReason.MFA_RESET,
    );
  },
);

test(
  "session issued before MFA reset becomes invalid",
  async () => {
    const session =
      await createSession({
        userId:
          USER_ID,
      });

    await resetMfaForUser({
      userId:
        USER_ID,
        actorUserId:
          USER_ID,
      });

    await assert.rejects(
      () =>
        validateSession(
          session.token,
        ),
      RevokedSessionError,
    );
  },
);

test(
  "revoked MFA challenge cannot be completed",
  async () => {
    const login =
      await authenticateLogin({
        email:
          EMAIL,
        password:
          PASSWORD,
        origin:
          ORIGIN,
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

    await resetMfaForUser({
      userId:
        USER_ID,
        actorUserId:
          USER_ID,
    });

    await assert.rejects(
      () =>
        loadMfaChallenge(
          login.challengeToken,
        ),
      InvalidMfaChallengeError,
    );
  },
);

test(
  "MFA reset records audit event without credential material",
  async () => {
    const now =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    await resetMfaForUser({
      userId:
        USER_ID,
      actorUserId:
        USER_ID,
      reason:
        "USER_REQUEST",
      requestId:
        "request-f03e",
      correlationId:
        "correlation-f03e",
      ipHash:
        "0123456789abcdef",
      userAgent:
        "Foundation Test",
      now,
    });

    const audit =
      await db.auditEvent.findFirstOrThrow({
        where: {
          action:
            "MFA_RESET",
          resourceType:
            "USER",
          resourceId:
            USER_ID,
        },
        orderBy: {
          occurredAt:
            "desc",
        },
      });

    assert.equal(
      audit.actorUserId,
      USER_ID,
    );

    assert.equal(
      audit.outcome,
      "SUCCESS",
    );

    assert.equal(
      audit.reason,
      "USER_REQUEST",
    );

    assert.equal(
      audit.occurredAt.getTime(),
      now.getTime(),
    );

    const serialized =
      JSON.stringify(audit);

    assert.doesNotMatch(
      serialized,
      /JBSWY3DPEHPK3PXP/,
    );

    assert.doesNotMatch(
      serialized,
      /Foundation-F03E-Password-2026/,
    );
  },
);

test(
  "MFA reset is idempotent",
  async () => {
    const first =
      await resetMfaForUser({
        userId:
          USER_ID,
        actorUserId:
          USER_ID,
      });

    const second =
      await resetMfaForUser({
        userId:
          USER_ID,
        actorUserId:
          USER_ID,
      });

    assert.equal(
      first.revokedFactors,
      1,
    );

    assert.equal(
      second.revokedFactors,
      0,
    );

    assert.equal(
      second.revokedRecoveryCodes,
      0,
    );

    assert.equal(
      second.revokedChallenges,
      0,
    );

    assert.equal(
      second.revokedSessions,
      0,
    );
  },
);

test(
  "inactive user can still have MFA reset",
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

    const result =
      await resetMfaForUser({
        userId:
          USER_ID,
      });

    assert.equal(
      result.revokedFactors,
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
  },
);

test(
  "unknown reset target is rejected",
  async () => {
    await assert.rejects(
      () =>
        resetMfaForUser({
          userId:
            "00000000-0000-4000-8000-00000000ffff",
        }),
      MfaResetTargetUnavailableError,
    );
  },
);

test(
  "reset affects only the target user",
  async () => {
    await createUser(
      OTHER_USER_ID,
      OTHER_EMAIL,
    );

    await resetMfaForUser({
      userId:
        USER_ID,
        actorUserId:
          USER_ID,
    });

    const target =
      await db.mfaFactor.findFirstOrThrow({
        where: {
          userId:
            USER_ID,
        },
      });

    const other =
      await db.mfaFactor.findFirstOrThrow({
        where: {
          userId:
            OTHER_USER_ID,
        },
      });

    assert.equal(
      target.status,
      MfaFactorStatus.REVOKED,
    );

    assert.equal(
      other.status,
      MfaFactorStatus.ACTIVE,
    );
  },
);

test(
  "login after MFA reset no longer requires second factor",
  async () => {
    await resetMfaForUser({
      userId:
        USER_ID,
        actorUserId:
          USER_ID,
    });

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
      await db.mfaChallenge.count({
        where: {
          userId:
            USER_ID,
          revokedAt:
            null,
          consumedAt:
            null,
        },
      }),
      0,
    );

    assert.equal(
      await db.session.count({
        where: {
          userId:
            USER_ID,
          revokedAt:
            null,
        },
      }),
      1,
    );
  },
);
