import {
  InvalidPregnancyDateError,
} from "./pregnancy.errors";

export type PregnancyTimelineInput = {
  lastMenstrualDate?:
    | Date
    | null;
  estimatedDueDate?:
    | Date
    | null;
  firstPrenatalAt?:
    | Date
    | null;
  endedAt?:
    | Date
    | null;
};

function timestamp(
  value:
    | Date
    | null
    | undefined,
): number | null {
  if (!value) {
    return null;
  }

  return value.getTime();
}

export function validatePregnancyTimeline(
  input:
    PregnancyTimelineInput,
): void {
  const lmp =
    timestamp(
      input.lastMenstrualDate,
    );

  const due =
    timestamp(
      input.estimatedDueDate,
    );

  const firstPrenatal =
    timestamp(
      input.firstPrenatalAt,
    );

  const ended =
    timestamp(
      input.endedAt,
    );

  if (
    lmp !== null &&
    due !== null &&
    due <= lmp
  ) {
    throw new InvalidPregnancyDateError();
  }

  if (
    lmp !== null &&
    firstPrenatal !== null &&
    firstPrenatal < lmp
  ) {
    throw new InvalidPregnancyDateError();
  }

  if (
    lmp !== null &&
    ended !== null &&
    ended < lmp
  ) {
    throw new InvalidPregnancyDateError();
  }

  if (
    firstPrenatal !== null &&
    ended !== null &&
    ended < firstPrenatal
  ) {
    throw new InvalidPregnancyDateError();
  }
}
