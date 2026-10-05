CREATE TYPE "MeowsEvaluationStatus"
AS ENUM (
  'COMPLETE',
  'INCOMPLETE',
  'POLICY_UNRESOLVED',
  'INVALID'
);

ALTER TABLE "clinical_evaluations"
ALTER COLUMN "meowsScore"
DROP NOT NULL;

ALTER TABLE "clinical_evaluations"
ALTER COLUMN "alertLevel"
DROP NOT NULL;

ALTER TABLE "clinical_evaluations"
ADD COLUMN "status"
"MeowsEvaluationStatus"
NOT NULL DEFAULT 'POLICY_UNRESOLVED';

ALTER TABLE "clinical_evaluations"
ADD COLUMN "protocolId"
TEXT NOT NULL DEFAULT 'LEGACY_UNSPECIFIED';

ALTER TABLE "clinical_evaluations"
ADD COLUMN "protocolVersion"
TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE "clinical_evaluations"
ADD COLUMN "protocolStatus"
TEXT NOT NULL DEFAULT 'DRAFT_UNVALIDATED';

ALTER TABLE "clinical_evaluations"
ADD COLUMN "clinicallyValidated"
BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "clinical_evaluations"
ADD COLUMN "componentScores"
JSONB;

ALTER TABLE "clinical_evaluations"
ADD COLUMN "missingParameters"
TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "clinical_evaluations"
ADD COLUMN "unresolvedParameters"
TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "clinical_evaluations"
ADD COLUMN "createdAt"
TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "clinical_evaluations"
ADD CONSTRAINT "clinical_evaluations_result_consistency_check"
CHECK (
  (
    "status" = 'COMPLETE'
    AND "meowsScore" IS NOT NULL
    AND "alertLevel" IS NOT NULL
    AND cardinality("missingParameters") = 0
    AND cardinality("unresolvedParameters") = 0
  )
  OR
  (
    "status" <> 'COMPLETE'
    AND "alertLevel" IS NULL
  )
);

CREATE INDEX "clinical_evaluations_status_evaluatedAt_idx"
ON "clinical_evaluations"(
  "status",
  "evaluatedAt"
);
