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


export class InvalidMfaChallengeError extends MfaError {
  constructor() {
    super("Invalid MFA challenge");
    this.name = "InvalidMfaChallengeError";
  }
}

export class ExpiredMfaChallengeError extends MfaError {
  constructor() {
    super("MFA challenge expired");
    this.name = "ExpiredMfaChallengeError";
  }
}

export class ConsumedMfaChallengeError extends MfaError {
  constructor() {
    super("MFA challenge already consumed");
    this.name = "ConsumedMfaChallengeError";
  }
}

export class TotpReplayError extends MfaError {
  constructor() {
    super("TOTP code was already used");
    this.name = "TotpReplayError";
  }
}


export class InvalidRecoveryCodeError extends MfaError {
  constructor() {
    super("Invalid recovery code");
    this.name = "InvalidRecoveryCodeError";
  }
}


export class MfaResetTargetUnavailableError extends MfaError {
  constructor() {
    super("MFA reset target unavailable");
    this.name = "MfaResetTargetUnavailableError";
  }
}
