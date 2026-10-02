export class OrganizationHealthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "OrganizationHealthError"
  }
}

export class OrganizationHealthAlertNotFoundError
  extends OrganizationHealthError {
  constructor() {
    super(
      "ORGANIZATION_HEALTH_ALERT_NOT_FOUND",
      "Organization health alert does not exist.",
    )
  }
}

export class InvalidOrganizationHealthPeriodError
  extends OrganizationHealthError {
  constructor() {
    super(
      "INVALID_ORGANIZATION_HEALTH_PERIOD",
      "Organization health evaluation period is invalid.",
    )
  }
}

export class InvalidOrganizationHealthAlertTransitionError
  extends OrganizationHealthError {
  constructor(
    from: string,
    to: string,
  ) {
    super(
      "INVALID_ORGANIZATION_HEALTH_ALERT_TRANSITION",
      `Health alert cannot transition from ${from} to ${to}.`,
    )
  }
}
