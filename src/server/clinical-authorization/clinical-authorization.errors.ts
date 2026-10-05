export class ClinicalResourceNotFoundError
  extends Error {
  constructor() {
    super("Clinical resource not found.");

    this.name =
      "ClinicalResourceNotFoundError";
  }
}

export class ClinicalResourceOrganizationRequiredError
  extends Error {
  constructor() {
    super(
      "Clinical resource does not resolve to an organization.",
    );

    this.name =
      "ClinicalResourceOrganizationRequiredError";
  }
}
