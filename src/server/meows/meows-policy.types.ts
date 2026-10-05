export type MeowsProtocolStatus =
  | "DRAFT_UNVALIDATED"
  | "VALIDATED";

export type MeowsRuleConfidence =
  | "CONSENSUS"
  | "PROVISIONAL"
  | "UNRESOLVED";

export type MeowsParameterKey =
  | "systolicBp"
  | "diastolicBp"
  | "heartRate"
  | "respiratoryRate"
  | "temperature"
  | "oxygenTherapy"
  | "consciousness";

export type MeowsScoreBand = {
  min?: number;
  max?: number;

  minInclusive?: boolean;
  maxInclusive?: boolean;

  score: number;
};

export type MeowsNumericRule = {
  parameter: MeowsParameterKey;
  confidence: MeowsRuleConfidence;
  bands: readonly MeowsScoreBand[];
};

export type MeowsPendingDecision = {
  key: string;
  priority: string;
  description: string;
};

export type MeowsDraftPolicy = {
  id: string;
  version: string;
  status: MeowsProtocolStatus;

  clinicallyValidated: boolean;

  scoreComponents:
    readonly MeowsParameterKey[];

  missingData: {
    outcome: "INCOMPLETE";
    totalScore: null;
    reportMissingParameters: true;
  };

  invalidData: {
    behavior: "REJECT";
    convertToZero: false;
  };

  oxygenSaturation: {
    collected: true;
    includedInFormula: false;
    confidence: "UNRESOLVED";
  };

  isolatedParameterScoreThree: {
    alertCandidate: true;
    confidence: MeowsRuleConfidence;
  };

  temperature:
    MeowsNumericRule;

  provisionalNumericRules:
    readonly MeowsNumericRule[];

  unresolvedDecisions:
    readonly MeowsPendingDecision[];
};
