import {
  InvalidCancellationReasonError,
  InvalidChiefComplaintError,
  InvalidEncounterDateError,
} from "./encounter.errors";

export function normalizeEncounterDate(
  value:
    | Date
    | string
    | undefined,
): Date {
  const date =
    value === undefined
      ? new Date()
      : value instanceof Date
        ? new Date(
            value.getTime(),
          )
        : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new InvalidEncounterDateError();
  }

  if (
    date.getTime() >
    Date.now()
  ) {
    throw new InvalidEncounterDateError();
  }

  return date;
}

export function normalizeChiefComplaint(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0
  ) {
    return null;
  }

  if (
    normalized.length > 2000
  ) {
    throw new InvalidChiefComplaintError();
  }

  return normalized;
}

export function normalizeCancellationReason(
  value: string,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 500
  ) {
    throw new InvalidCancellationReasonError();
  }

  return normalized;
}
