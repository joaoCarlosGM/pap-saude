export class PatientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PatientNotFoundError extends PatientError {
  constructor() {
    super("Patient not found");
  }
}

export class PatientCpfConflictError extends PatientError {
  constructor() {
    super("A patient with this CPF already exists");
  }
}

export class PatientCnsConflictError extends PatientError {
  constructor() {
    super("A patient with this CNS already exists");
  }
}

export class InvalidPatientNameError extends PatientError {
  constructor() {
    super("Patient full name is invalid");
  }
}

export class InvalidPatientCpfError extends PatientError {
  constructor() {
    super("Patient CPF is invalid");
  }
}

export class InvalidPatientCnsError extends PatientError {
  constructor() {
    super("Patient CNS is invalid");
  }
}

export class InvalidPatientBirthDateError extends PatientError {
  constructor() {
    super("Patient birth date is invalid");
  }
}

export class InvalidPatientStateError extends PatientError {
  constructor() {
    super("Patient state is invalid");
  }
}
