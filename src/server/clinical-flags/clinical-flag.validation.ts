import {
  InvalidClinicalFlagValueError,
} from "./clinical-flag.errors";

const CODE_REGEX =
  /^[A-Z0-9_]{2,64}$/;

const MAX_LABEL_LENGTH =
  200;

const MAX_DETAILS_LENGTH =
  2000;

export function normalizeClinicalFlagCode(
  value: string,
): string {
  const normalized =
    value.trim().toUpperCase();

  if (
    !CODE_REGEX.test(
      normalized,
    )
  ) {
    throw new InvalidClinicalFlagValueError(
      "code",
    );
  }

  return normalized;
}

export function normalizeClinicalFlagLabel(
  value: string,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length >
      MAX_LABEL_LENGTH
  ) {
    throw new InvalidClinicalFlagValueError(
      "label",
    );
  }

  return normalized;
}

export function normalizeClinicalFlagDetails(
  value:
    string | null | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
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
    normalized.length >
    MAX_DETAILS_LENGTH
  ) {
    throw new InvalidClinicalFlagValueError(
      "details",
    );
  }

  return normalized;
}

export function normalizeClinicalFlagNotedAt(
  value?:
    Date | string,
): Date {
  const date =
    value instanceof Date
      ? new Date(
          value.getTime(),
        )
      : value !== undefined
        ? new Date(value)
        : new Date();

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date.getTime() >
      Date.now()
  ) {
    throw new InvalidClinicalFlagValueError(
      "notedAt",
    );
  }

  return date;
}
