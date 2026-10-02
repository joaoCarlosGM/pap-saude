import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  LoginAttemptOutcome,
  PasswordAlgorithm,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  InvalidCredentialsError,
  LoginThrottledError,
} from "../../src/server/auth/auth.errors";

import {
  authenticateLogin,
} from "../../src/server/auth/login.service";

import {
  createLoginProtectionHashes,
  evaluateLoginThrottle,
  recordLoginFailure,
} from "../../src/server/auth/login-abuse.service";

import {
  hashPassword,
} from "../../src/server/auth/password";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f02d";

const EMAIL =
  "foundation-f02d@papsaude.local";

const PASSWORD =
  "Foundation-F02D-Password-2026";

const WRONG_PASSWORD =
  "Foundation-F02D-Wrong-Password";

const ORIGIN =
  "198.51.100.50";

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
  await db.loginAttempt.deleteMany();
  await db.auditEvent.deleteMany();

  await db.session.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  await db.passwordCredential.deleteMany({
    where: {
      userId: USER_ID,
    },
  });

  await db.user.deleteMany({
    where: {
      id: USER_ID,
    },
  });
}

async function createUser(): Promise<void> {
  await db.user.create({
    data: {
      id: USER_ID,
      email: EMAIL,
      displayName:
        "Foundation F02D",
      isActive: true,
    },
  });

  await db.passwordCredential.create({
    data: {
      userId: USER_ID,
      passwordHash:
        await hashPassword(PASSWORD),
      algorithm:
        PasswordAlgorithm.ARGON2ID,
    },
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
  "login protection hashes identity and origin deterministically",
  () => {
    const first =
      createLoginProtectionHashes({
        email:
          " FOUNDATION-F02D@PAPSAUDE.LOCAL ",
        origin: ORIGIN,
      });

    const second =
      createLoginProtectionHashes({
        email: EMAIL,
        origin: ORIGIN,
      });

    assert.deepEqual(
      first,
      second,
    );

    assert.notEqual(
      first.identityHash,
      EMAIL,
    );

    assert.notEqual(
      first.originHash,
      ORIGIN,
    );

    assert.equal(
      first.identityHash.length,
      64,
    );

    assert.equal(
      first.originHash.length,
      64,
    );
  },
);

test(
  "four failed logins activate pair backoff without account lockout",
  async () => {
    await createUser();

    const base =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    for (let i = 0; i < 4; i += 1) {
      await assert.rejects(
        () =>
          authenticateLogin({
            email: EMAIL,
            password:
              WRONG_PASSWORD,
            origin: ORIGIN,
            now: new Date(
              base.getTime() +
              i * 1000,
            ),
          }),
        InvalidCredentialsError,
      );
    }

    await assert.rejects(
      () =>
        authenticateLogin({
          email: EMAIL,
          password:
            WRONG_PASSWORD,
          origin: ORIGIN,
          now: new Date(
            base.getTime() +
            4000,
          ),
        }),
      LoginThrottledError,
    );

    const attempts =
      await db.loginAttempt.findMany({
        orderBy: {
          occurredAt: "asc",
        },
      });

    assert.equal(
      attempts.filter(
        (attempt) =>
          attempt.outcome ===
          LoginAttemptOutcome.FAILURE,
      ).length,
      4,
    );

    assert.equal(
      attempts.filter(
        (attempt) =>
          attempt.outcome ===
          LoginAttemptOutcome.THROTTLED,
      ).length,
      1,
    );
  },
);

test(
  "pair backoff expires and permits another credential check",
  async () => {
    const context = {
      email: EMAIL,
      origin: ORIGIN,
    };

    const base =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    for (let i = 0; i < 4; i += 1) {
      await recordLoginFailure(
        context,
        new Date(
          base.getTime() +
          i * 1000,
        ),
      );
    }

    const hashes =
      createLoginProtectionHashes(
        context,
      );

    const blocked =
      await evaluateLoginThrottle(
        hashes,
        new Date(
          base.getTime() +
          4000,
        ),
      );

    assert.equal(
      blocked.allowed,
      false,
    );

    assert.equal(
      blocked.scope,
      "PAIR_BACKOFF",
    );

    const allowed =
      await evaluateLoginThrottle(
        hashes,
        new Date(
          base.getTime() +
          34000,
        ),
      );

    assert.equal(
      allowed.allowed,
      true,
    );
  },
);

test(
  "successful login resets effective pair failure history",
  async () => {
    await createUser();

    const context = {
      email: EMAIL,
      origin: ORIGIN,
    };

    const base =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    for (let i = 0; i < 3; i += 1) {
      await recordLoginFailure(
        context,
        new Date(
          base.getTime() +
          i * 1000,
        ),
      );
    }

    const result =
      await authenticateLogin({
        email: EMAIL,
        password: PASSWORD,
        origin: ORIGIN,
        now: new Date(
          base.getTime() +
          4000,
        ),
      });

    assert.equal(
      result.user.id,
      USER_ID,
    );

    const decision =
      await evaluateLoginThrottle(
        createLoginProtectionHashes(
          context,
        ),
        new Date(
          base.getTime() +
          5000,
        ),
      );

    assert.equal(
      decision.allowed,
      true,
    );

    assert.equal(
      decision.pairFailures,
      0,
    );
  },
);

test(
  "origin credential stuffing protection activates across distinct identities",
  async () => {
    const base =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    for (let i = 0; i < 20; i += 1) {
      await recordLoginFailure(
        {
          email:
            `stuffing-${i}@papsaude.local`,
          origin: ORIGIN,
        },
        new Date(
          base.getTime() +
          i * 1000,
        ),
      );
    }

    const hashes =
      createLoginProtectionHashes({
        email:
          "victim@papsaude.local",
        origin: ORIGIN,
      });

    const decision =
      await evaluateLoginThrottle(
        hashes,
        new Date(
          base.getTime() +
          20000,
        ),
      );

    assert.equal(
      decision.allowed,
      false,
    );

    assert.equal(
      decision.scope,
      "ORIGIN_STUFFING",
    );

    assert.equal(
      decision.originDistinctIdentities,
      20,
    );
  },
);

test(
  "raw email and raw origin are never persisted in login attempt or audit identifiers",
  async () => {
    await recordLoginFailure(
      {
        email: EMAIL,
        origin: ORIGIN,
        userAgent:
          "PAP-F02D-Test",
      },
      new Date(
        "2030-01-01T12:00:00.000Z",
      ),
    );

    const attempt =
      await db.loginAttempt.findFirstOrThrow();

    const audit =
      await db.auditEvent.findFirstOrThrow({
        where: {
          action:
            "LOGIN_FAILED",
        },
      });

    assert.notEqual(
      attempt.identityHash,
      EMAIL,
    );

    assert.notEqual(
      attempt.originHash,
      ORIGIN,
    );

    assert.notEqual(
      audit.resourceId,
      EMAIL,
    );

    assert.notEqual(
      audit.ipHash,
      ORIGIN,
    );

    assert.equal(
      audit.ipHash,
      attempt.originHash,
    );
  },
);

test(
  "throttled attempts do not increase credential failure count",
  async () => {
    const context = {
      email: EMAIL,
      origin: ORIGIN,
    };

    const base =
      new Date(
        "2030-01-01T12:00:00.000Z",
      );

    for (let i = 0; i < 4; i += 1) {
      await recordLoginFailure(
        context,
        new Date(
          base.getTime() +
          i * 1000,
        ),
      );
    }

    const hashes =
      createLoginProtectionHashes(
        context,
      );

    const before =
      await evaluateLoginThrottle(
        hashes,
        new Date(
          base.getTime() +
          4000,
        ),
      );

    assert.equal(
      before.pairFailures,
      4,
    );

    await assert.rejects(
      () =>
        authenticateLogin({
          email: EMAIL,
          password:
            WRONG_PASSWORD,
          origin: ORIGIN,
          now: new Date(
            base.getTime() +
            5000,
          ),
        }),
      LoginThrottledError,
    );

    const failures =
      await db.loginAttempt.count({
        where: {
          identityHash:
            hashes.identityHash,
          originHash:
            hashes.originHash,
          outcome:
            LoginAttemptOutcome.FAILURE,
        },
      });

    assert.equal(
      failures,
      4,
    );
  },
);
