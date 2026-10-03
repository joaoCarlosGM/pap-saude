export class EncounterError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EncounterNotFoundError
  extends EncounterError {
  constructor() {
    super(
      "Encounter not found",
    );
  }
}

export class InvalidEncounterTransitionError
  extends EncounterError {
  constructor() {
    super(
      "Encounter status transition is invalid",
    );
  }
}

export class EncounterFinalizedError
  extends EncounterError {
  constructor() {
    super(
      "Finalized encounter cannot be modified",
    );
  }
}

export class InvalidEncounterDateError
  extends EncounterError {
  constructor() {
    super(
      "Encounter date is invalid",
    );
  }
}

export class InvalidEncounterOrganizationError
  extends EncounterError {
  constructor() {
    super(
      "Encounter organization must be an active health unit",
    );
  }
}

export class EncounterPatientNotLinkedError
  extends EncounterError {
  constructor() {
    super(
      "Patient is not actively linked to encounter organization",
    );
  }
}

export class InactivePatientEncounterError
  extends EncounterError {
  constructor() {
    super(
      "Inactive patient cannot start an encounter",
    );
  }
}

export class EncounterPregnancyNotFoundError
  extends EncounterError {
  constructor() {
    super(
      "Pregnancy linked to encounter was not found",
    );
  }
}

export class EncounterPregnancyMismatchError
  extends EncounterError {
  constructor() {
    super(
      "Pregnancy does not belong to encounter patient",
    );
  }
}

export class EncounterPregnancyNotActiveError
  extends EncounterError {
  constructor() {
    super(
      "Encounter can only be linked to an active pregnancy",
    );
  }
}

export class InvalidEncounterPregnancyDateError
  extends EncounterError {
  constructor() {
    super(
      "Encounter occurrence is inconsistent with pregnancy timeline",
    );
  }
}

export class InvalidChiefComplaintError
  extends EncounterError {
  constructor() {
    super(
      "Chief complaint is invalid",
    );
  }
}

export class InvalidCancellationReasonError
  extends EncounterError {
  constructor() {
    super(
      "Encounter cancellation reason is invalid",
    );
  }
}
