import {
  ConsciousnessState,
  ProteinuriaResult,
} from "@prisma/client";

import {
  InvalidVitalSignValueError,
  InvalidVitalSignsRecordedAtError,
} from "./vital-signs.errors";

export function normalizePositiveInteger(
  field: string,
  value: number,
): number {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new InvalidVitalSignValueError(
      field,
    );
  }

  return value;
}

export function normalizeTemperature(
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
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InvalidVitalSignValueError(
      "temperature",
    );
  }

  const scaled =
    value * 10;

  if (
    Math.abs(
      scaled -
      Math.round(scaled),
    ) > 1e-9
  ) {
    throw new InvalidVitalSignValueError(
      "temperature",
    );
  }

  return value;
}

export function normalizeOxygenSaturation(
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
    value < 0 ||
    value > 100
  ) {
    throw new InvalidVitalSignValueError(
      "oxygenSaturation",
    );
  }

  return value;
}

export function normalizeUrineOutput(
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
    value < 0
  ) {
    throw new InvalidVitalSignValueError(
      "urineOutputMl",
    );
  }

  return value;
}

export function normalizeConsciousness(
  value: ConsciousnessState,
): ConsciousnessState {
  if (
    !Object.values(
      ConsciousnessState,
    ).includes(value)
  ) {
    throw new InvalidVitalSignValueError(
      "consciousness",
    );
  }

  return value;
}

export function normalizeProteinuria(
  value: ProteinuriaResult,
): ProteinuriaResult {
  if (
    !Object.values(
      ProteinuriaResult,
    ).includes(value)
  ) {
    throw new InvalidVitalSignValueError(
      "proteinuria",
    );
  }

  return value;
}

export function normalizeVitalSignsRecordedAt(
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
    )
  ) {
    throw new InvalidVitalSignsRecordedAtError();
  }

  if (
    date.getTime() >
    Date.now()
  ) {
    throw new InvalidVitalSignsRecordedAtError();
  }

  return date;
}
