export class ProductFeedbackError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ProductFeedbackError"
  }
}

export class ProductFeedbackNotFoundError
  extends ProductFeedbackError {
  constructor() {
    super(
      "PRODUCT_FEEDBACK_NOT_FOUND",
      "Product feedback does not exist.",
    )
  }
}

export class ProductFeedbackOrganizationNotFoundError
  extends ProductFeedbackError {
  constructor() {
    super(
      "PRODUCT_FEEDBACK_ORGANIZATION_NOT_FOUND",
      "Organization does not exist.",
    )
  }
}

export class ProductFeedbackActorNotFoundError
  extends ProductFeedbackError {
  constructor() {
    super(
      "PRODUCT_FEEDBACK_ACTOR_NOT_FOUND",
      "Feedback actor does not exist.",
    )
  }
}

export class ProductFeedbackResolverNotFoundError
  extends ProductFeedbackError {
  constructor() {
    super(
      "PRODUCT_FEEDBACK_RESOLVER_NOT_FOUND",
      "Feedback resolver does not exist.",
    )
  }
}

export class InvalidProductFeedbackScoreError
  extends ProductFeedbackError {
  constructor() {
    super(
      "INVALID_PRODUCT_FEEDBACK_SCORE",
      "Satisfaction score must be between 1 and 5.",
    )
  }
}

export class InvalidProductFeedbackMessageError
  extends ProductFeedbackError {
  constructor(message: string) {
    super(
      "INVALID_PRODUCT_FEEDBACK_MESSAGE",
      message,
    )
  }
}

export class InvalidProductFeedbackTransitionError
  extends ProductFeedbackError {
  constructor(
    from: string,
    to: string,
  ) {
    super(
      "INVALID_PRODUCT_FEEDBACK_TRANSITION",
      `Feedback cannot transition from ${from} to ${to}.`,
    )
  }
}
