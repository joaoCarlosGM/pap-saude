export class PregnancyError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PregnancyNotFoundError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy not found",
    );
  }
}

export class ActivePregnancyConflictError
  extends PregnancyError {
  constructor() {
    super(
      "Patient already has an active pregnancy",
    );
  }
}

export class InactivePatientPregnancyError
  extends PregnancyError {
  constructor() {
    super(
      "Inactive patient cannot start a pregnancy episode",
    );
  }
}

export class InvalidPregnancyDateError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy date is invalid",
    );
  }
}

export class InvalidPregnancyNumberError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy obstetric count is invalid",
    );
  }
}

export class PregnancyAlreadyEndedError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy episode has already ended",
    );
  }
}
