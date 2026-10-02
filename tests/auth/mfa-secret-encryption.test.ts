import assert from "node:assert/strict";
import {
  after,
  before,
  test,
} from "node:test";
import {
  randomBytes,
} from "node:crypto";

import {
  decryptSecret,
  encryptSecret,
  loadMfaEncryptionKey,
  parseSecretCiphertext,
} from "../../src/server/security/secret-encryption";

import {
  SecretDecryptionError,
  SecretEncryptionConfigurationError,
} from "../../src/server/security/secret-encryption.errors";

import {
  MFA_SECRET_KEY_ENV,
  MFA_SECRET_KEY_ID_ENV,
} from "../../src/server/security/constants";

const originalKey =
  process.env[MFA_SECRET_KEY_ENV];

const originalKeyId =
  process.env[MFA_SECRET_KEY_ID_ENV];

const TEST_KEY =
  randomBytes(32).toString(
    "base64url",
  );

before(() => {
  process.env[MFA_SECRET_KEY_ENV] =
    TEST_KEY;

  process.env[MFA_SECRET_KEY_ID_ENV] =
    "test-primary";
});

after(() => {
  if (
    originalKey === undefined
  ) {
    delete process.env[
      MFA_SECRET_KEY_ENV
    ];
  } else {
    process.env[
      MFA_SECRET_KEY_ENV
    ] = originalKey;
  }

  if (
    originalKeyId === undefined
  ) {
    delete process.env[
      MFA_SECRET_KEY_ID_ENV
    ];
  } else {
    process.env[
      MFA_SECRET_KEY_ID_ENV
    ] = originalKeyId;
  }
});

test(
  "MFA secret round-trips through AES-256-GCM",
  () => {
    const secret =
      "JBSWY3DPEHPK3PXP";

    const encrypted =
      encryptSecret(secret);

    const decrypted =
      decryptSecret(encrypted);

    assert.equal(
      decrypted,
      secret,
    );

    assert.notEqual(
      encrypted,
      secret,
    );
  },
);

test(
  "ciphertext is versioned and contains key id",
  () => {
    const encrypted =
      encryptSecret(
        "JBSWY3DPEHPK3PXP",
      );

    const parsed =
      parseSecretCiphertext(
        encrypted,
      );

    assert.equal(
      parsed.version,
      "v1",
    );

    assert.equal(
      parsed.keyId,
      "test-primary",
    );

    assert.equal(
      parsed.iv.length,
      12,
    );

    assert.equal(
      parsed.authTag.length,
      16,
    );
  },
);

test(
  "same secret produces different ciphertext",
  () => {
    const secret =
      "JBSWY3DPEHPK3PXP";

    const first =
      encryptSecret(secret);

    const second =
      encryptSecret(secret);

    assert.notEqual(
      first,
      second,
    );

    assert.equal(
      decryptSecret(first),
      secret,
    );

    assert.equal(
      decryptSecret(second),
      secret,
    );
  },
);

test(
  "tampered ciphertext fails authentication",
  () => {
    const encrypted =
      encryptSecret(
        "JBSWY3DPEHPK3PXP",
      );

    const parts =
      encrypted.split(".");

    assert.equal(
      parts.length,
      5,
    );

    const ciphertext =
      Buffer.from(
        parts[4],
        "base64url",
      );

    ciphertext[0] ^= 0x01;

    parts[4] =
      ciphertext.toString(
        "base64url",
      );

    assert.throws(
      () =>
        decryptSecret(
          parts.join("."),
        ),
      SecretDecryptionError,
    );
  },
);

test(
  "tampered authentication tag fails",
  () => {
    const encrypted =
      encryptSecret(
        "JBSWY3DPEHPK3PXP",
      );

    const parts =
      encrypted.split(".");

    const tag =
      Buffer.from(
        parts[3],
        "base64url",
      );

    tag[0] ^= 0x01;

    parts[3] =
      tag.toString(
        "base64url",
      );

    assert.throws(
      () =>
        decryptSecret(
          parts.join("."),
        ),
      SecretDecryptionError,
    );
  },
);

test(
  "different key id is rejected",
  () => {
    const encrypted =
      encryptSecret(
        "JBSWY3DPEHPK3PXP",
      );

    process.env[
      MFA_SECRET_KEY_ID_ENV
    ] = "rotated-key";

    assert.throws(
      () =>
        decryptSecret(
          encrypted,
        ),
      SecretDecryptionError,
    );

    process.env[
      MFA_SECRET_KEY_ID_ENV
    ] = "test-primary";
  },
);

test(
  "missing encryption key fails closed",
  () => {
    const saved =
      process.env[
        MFA_SECRET_KEY_ENV
      ];

    delete process.env[
      MFA_SECRET_KEY_ENV
    ];

    assert.throws(
      () =>
        loadMfaEncryptionKey(),
      SecretEncryptionConfigurationError,
    );

    process.env[
      MFA_SECRET_KEY_ENV
    ] = saved;
  },
);

test(
  "wrong key size fails closed",
  () => {
    const saved =
      process.env[
        MFA_SECRET_KEY_ENV
      ];

    process.env[
      MFA_SECRET_KEY_ENV
    ] =
      randomBytes(16).toString(
        "base64url",
      );

    assert.throws(
      () =>
        loadMfaEncryptionKey(),
      SecretEncryptionConfigurationError,
    );

    process.env[
      MFA_SECRET_KEY_ENV
    ] = saved;
  },
);

test(
  "empty secrets are rejected",
  () => {
    assert.throws(
      () =>
        encryptSecret(""),
    );
  },
);
