import {
  InvalidPregnancyDateError,
} from "./pregnancy.errors";

const DAY_MS =
  24 * 60 * 60 * 1000;

export const STANDARD_GESTATION_DAYS =
  280;

export type GestationalAge = {
  totalDays: number;
  weeks: number;
  days: number;
};

function toUtcDateOnly(
  value: Date | string,
): Date {
  const source =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);

  if (
    Number.isNaN(
      source.getTime(),
    )
  ) {
    throw new InvalidPregnancyDateError();
  }

  return new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
    ),
  );
}

export function addDaysUtc(
  value: Date | string,
  days: number,
): Date {
  const date =
    toUtcDateOnly(value);

  return new Date(
    date.getTime() +
      days * DAY_MS,
  );
}

export function calculateEstimatedDueDate(
  lastMenstrualDate:
    | Date
    | string,
): Date {
  return addDaysUtc(
    lastMenstrualDate,
    STANDARD_GESTATION_DAYS,
  );
}

export function calculateEstimatedLastMenstrualDate(
  estimatedDueDate:
    | Date
    | string,
): Date {
  return addDaysUtc(
    estimatedDueDate,
    -STANDARD_GESTATION_DAYS,
  );
}

export function calculateGestationalAge(
  lastMenstrualDate:
    | Date
    | string,
  referenceDate:
    | Date
    | string = new Date(),
): GestationalAge {
  const lmp =
    toUtcDateOnly(
      lastMenstrualDate,
    );

  const reference =
    toUtcDateOnly(
      referenceDate,
    );

  const difference =
    reference.getTime() -
    lmp.getTime();

  if (difference < 0) {
    throw new InvalidPregnancyDateError();
  }

  const totalDays =
    Math.floor(
      difference /
        DAY_MS,
    );

  return {
    totalDays,
    weeks:
      Math.floor(
        totalDays / 7,
      ),
    days:
      totalDays % 7,
  };
}
