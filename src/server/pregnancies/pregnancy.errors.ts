export class PregnancyError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PregnancyError";
  }
}

export class PregnancyNotFoundError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy not found",
    );
    this.name = "PregnancyNotFoundError";
  }
}

export class ActivePregnancyConflictError
  extends PregnancyError {
  constructor() {
    super(
      "Patient already has an active pregnancy",
    );
    this.name = "ActivePregnancyConflictError";
  }
}

export class InactivePatientPregnancyError
  extends PregnancyError {
  constructor() {
    super(
      "Inactive patient cannot start a pregnancy episode",
    );
    this.name = "InactivePatientPregnancyError";
  }
}

export class InvalidPregnancyDateError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy date is invalid",
    );
    this.name = "InvalidPregnancyDateError";
  }
}

export class InvalidPregnancyNumberError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy obstetric count is invalid",
    );
    this.name = "InvalidPregnancyNumberError";
  }
}

export class PregnancyAlreadyEndedError
  extends PregnancyError {
  constructor() {
    super(
      "Pregnancy episode has already ended",
    );
    this.name = "PregnancyAlreadyEndedError";
  }
}
