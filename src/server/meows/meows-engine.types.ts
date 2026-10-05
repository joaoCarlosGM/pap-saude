import type {
  ConsciousnessState,
  MeowsEvaluationStatus,
} from "@prisma/client";

import type {
  MeowsParameterKey,
  MeowsProtocolStatus,
} from "./meows-policy.types";

export type MeowsNumericInputs = {
  systolicBp:
    number | null | undefined;

  diastolicBp:
    number | null | undefined;

  heartRate:
    number | null | undefined;

  respiratoryRate:
    number | null | undefined;

  temperature:
    number | null | undefined;

  oxygenSaturation?:
    number | null;

  consciousness?:
    ConsciousnessState | null;
};

export type MeowsComponentScores =
  Partial<
    Record<
      MeowsParameterKey,
      number
    >
  >;

export type MeowsEngineResult = {
  status:
    MeowsEvaluationStatus;

  protocolId:
    string;

  protocolVersion:
    string;

  protocolStatus:
    MeowsProtocolStatus;

  clinicallyValidated:
    false;

  componentScores:
    MeowsComponentScores;

  totalScore:
    number | null;

  alertLevel:
    null;

  missingParameters:
    MeowsParameterKey[];

  unresolvedParameters:
    MeowsParameterKey[];
};
