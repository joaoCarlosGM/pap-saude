import {
  MeowsEvaluationStatus,
} from "@prisma/client";

import {
  MEOWS_V1_DRAFT_POLICY,
} from "./meows-policy.v1-draft";

import type {
  MeowsEngineResult,
  MeowsNumericInputs,
} from "./meows-engine.types";

import {
  InvalidMeowsInputError,
} from "./meows-engine.errors";

import {
  scoreNumericParameter,
} from "./meows-scoring";

function requirePositiveInteger(
  parameter: string,
  value: number,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new InvalidMeowsInputError(
      parameter,
    );
  }
}

function requireTemperature(
  value: number,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InvalidMeowsInputError(
      "temperature",
    );
  }
}

function findRule(
  parameter:
    | "systolicBp"
    | "diastolicBp"
    | "heartRate"
    | "respiratoryRate",
) {
  const rule =
    MEOWS_V1_DRAFT_POLICY
      .provisionalNumericRules
      .find(
        (candidate) =>
          candidate.parameter ===
          parameter,
      );

  if (!rule) {
    throw new Error(
      `MEOWS policy rule missing: ${parameter}`,
    );
  }

  return rule;
}

export function evaluateMeowsDraft(
  input: MeowsNumericInputs,
): MeowsEngineResult {
  const missingParameters:
    MeowsEngineResult[
      "missingParameters"
    ] = [];

  const unresolvedParameters:
    MeowsEngineResult[
      "unresolvedParameters"
    ] = [
      "oxygenTherapy",
      "consciousness",
    ];

  const componentScores:
    MeowsEngineResult[
      "componentScores"
    ] = {};

  const requiredNumeric = [
    "systolicBp",
    "diastolicBp",
    "heartRate",
    "respiratoryRate",
  ] as const;

  for (
    const parameter of
    requiredNumeric
  ) {
    const value =
      input[parameter];

    if (
      value === null ||
      value === undefined
    ) {
      missingParameters.push(
        parameter,
      );

      continue;
    }

    requirePositiveInteger(
      parameter,
      value,
    );

    componentScores[
      parameter
    ] =
      scoreNumericParameter(
        findRule(
          parameter,
        ),
        value,
      );
  }

  if (
    input.temperature === null ||
    input.temperature === undefined
  ) {
    missingParameters.push(
      "temperature",
    );
  } else {
    requireTemperature(
      input.temperature,
    );

    componentScores.temperature =
      scoreNumericParameter(
        MEOWS_V1_DRAFT_POLICY
          .temperature,
        input.temperature,
      );
  }

  if (
    input.oxygenSaturation !==
      undefined &&
    input.oxygenSaturation !== null &&
    (
      !Number.isInteger(
        input.oxygenSaturation,
      ) ||
      input.oxygenSaturation < 0 ||
      input.oxygenSaturation > 100
    )
  ) {
    throw new InvalidMeowsInputError(
      "oxygenSaturation",
    );
  }

  const status =
    missingParameters.length > 0
      ? MeowsEvaluationStatus
          .INCOMPLETE
      : MeowsEvaluationStatus
          .POLICY_UNRESOLVED;

  return {
    status,

    protocolId:
      MEOWS_V1_DRAFT_POLICY.id,

    protocolVersion:
      MEOWS_V1_DRAFT_POLICY
        .version,

    protocolStatus:
      MEOWS_V1_DRAFT_POLICY
        .status,

    clinicallyValidated:
      false,

    componentScores,

    totalScore:
      null,

    alertLevel:
      null,

    missingParameters,

    unresolvedParameters,
  };
}
