export class PatientOrganizationError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PatientOrganizationNotFoundError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient organization link not found",
    );
  }
}

export class PatientAlreadyLinkedError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient is already linked to this organization",
    );
  }
}

export class PatientOrganizationLinkInactiveError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient organization link exists but is inactive",
    );
  }
}

export class InvalidPatientOrganizationTargetError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Patient links are only allowed to active health units",
    );
  }
}

export class InactivePatientOrganizationLinkError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Inactive patients cannot be linked to an organization",
    );
  }
}

export class PatientMedicalRecordConflictError
  extends PatientOrganizationError {
  constructor() {
    super(
      "Medical record number is already in use in this organization",
    );
  }
}
