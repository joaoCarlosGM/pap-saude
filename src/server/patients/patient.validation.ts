import {
  InvalidPatientBirthDateError,
  InvalidPatientCnsError,
  InvalidPatientCpfError,
  InvalidPatientNameError,
  InvalidPatientStateError,
} from "./patient.errors";

export function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function normalizePatientName(
  value: string,
): string {
  const normalized =
    value.trim().replace(/\s+/g, " ");

  if (
    normalized.length < 2 ||
    normalized.length > 200
  ) {
    throw new InvalidPatientNameError();
  }

  return normalized;
}

function normalizeDigits(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.replace(/\D/g, "");

  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

export function normalizePatientCpf(
  value: string | null | undefined,
): string | null {
  const normalized =
    normalizeDigits(value);

  if (normalized == null) {
    return null;
  }

  if (!/^\d{11}$/.test(normalized)) {
    throw new InvalidPatientCpfError();
  }

  return normalized;
}

export function normalizePatientCns(
  value: string | null | undefined,
): string | null {
  const normalized =
    normalizeDigits(value);

  if (normalized == null) {
    return null;
  }

  if (!/^\d{15}$/.test(normalized)) {
    throw new InvalidPatientCnsError();
  }

  return normalized;
}

export function normalizePatientBirthDate(
  value: Date | string,
): Date {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidPatientBirthDateError();
  }

  const now =
    new Date();

  if (date.getTime() > now.getTime()) {
    throw new InvalidPatientBirthDateError();
  }

  return date;
}

export function normalizePatientState(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  if (normalized.length === 0) {
    return null;
  }

  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new InvalidPatientStateError();
  }

  return normalized;
}
