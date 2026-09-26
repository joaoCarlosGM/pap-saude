import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  passwordNeedsRehash,
  validatePasswordPolicy,
  verifyPassword,
} from "../../src/server/auth/password";

import { createSessionToken } from "../../src/server/auth/session-token";

import {
  generateSecureToken,
  hashSessionToken,
  safeEqual,
  sha256,
} from "../../src/server/security/crypto";

import { PasswordPolicyError } from "../../src/server/auth/auth.errors";

test("password policy accepts a sufficiently long password", () => {
  assert.doesNotThrow(() => {
    validatePasswordPolicy("UmaSenhaLonga#2026");
  });
});

test("password policy rejects short passwords", () => {
  assert.throws(
    () => validatePasswordPolicy("curta"),
    PasswordPolicyError,
  );
});

test("Argon2id hashes and verifies a password", async () => {
  const password = "PAP-Saude#Foundation02";
  const hash = await hashPassword(password);

  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, "senha-errada"), false);
});

test("invalid password hashes fail closed", async () => {
  assert.equal(
    await verifyPassword("isto-nao-e-argon2", "qualquer-senha"),
    false,
  );
});

test("current Argon2 hash does not need rehash", async () => {
  const hash = await hashPassword("SenhaDeTeste#2026");

  assert.equal(passwordNeedsRehash(hash), false);
});

test("secure tokens are unique", () => {
  const tokens = new Set<string>();

  for (let index = 0; index < 100; index += 1) {
    const token = generateSecureToken();

    assert.ok(token.length >= 40);
    tokens.add(token);
  }

  assert.equal(tokens.size, 100);
});

test("session token stores only its SHA-256 representation", () => {
  const { token, tokenHash } = createSessionToken();

  assert.notEqual(token, tokenHash);
  assert.equal(tokenHash, hashSessionToken(token));
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
});

test("SHA-256 is deterministic", () => {
  const first = sha256("pap-saude");
  const second = sha256("pap-saude");

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("safeEqual compares values safely", () => {
  assert.equal(safeEqual("abcdef", "abcdef"), true);
  assert.equal(safeEqual("abcdef", "abcdeg"), false);
  assert.equal(safeEqual("short", "longer-value"), false);
});
