export class AllergyNotFoundError
  extends Error {
  constructor() {
    super("Allergy not found.");
    this.name =
      "AllergyNotFoundError";
  }
}

export class AllergyPatientNotFoundError
  extends Error {
  constructor() {
    super("Patient not found.");
    this.name =
      "AllergyPatientNotFoundError";
  }
}

export class AllergyPatientInactiveError
  extends Error {
  constructor() {
    super(
      "Cannot create allergy for inactive patient.",
    );

    this.name =
      "AllergyPatientInactiveError";
  }
}

export class AllergyFinalizedError
  extends Error {
  constructor() {
    super(
      "Finalized allergy record cannot be modified.",
    );

    this.name =
      "AllergyFinalizedError";
  }
}

export class InvalidAllergyTransitionError
  extends Error {
  constructor() {
    super(
      "Invalid allergy lifecycle transition.",
    );

    this.name =
      "InvalidAllergyTransitionError";
  }
}

export class InvalidAllergyValueError
  extends Error {
  constructor(
    public readonly field: string,
  ) {
    super(
      `Invalid allergy value: ${field}.`,
    );

    this.name =
      "InvalidAllergyValueError";
  }
}
