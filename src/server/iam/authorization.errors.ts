export class AuthorizationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "AuthorizationError"
  }
}

export class AccessDeniedError extends AuthorizationError {
  constructor() {
    super(
      "ACCESS_DENIED",
      "The actor is not authorized to perform this action.",
    )
  }
}
