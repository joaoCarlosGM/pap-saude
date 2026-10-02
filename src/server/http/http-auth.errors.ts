export class HttpAuthenticationRequiredError
  extends Error {
  constructor() {
    super(
      "Authentication is required.",
    )

    this.name =
      "HttpAuthenticationRequiredError"
  }
}

export class HttpAccessDeniedError
  extends Error {
  constructor() {
    super(
      "Access to this resource is denied.",
    )

    this.name =
      "HttpAccessDeniedError"
  }
}

export class InvalidHttpOrganizationContextError
  extends Error {
  constructor() {
    super(
      "A valid organization context is required.",
    )

    this.name =
      "InvalidHttpOrganizationContextError"
  }
}
