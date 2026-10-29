export class EncounterError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncounterError";
  }
}

export class EncounterNotFoundError
  extends EncounterError {
  constructor() {
    super(
      "Encounter not found",
    );
    this.name = "EncounterNotFoundError";
  }
}

export class InvalidEncounterTransitionError
  extends EncounterError {
  constructor() {
    super(
      "Encounter status transition is invalid",
    );
    this.name = "InvalidEncounterTransitionError";
  }
}

export class EncounterFinalizedError
  extends EncounterError {
  constructor() {
    super(
      "Finalized encounter cannot be modified",
    );
    this.name = "EncounterFinalizedError";
  }
}

export class InvalidEncounterDateError
  extends EncounterError {
  constructor() {
    super(
      "Encounter date is invalid",
    );
    this.name = "InvalidEncounterDateError";
  }
}

export class InvalidEncounterOrganizationError
  extends EncounterError {
  constructor() {
    super(
      "Encounter organization must be an active health unit",
    );
    this.name = "InvalidEncounterOrganizationError";
  }
}

export class EncounterPatientNotLinkedError
  extends EncounterError {
  constructor() {
    super(
      "Patient is not actively linked to encounter organization",
    );
    this.name = "EncounterPatientNotLinkedError";
  }
}

export class InactivePatientEncounterError
  extends EncounterError {
  constructor() {
    super(
      "Inactive patient cannot start an encounter",
    );
    this.name = "InactivePatientEncounterError";
  }
}

export class EncounterPregnancyNotFoundError
  extends EncounterError {
  constructor() {
    super(
      "Pregnancy linked to encounter was not found",
    );
    this.name = "EncounterPregnancyNotFoundError";
  }
}

export class EncounterPregnancyMismatchError
  extends EncounterError {
  constructor() {
    super(
      "Pregnancy does not belong to encounter patient",
    );
    this.name = "EncounterPregnancyMismatchError";
  }
}

export class EncounterPregnancyNotActiveError
  extends EncounterError {
  constructor() {
    super(
      "Encounter can only be linked to an active pregnancy",
    );
    this.name = "EncounterPregnancyNotActiveError";
  }
}

export class InvalidEncounterPregnancyDateError
  extends EncounterError {
  constructor() {
    super(
      "Encounter occurrence is inconsistent with pregnancy timeline",
    );
    this.name = "InvalidEncounterPregnancyDateError";
  }
}

export class InvalidChiefComplaintError
  extends EncounterError {
  constructor() {
    super(
      "Chief complaint is invalid",
    );
    this.name = "InvalidChiefComplaintError";
  }
}

export class InvalidCancellationReasonError
  extends EncounterError {
  constructor() {
    super(
      "Encounter cancellation reason is invalid",
    );
    this.name = "InvalidCancellationReasonError";
  }
}
