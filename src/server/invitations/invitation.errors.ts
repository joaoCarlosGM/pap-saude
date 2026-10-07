export class InvitationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code)
    this.name =
      "InvitationError"
  }
}

export class InvalidInvitationError
  extends InvitationError {
  constructor() {
    super(
      "INVITATION_INVALID_OR_EXPIRED",
      410,
    )
  }
}

export class InvitationConflictError
  extends InvitationError {
  constructor(
    code =
      "INVITATION_CONFLICT",
  ) {
    super(
      code,
      409,
    )
  }
}

export class InvitationPayloadError
  extends InvitationError {
  constructor() {
    super(
      "INVALID_INVITATION_PAYLOAD",
      400,
    )
  }
}

export class EmailDeliveryError
  extends InvitationError {
  constructor() {
    super(
      "EMAIL_DELIVERY_FAILED",
      503,
    )
  }
}
