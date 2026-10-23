export class AdminRoleError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code)
    this.name =
      "AdminRoleError"
  }
}

export class LastPapAdminError
  extends AdminRoleError {
  constructor() {
    super(
      "LAST_PAP_ADMIN",
      409,
    )
  }
}

export class AdminRoleAssignmentNotFoundError
  extends AdminRoleError {
  constructor() {
    super(
      "ROLE_ASSIGNMENT_NOT_FOUND",
      404,
    )
  }
}

export class UnsupportedAdminRoleError
  extends AdminRoleError {
  constructor() {
    super(
      "UNSUPPORTED_ROLE",
      400,
    )
  }
}

export class ConcurrentAdminRoleMutationError
  extends AdminRoleError {
  constructor() {
    super(
      "ROLE_ASSIGNMENT_CONFLICT",
      409,
    )
  }
}

export class PendingAccessAuthorizationError extends AdminRoleError {
  constructor() { super("PENDING_ACCESS_AUTHORIZATION", 409); }
}
