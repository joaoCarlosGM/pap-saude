import type {
  MeowsNumericRule,
  MeowsScoreBand,
} from "./meows-policy.types";

import {
  InvalidMeowsInputError,
  MeowsPolicyCoverageError,
} from "./meows-engine.errors";

function matchesBand(
  value: number,
  band: MeowsScoreBand,
): boolean {
  if (
    band.min !== undefined
  ) {
    const ok =
      band.minInclusive === false
        ? value > band.min
        : value >= band.min;

    if (!ok) {
      return false;
    }
  }

  if (
    band.max !== undefined
  ) {
    const ok =
      band.maxInclusive === false
        ? value < band.max
        : value <= band.max;

    if (!ok) {
      return false;
    }
  }

  return true;
}

export function scoreNumericParameter(
  rule: MeowsNumericRule,
  value: number,
): number {
  if (
    !Number.isFinite(value)
  ) {
    throw new InvalidMeowsInputError(
      rule.parameter,
    );
  }

  const band =
    rule.bands.find(
      (candidate) =>
        matchesBand(
          value,
          candidate,
        ),
    );

  if (!band) {
    throw new MeowsPolicyCoverageError(
      rule.parameter,
      value,
    );
  }

  return band.score;
}

export function sumMeowsComponentScores(
  values:
    readonly number[],
): number {
  for (
    const value of values
  ) {
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 3
    ) {
      throw new InvalidMeowsInputError(
        "componentScore",
      );
    }
  }

  return values.reduce(
    (
      total,
      value,
    ) => total + value,
    0,
  );
}
