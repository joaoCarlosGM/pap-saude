import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import {
  MFA_SECRET_AAD,
  MFA_SECRET_AUTH_TAG_BYTES,
  MFA_SECRET_CIPHER_VERSION,
  MFA_SECRET_DEFAULT_KEY_ID,
  MFA_SECRET_IV_BYTES,
  MFA_SECRET_KEY_ENV,
  MFA_SECRET_KEY_ID_ENV,
} from "./constants";

import {
  SecretDecryptionError,
  SecretEncryptionConfigurationError,
  SecretEncryptionError,
} from "./secret-encryption.errors";

export interface SecretEncryptionKey {
  id: string;
  key: Buffer;
}

export interface SecretCiphertextParts {
  version: string;
  keyId: string;
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

function decodeKeyMaterial(
  encoded: string,
): Buffer {
  let key: Buffer;

  try {
    key = Buffer.from(
      encoded,
      "base64url",
    );
  } catch {
    throw new SecretEncryptionConfigurationError();
  }

  if (key.length !== 32) {
    throw new SecretEncryptionConfigurationError(
      "MFA encryption key must decode to exactly 32 bytes",
    );
  }

  return key;
}

export function loadMfaEncryptionKey(): SecretEncryptionKey {
  const encoded =
    process.env[MFA_SECRET_KEY_ENV]?.trim();

  if (!encoded) {
    throw new SecretEncryptionConfigurationError(
      `${MFA_SECRET_KEY_ENV} is required`,
    );
  }

  const id =
    process.env[MFA_SECRET_KEY_ID_ENV]?.trim() ||
    MFA_SECRET_DEFAULT_KEY_ID;

  if (
    !/^[A-Za-z0-9_-]{1,64}$/.test(id)
  ) {
    throw new SecretEncryptionConfigurationError(
      `${MFA_SECRET_KEY_ID_ENV} is invalid`,
    );
  }

  return {
    id,
    key: decodeKeyMaterial(encoded),
  };
}

export function parseSecretCiphertext(
  value: string,
): SecretCiphertextParts {
  const parts = value.split(".");

  if (parts.length !== 5) {
    throw new SecretDecryptionError();
  }

  const [
    version,
    keyId,
    ivEncoded,
    tagEncoded,
    ciphertextEncoded,
  ] = parts;

  if (
    version !== MFA_SECRET_CIPHER_VERSION ||
    !keyId ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded
  ) {
    throw new SecretDecryptionError();
  }

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertext: Buffer;

  try {
    iv = Buffer.from(
      ivEncoded,
      "base64url",
    );

    authTag = Buffer.from(
      tagEncoded,
      "base64url",
    );

    ciphertext = Buffer.from(
      ciphertextEncoded,
      "base64url",
    );
  } catch {
    throw new SecretDecryptionError();
  }

  if (
    iv.length !== MFA_SECRET_IV_BYTES ||
    authTag.length !== MFA_SECRET_AUTH_TAG_BYTES ||
    ciphertext.length === 0
  ) {
    throw new SecretDecryptionError();
  }

  return {
    version,
    keyId,
    iv,
    authTag,
    ciphertext,
  };
}

export function encryptSecret(
  plaintext: string,
  encryptionKey = loadMfaEncryptionKey(),
): string {
  if (
    typeof plaintext !== "string" ||
    plaintext.length === 0
  ) {
    throw new SecretEncryptionError(
      "Secret must be a non-empty string",
    );
  }

  const iv =
    randomBytes(MFA_SECRET_IV_BYTES);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      encryptionKey.key,
      iv,
      {
        authTagLength:
          MFA_SECRET_AUTH_TAG_BYTES,
      },
    );

  cipher.setAAD(
    Buffer.from(
      MFA_SECRET_AAD,
      "utf8",
    ),
  );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8",
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    MFA_SECRET_CIPHER_VERSION,
    encryptionKey.id,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(
  encrypted: string,
  encryptionKey = loadMfaEncryptionKey(),
): string {
  const parsed =
    parseSecretCiphertext(encrypted);

  if (
    parsed.keyId !==
    encryptionKey.id
  ) {
    throw new SecretDecryptionError();
  }

  try {
    const decipher =
      createDecipheriv(
        "aes-256-gcm",
        encryptionKey.key,
        parsed.iv,
        {
          authTagLength:
            MFA_SECRET_AUTH_TAG_BYTES,
        },
      );

    decipher.setAAD(
      Buffer.from(
        MFA_SECRET_AAD,
        "utf8",
      ),
    );

    decipher.setAuthTag(
      parsed.authTag,
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          parsed.ciphertext,
        ),
        decipher.final(),
      ]);

    return plaintext.toString(
      "utf8",
    );
  } catch {
    throw new SecretDecryptionError();
  }
}
