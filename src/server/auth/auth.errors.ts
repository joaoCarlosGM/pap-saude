export class AuthenticationError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export class InactiveUserError extends AuthenticationError {
  constructor() {
    super("User is inactive");
    this.name = "InactiveUserError";
  }
}

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}
