export class ObstetricDataNotFoundError
  extends Error {
  constructor() {
    super("Obstetric data not found.");
    this.name =
      "ObstetricDataNotFoundError";
  }
}

export class ObstetricDataAlreadyRecordedError
  extends Error {
  constructor() {
    super(
      "Obstetric data already recorded for this encounter.",
    );

    this.name =
      "ObstetricDataAlreadyRecordedError";
  }
}

export class ObstetricDataEncounterNotFoundError
  extends Error {
  constructor() {
    super("Encounter not found.");

    this.name =
      "ObstetricDataEncounterNotFoundError";
  }
}

export class ObstetricDataEncounterNotEditableError
  extends Error {
  constructor() {
    super(
      "Obstetric data cannot be changed for a finalized encounter.",
    );

    this.name =
      "ObstetricDataEncounterNotEditableError";
  }
}

export class InvalidObstetricDataValueError
  extends Error {
  constructor(
    public readonly field: string,
  ) {
    super(
      `Invalid obstetric data value: ${field}.`,
    );

    this.name =
      "InvalidObstetricDataValueError";
  }
}

export class InvalidObstetricDataRecordedAtError
  extends Error {
  constructor() {
    super(
      "Obstetric data recordedAt is invalid for this encounter.",
    );

    this.name =
      "InvalidObstetricDataRecordedAtError";
  }
}
