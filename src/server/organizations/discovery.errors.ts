export class OrganizationDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationDiscoveryError";
  }
}

export class OrganizationCandidateUnavailableError
  extends OrganizationDiscoveryError {
  constructor() {
    super("Organization candidate unavailable");
    this.name = "OrganizationCandidateUnavailableError";
  }
}

export class InvalidOrganizationCandidateError
  extends OrganizationDiscoveryError {
  constructor() {
    super("Invalid organization candidate");
    this.name = "InvalidOrganizationCandidateError";
  }
}

export class InvalidCandidateTransitionError
  extends OrganizationDiscoveryError {
  constructor() {
    super("Invalid organization candidate transition");
    this.name = "InvalidCandidateTransitionError";
  }
}

export class ExistingOrganizationFoundError
  extends OrganizationDiscoveryError {
  readonly organizationId: string;

  constructor(organizationId: string) {
    super("Organization already exists");
    this.name = "ExistingOrganizationFoundError";
    this.organizationId = organizationId;
  }
}
