import {
  EdemaGrade,
} from "@prisma/client";

import {
  InvalidObstetricDataRecordedAtError,
  InvalidObstetricDataValueError,
} from "./obstetric-data.errors";

const MAX_COMPLAINTS_LENGTH =
  2000;

const MAX_NOTES_LENGTH =
  5000;

export function normalizeNonNegativeDecimal(
  field: string,
  value:
    number | null | undefined,
  decimals: number,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  const scale =
    10 ** decimals;

  if (
    Math.abs(
      value * scale -
      Math.round(
        value * scale,
      ),
    ) > 1e-9
  ) {
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  return value;
}

export function normalizePositiveInteger(
  field: string,
  value:
    number | null | undefined,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  return value;
}

export function normalizePositiveDecimal(
  field: string,
  value:
    number | null | undefined,
  decimals: number,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  const scale =
    10 ** decimals;

  if (
    Math.abs(
      value * scale -
      Math.round(
        value * scale,
      ),
    ) > 1e-9
  ) {
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  return value;
}

export function normalizeEdema(
  value: EdemaGrade,
): EdemaGrade {
  if (
    !Object.values(
      EdemaGrade,
    ).includes(value)
  ) {
    throw new InvalidObstetricDataValueError(
      "edema",
    );
  }

  return value;
}

function normalizeText(
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
    throw new InvalidObstetricDataValueError(
      field,
    );
  }

  return normalized;
}

export function normalizeComplaints(
  value:
    string | null | undefined,
): string | null {
  return normalizeText(
    "complaints",
    value,
    MAX_COMPLAINTS_LENGTH,
  );
}

export function normalizeNotes(
  value:
    string | null | undefined,
): string | null {
  return normalizeText(
    "notes",
    value,
    MAX_NOTES_LENGTH,
  );
}

export function normalizeObstetricRecordedAt(
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
    throw new InvalidObstetricDataRecordedAtError();
  }

  return date;
}
