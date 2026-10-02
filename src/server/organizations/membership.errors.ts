export class MembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipError";
  }
}

export class MembershipUserUnavailableError
  extends MembershipError {
  constructor() {
    super("Membership user unavailable");
    this.name = "MembershipUserUnavailableError";
  }
}

export class MembershipOrganizationUnavailableError
  extends MembershipError {
  constructor() {
    super("Membership organization unavailable");
    this.name = "MembershipOrganizationUnavailableError";
  }
}

export class MembershipStateError
  extends MembershipError {
  constructor() {
    super("Invalid membership state transition");
    this.name = "MembershipStateError";
  }
}

export class MembershipNotFoundError
  extends MembershipError {
  constructor() {
    super("Membership not found");
    this.name = "MembershipNotFoundError";
  }
}
