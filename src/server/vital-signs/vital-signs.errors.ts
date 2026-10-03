export class VitalSignsNotFoundError
  extends Error {
  constructor() {
    super("Vital signs not found.");
    this.name =
      "VitalSignsNotFoundError";
  }
}

export class VitalSignsAlreadyRecordedError
  extends Error {
  constructor() {
    super(
      "Vital signs already recorded for this encounter.",
    );

    this.name =
      "VitalSignsAlreadyRecordedError";
  }
}

export class VitalSignsEncounterNotFoundError
  extends Error {
  constructor() {
    super("Encounter not found.");

    this.name =
      "VitalSignsEncounterNotFoundError";
  }
}

export class VitalSignsEncounterNotEditableError
  extends Error {
  constructor() {
    super(
      "Vital signs cannot be changed for a finalized encounter.",
    );

    this.name =
      "VitalSignsEncounterNotEditableError";
  }
}

export class InvalidVitalSignValueError
  extends Error {
  constructor(
    public readonly field: string,
  ) {
    super(
      `Invalid vital sign value: ${field}.`,
    );

    this.name =
      "InvalidVitalSignValueError";
  }
}

export class InvalidVitalSignsRecordedAtError
  extends Error {
  constructor() {
    super(
      "Vital signs recordedAt is invalid for this encounter.",
    );

    this.name =
      "InvalidVitalSignsRecordedAtError";
  }
}
