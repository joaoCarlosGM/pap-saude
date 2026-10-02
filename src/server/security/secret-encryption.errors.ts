export class SecretEncryptionError extends Error {
  constructor(message = "Secret encryption failed") {
    super(message);
    this.name = "SecretEncryptionError";
  }
}

export class SecretEncryptionConfigurationError extends SecretEncryptionError {
  constructor(message = "Secret encryption configuration is invalid") {
    super(message);
    this.name = "SecretEncryptionConfigurationError";
  }
}

export class SecretDecryptionError extends SecretEncryptionError {
  constructor() {
    super("Secret decryption failed");
    this.name = "SecretDecryptionError";
  }
}
