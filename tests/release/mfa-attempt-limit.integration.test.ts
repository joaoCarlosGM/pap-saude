import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import * as OTPAuth from "otpauth";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { encryptSecret } from "../../src/server/security/secret-encryption";
import { createMfaChallenge } from "../../src/server/auth/mfa-challenge.service";
import { completeMfaLogin, completeMfaLoginWithRecoveryCode } from "../../src/server/auth/mfa-login.service";
import { createSession } from "../../src/server/auth/session.service";
import { generateRecoveryCodes } from "../../src/server/auth/recovery-code.service";
import { InvalidTotpCodeError, MfaLoginThrottledError, InvalidMfaChallengeError, ExpiredMfaChallengeError } from "../../src/server/auth/mfa.errors";
import { MFA_CHALLENGE_COOKIE_NAME } from "../../src/server/security/constants";
import { MFA_LOGIN_ATTEMPT_LIMITS } from "../../src/server/auth/mfa-attempt-limit.service";
import { POST } from "../../src/app/api/auth/mfa/verify/route";

const origin = "203.0.113.59";
const now = new Date();
const originalEnv = {
  key: process.env.MFA_SECRET_ENCRYPTION_KEY,
  origins: process.env.AUTH_ALLOWED_ORIGINS,
  header: process.env.AUTH_TRUSTED_CLIENT_IP_HEADER,
};
async function safeDatabase() {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "25440");
  assert.equal(url.pathname, "/pap_release_mfa_20261026");
  assert.equal(url.search, "?schema=public");
  // No cleanup or fixture write happens before this exact allowlist check.
}
async function cleanFixtures() {
  await safeDatabase();
  await db.session.deleteMany();
  await db.mfaRecoveryCode.deleteMany();
  await db.mfaChallenge.deleteMany();
  await db.mfaFactor.deleteMany();
  await db.user.deleteMany();
  await db.betaAbuseBucket.deleteMany();
  // Audit remains append-only; never disable its trigger or delete events.
}
async function fixture(at = now) {
  const id = randomUUID();
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ secret, algorithm: "SHA1", period: 30, digits: 6 });
  const accepted = new Set([-1, 0, 1].map(delta => totp.generate({ timestamp: at.getTime() + delta * 30_000 })));
  const invalid = ["000000", "000001", "000002", "000003"].find(code => !accepted.has(code))!;
  await db.user.create({ data: { id, email: `mfa-${id}@example.invalid`, displayName: "SYNTHETIC RELEASE MFA" } });
  const factor = await db.mfaFactor.create({ data: { userId: id, type: "TOTP", status: "ACTIVE", createdAt: new Date(at.getTime() - 60_000), enabledAt: at, secretEncrypted: encryptSecret(secret.base32) } });
  const challenge = await createMfaChallenge({ userId: id, now: at });
  return { id, factor, challenge, invalid, valid: totp.generate({ timestamp: at.getTime() }) };
}
async function wrong(row: Awaited<ReturnType<typeof fixture>>, source = origin, at = now) {
  return completeMfaLogin({ challengeToken: row.challenge.token, code: row.invalid, origin: source, now: at });
}
function request(challengeToken: string, code: string, source = origin) {
  return new NextRequest("http://127.0.0.1:3000/api/auth/mfa/verify", {
    method: "POST", headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json",
      "x-release-test-ip": source, cookie: `${MFA_CHALLENGE_COOKIE_NAME}=${challengeToken}` },
    body: JSON.stringify({ code }),
  });
}
before(async () => {
  await safeDatabase();
  process.env.MFA_SECRET_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
  process.env.AUTH_ALLOWED_ORIGINS = "http://127.0.0.1:3000";
  process.env.AUTH_TRUSTED_CLIENT_IP_HEADER = "x-release-test-ip";
});
beforeEach(cleanFixtures);
after(async () => {
  await cleanFixtures();
  for (const [key, value] of Object.entries({ MFA_SECRET_ENCRYPTION_KEY: originalEnv.key, AUTH_ALLOWED_ORIGINS: originalEnv.origins, AUTH_TRUSTED_CLIENT_IP_HEADER: originalEnv.header })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await db.$disconnect();
});

test("one challenge permits at most five attempts; later correct codes cannot bypass the exhausted budget", async () => {
  const row = await fixture();
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.challenge; i++) await assert.rejects(wrong(row), InvalidTotpCodeError);
  await assert.rejects(completeMfaLogin({ challengeToken: row.challenge.token, code: row.valid, origin, now }), MfaLoginThrottledError);
  assert.equal(await db.session.count(), 0);
  const factor = await db.mfaFactor.findUniqueOrThrow({ where: { id: row.factor.id } });
  assert.equal(factor.secretEncrypted, row.factor.secretEncrypted);
  assert.equal(factor.lastUsedAt, null);
  assert.equal(await db.roleAssignment.count(), 0);
});

