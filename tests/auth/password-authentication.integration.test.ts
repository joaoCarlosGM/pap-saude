import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import argon2 from "argon2";

import {
  PasswordAlgorithm,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  authenticateWithPassword,
  normalizeEmail,
  upgradePasswordHashIfCurrent,
} from "../../src/server/auth/password-authentication.service";

import {
  InactiveUserError,
  InvalidCredentialsError,
  PasswordChangeRequiredError,
} from "../../src/server/auth/auth.errors";

import {
  hashPassword,
  verifyPassword,
} from "../../src/server/auth/password";

import {
  ARGON2_OPTIONS,
} from "../../src/server/security/constants";

const EXPECTED_DATABASE =
  "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f02c";

const EMAIL =
  "foundation-f02c@papsaude.local";

const PASSWORD =
  "Correct-Horse-Battery-2026";

const CHANGED_AT =
  new Date("2029-12-01T10:00:00.000Z");

async function assertSafeDatabase(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ database: string }>
  >`SELECT current_database() AS database`;

  const database = rows[0]?.database;

  if (database !== EXPECTED_DATABASE) {
    throw new Error(
      `SAFETY GUARD: recusado database "${database ?? "unknown"}". ` +
      `Esperado "${EXPECTED_DATABASE}".`,
    );
  }
}

async function clearFixtures(): Promise<void> {
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

async function createUser(options?: {
  isActive?: boolean;
  withCredential?: boolean;
  mustChange?: boolean;
  passwordHash?: string;
}): Promise<void> {
  const isActive =
    options?.isActive ?? true;

  const withCredential =
    options?.withCredential ?? true;

  const mustChange =
    options?.mustChange ?? false;

  await db.user.create({
    data: {
      id: USER_ID,
      email: EMAIL,
      displayName: "Foundation F02C",
      isActive,
    },
  });

  if (!withCredential) {
    return;
  }

  const passwordHash =
    options?.passwordHash ??
    await hashPassword(PASSWORD);

  await db.passwordCredential.create({
    data: {
      userId: USER_ID,
      passwordHash,
      algorithm: PasswordAlgorithm.ARGON2ID,
      mustChange,
      changedAt: CHANGED_AT,
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

test("normalizeEmail trims and lowercases email", () => {
  assert.equal(
    normalizeEmail(
      "  FOUNDATION-F02C@PAPSAUDE.LOCAL  ",
    ),
    EMAIL,
  );
});

test("valid password authenticates and creates session", async () => {
  await createUser();

  const now =
    new Date("2030-01-01T12:00:00.000Z");

  const result =
    await authenticateWithPassword({
      email:
        "  FOUNDATION-F02C@PAPSAUDE.LOCAL ",
      password: PASSWORD,
      ipHash: "ip-auth-test",
      userAgent: "PAP-F02C-Test",
      now,
    });

  assert.equal(result.user.id, USER_ID);
  assert.equal(result.user.email, EMAIL);

  assert.ok(result.sessionToken.length >= 40);

  const storedSession =
    await db.session.findUniqueOrThrow({
      where: {
        id: result.session.id,
      },
    });

  assert.equal(
    storedSession.userId,
    USER_ID,
  );

  assert.notEqual(
    storedSession.tokenHash,
    result.sessionToken,
  );

  assert.equal(
    storedSession.ipHash,
    "ip-auth-test",
  );

  assert.equal(
    storedSession.userAgent,
    "PAP-F02C-Test",
  );
});

test("wrong password returns InvalidCredentialsError", async () => {
  await createUser();

  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: EMAIL,
        password: "Definitely-Wrong-Password-2026",
      }),
    InvalidCredentialsError,
  );

  assert.equal(
    await db.session.count({
      where: {
        userId: USER_ID,
      },
    }),
    0,
  );
});

test("unknown email returns InvalidCredentialsError", async () => {
  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: "unknown@papsaude.local",
        password: PASSWORD,
      }),
    InvalidCredentialsError,
  );
});

test("missing password credential returns InvalidCredentialsError", async () => {
  await createUser({
    withCredential: false,
  });

  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: EMAIL,
        password: PASSWORD,
      }),
    InvalidCredentialsError,
  );
});

