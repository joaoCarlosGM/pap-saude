export class OrganizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationError";
  }
}

export class OrganizationNotFoundError
  extends OrganizationError {
  constructor() {
    super("Organization not found");
    this.name = "OrganizationNotFoundError";
  }
}

export class InvalidOrganizationHierarchyError
  extends OrganizationError {
  constructor() {
    super("Invalid organization hierarchy");
    this.name = "InvalidOrganizationHierarchyError";
  }
}

export class InvalidOrganizationIdentifierError
  extends OrganizationError {
  constructor() {
    super("Invalid organization identifier");
    this.name = "InvalidOrganizationIdentifierError";
  }
}

export class OrganizationAlreadyArchivedError
  extends OrganizationError {
  constructor() {
    super("Organization already archived");
    this.name = "OrganizationAlreadyArchivedError";
  }
}
