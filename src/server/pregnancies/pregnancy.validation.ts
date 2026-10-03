import {
  InvalidPregnancyDateError,
  InvalidPregnancyNumberError,
} from "./pregnancy.errors";

export function normalizePregnancyDate(
  value:
    | Date
    | string
    | null
    | undefined,
): Date | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(
          value.getTime(),
        )
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new InvalidPregnancyDateError();
  }

  return date;
}

export function normalizeHistoricalPregnancyDate(
  value:
    | Date
    | string
    | null
    | undefined,
): Date | null {
  const date =
    normalizePregnancyDate(
      value,
    );

  if (!date) {
    return null;
  }

  if (
    date.getTime() >
    Date.now()
  ) {
    throw new InvalidPregnancyDateError();
  }

  return date;
}

export function normalizePregnancyCount(
  value:
    | number
    | null
    | undefined,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new InvalidPregnancyNumberError();
  }

  return value;
}
