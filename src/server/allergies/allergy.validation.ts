import {
  InvalidAllergyValueError,
} from "./allergy.errors";

const MAX_SUBSTANCE_LENGTH =
  200;

const MAX_REACTION_LENGTH =
  1000;

const MAX_SEVERITY_LENGTH =
  100;

export function normalizeAllergySubstance(
  value: string,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length >
      MAX_SUBSTANCE_LENGTH
  ) {
    throw new InvalidAllergyValueError(
      "substance",
    );
  }

  return normalized;
}

function normalizeOptionalText(
  field: string,
  value:
    string | null | undefined,
  maxLength: number,
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
    maxLength
  ) {
    throw new InvalidAllergyValueError(
      field,
    );
  }

  return normalized;
}

export function normalizeAllergyReaction(
  value:
    string | null | undefined,
): string | null {
  return normalizeOptionalText(
    "reaction",
    value,
    MAX_REACTION_LENGTH,
  );
}

export function normalizeAllergySeverity(
  value:
    string | null | undefined,
): string | null {
  return normalizeOptionalText(
    "severity",
    value,
    MAX_SEVERITY_LENGTH,
  );
}

export function normalizeAllergyNotedAt(
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
    throw new InvalidAllergyValueError(
      "notedAt",
    );
  }

  return date;
}
