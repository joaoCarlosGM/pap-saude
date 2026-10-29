export class PatientOrganizationError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatientOrganizationError";
  }
}

export class PatientOrganizationNotFoundError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient organization link not found",
    );
    this.name = "PatientOrganizationNotFoundError";
  }
}

export class PatientAlreadyLinkedError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient is already linked to this organization",
    );
    this.name = "PatientAlreadyLinkedError";
  }
}

export class PatientOrganizationLinkInactiveError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient organization link exists but is inactive",
    );
    this.name = "PatientOrganizationLinkInactiveError";
  }
}

export class InvalidPatientOrganizationTargetError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient links are only allowed to active health units",
    );
    this.name = "InvalidPatientOrganizationTargetError";
  }
}

export class InactivePatientOrganizationLinkError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Inactive patients cannot be linked to an organization",
    );
    this.name = "InactivePatientOrganizationLinkError";
  }
}

export class PatientMedicalRecordConflictError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Medical record number is already in use in this organization",
    );
    this.name = "PatientMedicalRecordConflictError";
  }
}
