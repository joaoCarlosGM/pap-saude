export class MfaError extends Error {
  constructor(message = "MFA operation failed") {
    super(message);
    this.name = "MfaError";
  }
}

export class MfaUserUnavailableError extends MfaError {
  constructor() {
    super("MFA user unavailable");
    this.name = "MfaUserUnavailableError";
  }
}

export class MfaFactorUnavailableError extends MfaError {
  constructor() {
    super("MFA factor unavailable");
    this.name = "MfaFactorUnavailableError";
  }
}

export class MfaEnrollmentExpiredError extends MfaError {
  constructor() {
    super("MFA enrollment expired");
    this.name = "MfaEnrollmentExpiredError";
  }
}

export class InvalidTotpCodeError extends MfaError {
  constructor() {
    super("Invalid TOTP code");
    this.name = "InvalidTotpCodeError";
  }
}
