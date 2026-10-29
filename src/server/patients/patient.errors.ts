export class PatientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatientError";
  }
}

export class PatientNotFoundError extends PatientError {
  constructor() {
    super("Patient not found");
    this.name = "PatientNotFoundError";
  }
}

export class PatientCpfConflictError extends PatientError {
  constructor() {
    super("A patient with this CPF already exists");
    this.name = "PatientCpfConflictError";
  }
}

export class PatientCnsConflictError extends PatientError {
  constructor() {
    super("A patient with this CNS already exists");
    this.name = "PatientCnsConflictError";
  }
}

export class InvalidPatientNameError extends PatientError {
  constructor() {
    super("Patient full name is invalid");
    this.name = "InvalidPatientNameError";
  }
}

export class InvalidPatientCpfError extends PatientError {
  constructor() {
    super("Patient CPF is invalid");
    this.name = "InvalidPatientCpfError";
  }
}

export class InvalidPatientCnsError extends PatientError {
  constructor() {
    super("Patient CNS is invalid");
    this.name = "InvalidPatientCnsError";
  }
}

export class InvalidPatientBirthDateError extends PatientError {
  constructor() {
    super("Patient birth date is invalid");
    this.name = "InvalidPatientBirthDateError";
  }
}

export class InvalidPatientStateError extends PatientError {
  constructor() {
    super("Patient state is invalid");
    this.name = "InvalidPatientStateError";
  }
}
