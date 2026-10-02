export class OrganizationMetricsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "OrganizationMetricsError"
  }
}

export class OrganizationMetricsOrganizationNotFoundError
  extends OrganizationMetricsError {
  constructor() {
    super(
      "ORGANIZATION_METRICS_ORGANIZATION_NOT_FOUND",
      "Organization does not exist.",
    )
  }
}

export class InvalidOrganizationMetricsPeriodError
  extends OrganizationMetricsError {
  constructor() {
    super(
      "INVALID_ORGANIZATION_METRICS_PERIOD",
      "Metrics period must have periodEnd after periodStart.",
    )
  }
}

export class OrganizationMetricsPeriodTooLargeError
  extends OrganizationMetricsError {
  constructor() {
    super(
      "ORGANIZATION_METRICS_PERIOD_TOO_LARGE",
      "Metrics period cannot exceed 366 days.",
    )
  }
}
