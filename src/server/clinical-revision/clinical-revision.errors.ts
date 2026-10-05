export class InvalidClinicalRevisionError
  extends Error {
  constructor(
    public readonly field: string,
  ) {
    super(
      `Invalid clinical revision: ${field}.`,
    );

    this.name =
      "InvalidClinicalRevisionError";
  }
}

export class ClinicalRevisionPatientNotFoundError
  extends Error {
  constructor() {
    super("Patient not found.");

    this.name =
      "ClinicalRevisionPatientNotFoundError";
  }
}

export class ClinicalRevisionActorNotFoundError
  extends Error {
  constructor() {
    super("Revision actor not found.");

    this.name =
      "ClinicalRevisionActorNotFoundError";
  }
}
