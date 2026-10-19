export class AdminSecurityError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code)
    this.name =
      "AdminSecurityError"
  }
}

export class AdminSecurityTargetNotFoundError
  extends AdminSecurityError {
  constructor() {
    super(
      "SECURITY_TARGET_NOT_FOUND",
      404,
    )
  }
}

export class AdminSecuritySessionNotFoundError
  extends AdminSecurityError {
  constructor() {
    super(
      "SECURITY_SESSION_NOT_FOUND",
      404,
    )
  }
}

export class AdminSecurityPayloadError
  extends AdminSecurityError {
  constructor() {
    super(
      "INVALID_SECURITY_OPERATION",
      400,
    )
  }
}
