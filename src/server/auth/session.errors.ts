export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export class InvalidSessionError extends SessionError {
  constructor() {
    super("Invalid session");
    this.name = "InvalidSessionError";
  }
}

export class ExpiredSessionError extends SessionError {
  constructor() {
    super("Session expired");
    this.name = "ExpiredSessionError";
  }
}

export class RevokedSessionError extends SessionError {
  constructor() {
    super("Session revoked");
    this.name = "RevokedSessionError";
  }
}

export class InactiveSessionUserError extends SessionError {
  constructor() {
    super("Session user is inactive");
    this.name = "InactiveSessionUserError";
  }
}