test("twenty concurrent invalid requests reserve only five TOTP verification attempts", async () => {
  const row = await fixture();
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => wrong(row)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 0);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason instanceof InvalidTotpCodeError).length, 5);
  assert.equal(results.filter(r => r.status === "rejected" && r.reason instanceof MfaLoginThrottledError).length, 15);
  assert.equal(await db.session.count(), 0);
});

test("renewing challenges and changing source IP does not reset the account attempt budget", async () => {
  const row = await fixture();
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.identity; i++) {
    const challenge = await createMfaChallenge({ userId: row.id, now });
    await assert.rejects(wrong({ ...row, challenge }, `203.0.113.${i + 1}`), InvalidTotpCodeError);
  }
  const challenge = await createMfaChallenge({ userId: row.id, now });
  await assert.rejects(completeMfaLogin({ challengeToken: challenge.token, code: row.valid, origin: "203.0.113.250", now }), MfaLoginThrottledError);
  assert.equal(await db.session.count(), 0);
});

test("source-IP attempt budget persists across distinct identities and challenges", async () => {
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.origin / MFA_LOGIN_ATTEMPT_LIMITS.challenge; i++) {
    const row = await fixture();
    for (let n = 0; n < MFA_LOGIN_ATTEMPT_LIMITS.challenge; n++) await assert.rejects(wrong(row), InvalidTotpCodeError);
  }
  const row = await fixture();
  await assert.rejects(completeMfaLogin({ challengeToken: row.challenge.token, code: row.valid, origin, now }), MfaLoginThrottledError);
  assert.equal(await db.session.count(), 0);
});

test("the per-challenge limit cannot be reset at a fifteen-minute boundary", async () => {
  const boundary = Math.floor(now.getTime() / 900_000) * 900_000 + 900_000;
  const beforeBoundary = new Date(boundary - 1000), afterBoundary = new Date(boundary + 1000);
  const row = await fixture(beforeBoundary);
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.challenge; i++) await assert.rejects(wrong(row, origin, beforeBoundary), InvalidTotpCodeError);
  await assert.rejects(wrong(row, origin, afterBoundary), MfaLoginThrottledError);
});

test("TOTP and recovery remain valid within budget, verify this session and remain single-use", async () => {
  const row = await fixture();
  const first = await completeMfaLogin({ challengeToken: row.challenge.token, code: row.valid, origin, now });
  assert.ok(first.sessionToken);
  const verified = await db.session.findUniqueOrThrow({ where: { id: first.session.id } });
  assert.deepEqual(verified.mfaVerifiedAt, now);
  const recovery = await generateRecoveryCodes(row.id, now);
  const challenge = await createMfaChallenge({ userId: row.id, now });
  const second = await completeMfaLoginWithRecoveryCode({ challengeToken: challenge.token, recoveryCode: recovery.codes[0], origin, now });
  const recovered = await db.session.findUniqueOrThrow({ where: { id: second.session.id } });
  assert.deepEqual(recovered.mfaVerifiedAt, now);
  assert.equal(await db.mfaRecoveryCode.count({ where: { userId: row.id, usedAt: { not: null } } }), 1);
  await assert.rejects(completeMfaLoginWithRecoveryCode({ challengeToken: challenge.token, recoveryCode: recovery.codes[0], origin, now }));
  assert.equal(await db.session.count(), 2);
});

