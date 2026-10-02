export class ProductActivityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ProductActivityError"
  }
}

export class InvalidProductActivityEventError
  extends ProductActivityError {
  constructor(message: string) {
    super(
      "INVALID_PRODUCT_ACTIVITY_EVENT",
      message,
    )
  }
}

export class UnsafeProductActivityMetadataError
  extends ProductActivityError {
  constructor(key: string) {
    super(
      "UNSAFE_PRODUCT_ACTIVITY_METADATA",
      `Metadata key "${key}" is not permitted for product activity telemetry.`,
    )
  }
}

export class ProductActivityActorNotFoundError
  extends ProductActivityError {
  constructor() {
    super(
      "PRODUCT_ACTIVITY_ACTOR_NOT_FOUND",
      "Product activity actor does not exist.",
    )
  }
}

export class ProductActivityOrganizationNotFoundError
  extends ProductActivityError {
  constructor() {
    super(
      "PRODUCT_ACTIVITY_ORGANIZATION_NOT_FOUND",
      "Product activity organization does not exist.",
    )
  }
}
