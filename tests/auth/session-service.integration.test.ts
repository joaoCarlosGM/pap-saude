import assert from "node:assert/strict";
import {
  after,
  before,
  beforeEach,
  test,
} from "node:test";

import {
  SessionRevocationReason,
} from "@prisma/client";

import { db } from "../../src/server/db/client";

import {
  createSession,
  deleteExpiredSessions,
  revokeAllUserSessions,
  revokeSessionByToken,
  validateSession,
} from "../../src/server/auth/session.service";

import {
  ExpiredSessionError,
  InactiveSessionUserError,
  InvalidSessionError,
  RevokedSessionError,
} from "../../src/server/auth/session.errors";

import { hashSessionToken } from "../../src/server/security/crypto";

const EXPECTED_DATABASE = "pap_saude_f02b_test";

const USER_ID =
  "00000000-0000-4000-8000-00000000f02b";

const USER_EMAIL =
  "foundation-f02b@papsaude.local";

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
      email: USER_EMAIL,
      displayName: "Foundation F02B",
      isActive: true,
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

test("createSession stores only token hash", async () => {
  const now = new Date("2030-01-01T12:00:00.000Z");

  const created = await createSession({
    userId: USER_ID,
    ipHash: "ip-hash",
    userAgent: "PAP-Test",
    now,
  });

  const stored = await db.session.findUniqueOrThrow({
    where: {
      id: created.session.id,
    },
  });

  assert.notEqual(stored.tokenHash, created.token);
  assert.equal(
    stored.tokenHash,
    hashSessionToken(created.token),
  );
});

test("valid session is accepted", async () => {
  const created = await createSession({
    userId: USER_ID,
    now: new Date("2030-01-01T12:00:00.000Z"),
  });

  const validated = await validateSession(
    created.token,
    {
      now: new Date("2030-01-01T12:01:00.000Z"),
    },
  );

  assert.equal(validated.user.id, USER_ID);
});

test("unknown token is rejected", async () => {
  await assert.rejects(
    () => validateSession("unknown-token"),
    InvalidSessionError,
  );
});

test("expired session is rejected", async () => {
  const created = await createSession({
    userId: USER_ID,
    now: new Date("2030-01-01T00:00:00.000Z"),
  });

  await assert.rejects(
    () =>
      validateSession(created.token, {
        now: new Date("2030-01-01T08:00:01.000Z"),
      }),
    ExpiredSessionError,
  );
});

test("revoked session is rejected", async () => {
  const created = await createSession({
    userId: USER_ID,
  });

  await revokeSessionByToken(
    created.token,
    SessionRevocationReason.LOGOUT,
  );

  await assert.rejects(
    () => validateSession(created.token),
    RevokedSessionError,
  );
});

test("inactive user session is rejected", async () => {
  const created = await createSession({
    userId: USER_ID,
  });

  await db.user.update({
    where: {
      id: USER_ID,
    },
    data: {
      isActive: false,
    },
  });

  await assert.rejects(
    () => validateSession(created.token),
    InactiveSessionUserError,
  );
});

test("lastSeenAt is throttled before 5 minutes", async () => {
  const createdAt =
    new Date("2030-01-01T12:00:00.000Z");

  const created = await createSession({
    userId: USER_ID,
    now: createdAt,
  });

  await validateSession(created.token, {
    now: new Date("2030-01-01T12:04:59.000Z"),
  });

  const stored = await db.session.findUniqueOrThrow({
    where: {
      id: created.session.id,
    },
  });

  assert.equal(
    stored.lastSeenAt.getTime(),
    createdAt.getTime(),
  );
});

test("lastSeenAt updates at 5 minutes", async () => {
  const createdAt =
    new Date("2030-01-01T12:00:00.000Z");

  const touchedAt =
    new Date("2030-01-01T12:05:00.000Z");

  const created = await createSession({
    userId: USER_ID,
    now: createdAt,
  });

  await validateSession(created.token, {
    now: touchedAt,
  });

  const stored = await db.session.findUniqueOrThrow({
    where: {
      id: created.session.id,
    },
  });

  assert.equal(
    stored.lastSeenAt.getTime(),
    touchedAt.getTime(),
  );
});

test("all active sessions can be revoked", async () => {
  await createSession({ userId: USER_ID });
  await createSession({ userId: USER_ID });

  const count = await revokeAllUserSessions(
    USER_ID,
    SessionRevocationReason.SECURITY_EVENT,
  );

  assert.equal(count, 2);
});

test("session revocation is idempotent", async () => {
  const created = await createSession({
    userId: USER_ID,
  });

  const first = await revokeSessionByToken(
    created.token,
    SessionRevocationReason.LOGOUT,
  );

  const second = await revokeSessionByToken(
    created.token,
    SessionRevocationReason.LOGOUT,
  );

  assert.equal(first, true);
  assert.equal(second, false);
});

test("expired sessions can be deleted", async () => {
  await createSession({
    userId: USER_ID,
    now: new Date("2030-01-01T00:00:00.000Z"),
  });

  const deleted = await deleteExpiredSessions(
    new Date("2030-01-02T00:00:00.000Z"),
  );

  assert.equal(deleted, 1);
});
