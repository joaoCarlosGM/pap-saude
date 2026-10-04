export class ClinicalFlagNotFoundError
  extends Error {
  constructor() {
    super("Clinical flag not found.");
    this.name =
      "ClinicalFlagNotFoundError";
  }
}

export class ClinicalFlagPatientNotFoundError
  extends Error {
  constructor() {
    super("Patient not found.");
    this.name =
      "ClinicalFlagPatientNotFoundError";
  }
}

export class ClinicalFlagPatientInactiveError
  extends Error {
  constructor() {
    super(
      "Cannot create clinical flag for inactive patient.",
    );

    this.name =
      "ClinicalFlagPatientInactiveError";
  }
}

export class ClinicalFlagAlreadyActiveError
  extends Error {
  constructor() {
    super(
      "Clinical flag is already active for this patient.",
    );

    this.name =
      "ClinicalFlagAlreadyActiveError";
  }
}

export class ClinicalFlagFinalizedError
  extends Error {
  constructor() {
    super(
      "Finalized clinical flag cannot be modified.",
    );

    this.name =
      "ClinicalFlagFinalizedError";
  }
}

export class InvalidClinicalFlagTransitionError
  extends Error {
  constructor() {
    super(
      "Invalid clinical flag lifecycle transition.",
    );

    this.name =
      "InvalidClinicalFlagTransitionError";
  }
}

export class InvalidClinicalFlagValueError
  extends Error {
  constructor(
    public readonly field: string,
  ) {
    super(
      `Invalid clinical flag value: ${field}.`,
    );

    this.name =
      "InvalidClinicalFlagValueError";
  }
}