test("recovery codes share the challenge budget and are not consumed after throttling", async () => {
  const row = await fixture(), recovery = await generateRecoveryCodes(row.id, now);
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.challenge; i++) await assert.rejects(wrong(row), InvalidTotpCodeError);
  await assert.rejects(completeMfaLoginWithRecoveryCode({ challengeToken: row.challenge.token, recoveryCode: recovery.codes[0], origin, now }), MfaLoginThrottledError);
  assert.equal(await db.mfaRecoveryCode.count({ where: { userId: row.id, usedAt: { not: null } } }), 0);
  assert.equal(await db.session.count(), 0);
});

test("HTTP429 clears only the challenge cookie and preserves existing verified sessions", async () => {
  const row = await fixture(new Date());
  const previous = await createSession({ userId: row.id, mfaVerified: true });
  const before = await db.session.findUniqueOrThrow({ where: { id: previous.session.id } });
  const attempt = () => {
    const result = request(row.challenge.token, row.invalid);
    result.headers.set("cookie", `${MFA_CHALLENGE_COOKIE_NAME}=${row.challenge.token}; pap_session=${previous.token}`);
    return result;
  };
  for (let i = 0; i < MFA_LOGIN_ATTEMPT_LIMITS.challenge; i++) {
    const response = await POST(attempt());
    assert.equal(response.status, 401);
  }
  const response = await POST(attempt());
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "MFA_TEMPORARILY_UNAVAILABLE" });
  assert.equal(response.headers.get("Retry-After"), "900");
  assert.match(response.headers.get("set-cookie") || "", /pap_mfa_challenge=;.*Max-Age=0/i);
  assert.doesNotMatch(response.headers.get("set-cookie") || "", /pap_session=/);
  assert.equal(await db.session.count(), 1);
  const after = await db.session.findUniqueOrThrow({ where: { id: previous.session.id } });
  assert.equal(after.revokedAt, null);
  assert.equal(after.tokenHash, before.tokenHash);
  assert.deepEqual(after.mfaVerifiedAt, before.mfaVerifiedAt);
});

test("revoked and expired challenges fail before reserving attempts", async () => {
  const row = await fixture();
  await db.mfaChallenge.updateMany({ where: { userId: row.id }, data: { revokedAt: now } });
  await assert.rejects(wrong(row), InvalidMfaChallengeError);
  const past = new Date(now.getTime() - 600_000), old = await fixture(past);
  await assert.rejects(wrong(old), ExpiredMfaChallengeError);
  assert.equal(await db.betaAbuseBucket.count(), 0);
});

test("persisted buckets and denial audits contain hashes and scope, never IP, codes or bearer tokens", async () => {
  const row = await fixture();
  for (let i = 0; i < 5; i++) await assert.rejects(wrong(row), InvalidTotpCodeError);
  await assert.rejects(wrong(row), MfaLoginThrottledError);
  const buckets = await db.betaAbuseBucket.findMany();
  assert.ok(buckets.length > 0);
  assert.ok(buckets.every(bucket => /^[a-f0-9]{64}$/.test(bucket.key)));
  const events = await db.auditEvent.findMany({ where: { action: "MFA_LOGIN_THROTTLED" } });
  assert.ok(events.length > 0);
  const persisted = JSON.stringify({ buckets, events });
  for (const value of [origin, row.challenge.token, row.factor.secretEncrypted]) assert.equal(persisted.includes(value), false);
  assert.ok(events.every(event => ["ORIGIN", "IDENTITY", "CHALLENGE"].includes((event.metadata as { scope: string }).scope)));
});