test("inactive user with valid password is rejected", async () => {
  await createUser({
    isActive: false,
  });

  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: EMAIL,
        password: PASSWORD,
      }),
    InactiveUserError,
  );

  assert.equal(
    await db.session.count({
      where: {
        userId: USER_ID,
      },
    }),
    0,
  );
});

test("mustChange credential does not create normal session", async () => {
  await createUser({
    mustChange: true,
  });

  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: EMAIL,
        password: PASSWORD,
      }),
    PasswordChangeRequiredError,
  );

  assert.equal(
    await db.session.count({
      where: {
        userId: USER_ID,
      },
    }),
    0,
  );
});

test("weak legacy Argon2 hash is automatically rehashed", async () => {
  const legacyHash = await argon2.hash(
    PASSWORD,
    {
      type: argon2.argon2id,
      memoryCost: 8192,
      timeCost: 1,
      parallelism: 1,
    },
  );

  await createUser({
    passwordHash: legacyHash,
  });

  const before =
    await db.passwordCredential.findUniqueOrThrow({
      where: {
        userId: USER_ID,
      },
    });

  assert.equal(
    before.changedAt.getTime(),
    CHANGED_AT.getTime(),
  );

  await authenticateWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  const afterCredential =
    await db.passwordCredential.findUniqueOrThrow({
      where: {
        userId: USER_ID,
      },
    });

  assert.notEqual(
    afterCredential.passwordHash,
    legacyHash,
  );

  assert.equal(
    afterCredential.changedAt.getTime(),
    CHANGED_AT.getTime(),
  );

  assert.equal(
    afterCredential.algorithm,
    PasswordAlgorithm.ARGON2ID,
  );

  assert.equal(
    await verifyPassword(
      afterCredential.passwordHash,
      PASSWORD,
    ),
    true,
  );

  const parsed =
    afterCredential.passwordHash;

  assert.match(
    parsed,
    /\$argon2id\$/,
  );

  assert.match(
    parsed,
    new RegExp(`m=${ARGON2_OPTIONS.memoryCost}`),
  );

  assert.match(
    parsed,
    new RegExp(`t=${ARGON2_OPTIONS.timeCost}`),
  );

  assert.match(
    parsed,
    new RegExp(`p=${ARGON2_OPTIONS.parallelism}`),
  );
});

test("empty login data fails closed", async () => {
  await assert.rejects(
    () =>
      authenticateWithPassword({
        email: "",
        password: "",
      }),
    InvalidCredentialsError,
  );
});


test("database rejects non-canonical email", async () => {
  await assert.rejects(
    () =>
      db.user.create({
        data: {
          id: "00000000-0000-4000-8000-00000000e001",
          email: "MixedCase@PapSaude.Local",
          displayName: "Invalid Canonical Email",
          isActive: true,
        },
      }),
  );

  const stored = await db.user.findUnique({
    where: {
      id: "00000000-0000-4000-8000-00000000e001",
    },
  });

  assert.equal(stored, null);
});

test(
  "rehash compare-and-swap never overwrites a concurrently changed password",
  async () => {
    const legacyHash = await argon2.hash(
      PASSWORD,
      {
        type: argon2.argon2id,
        memoryCost: 8192,
        timeCost: 1,
        parallelism: 1,
      },
    );

    await createUser({
      passwordHash: legacyHash,
    });

    const replacementPassword =
      "Replacement-Password-After-Change-2026";

    const replacementHash =
      await hashPassword(replacementPassword);

    await db.passwordCredential.update({
      where: {
        userId: USER_ID,
      },
      data: {
        passwordHash: replacementHash,
        changedAt: new Date(
          "2030-01-01T13:00:00.000Z",
        ),
      },
    });

    const upgraded =
      await upgradePasswordHashIfCurrent({
        userId: USER_ID,
        currentHash: legacyHash,
        password: PASSWORD,
      });

    assert.equal(upgraded, false);

    const stored =
      await db.passwordCredential.findUniqueOrThrow({
        where: {
          userId: USER_ID,
        },
      });

    assert.equal(
      stored.passwordHash,
      replacementHash,
    );

    assert.equal(
      await verifyPassword(
        stored.passwordHash,
        replacementPassword,
      ),
      true,
    );

    assert.equal(
      await verifyPassword(
        stored.passwordHash,
        PASSWORD,
      ),
      false,
    );
  },
);
