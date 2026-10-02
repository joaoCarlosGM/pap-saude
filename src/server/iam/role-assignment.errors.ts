export class RoleAssignmentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "RoleAssignmentError"
  }
}

export class RoleNotFoundError extends RoleAssignmentError {
  constructor() {
    super(
      "ROLE_NOT_FOUND",
      "The requested role does not exist.",
    )
  }
}

export class InvalidRoleScopeError extends RoleAssignmentError {
  constructor(message: string) {
    super("INVALID_ROLE_SCOPE", message)
  }
}

export class InactiveOrganizationError extends RoleAssignmentError {
  constructor() {
    super(
      "ORGANIZATION_NOT_ACTIVE",
      "Role assignments require an active organization.",
    )
  }
}

export class ActiveMembershipRequiredError extends RoleAssignmentError {
  constructor() {
    super(
      "ACTIVE_MEMBERSHIP_REQUIRED",
      "An active organization membership is required.",
    )
  }
}
