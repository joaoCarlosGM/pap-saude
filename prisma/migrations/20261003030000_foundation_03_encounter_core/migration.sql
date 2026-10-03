ALTER TABLE "encounters"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;

UPDATE "encounters"
SET "startedAt" = "occurredAt"
WHERE "status" IN ('IN_PROGRESS', 'COMPLETED')
  AND "startedAt" IS NULL;

UPDATE "encounters"
SET "completedAt" = COALESCE("completedAt", "updatedAt")
WHERE "status" = 'COMPLETED';

UPDATE "encounters"
SET
  "cancelledAt" = COALESCE("cancelledAt", "updatedAt"),
  "cancellationReason" = COALESCE(
    NULLIF(BTRIM("cancellationReason"), ''),
    'Legacy cancellation'
  )
WHERE "status" = 'CANCELLED';

CREATE INDEX "encounters_organizationId_status_occurredAt_idx"
ON "encounters"("organizationId", "status", "occurredAt");

CREATE INDEX "encounters_pregnancyId_occurredAt_idx"
ON "encounters"("pregnancyId", "occurredAt");

CREATE INDEX "encounters_status_idx"
ON "encounters"("status");

ALTER TABLE "encounters"
ADD CONSTRAINT "encounters_lifecycle_consistency_check"
CHECK (
  (
    "status" = 'DRAFT'
    AND "startedAt" IS NULL
    AND "completedAt" IS NULL
    AND "cancelledAt" IS NULL
    AND "cancellationReason" IS NULL
  )
  OR
  (
    "status" = 'IN_PROGRESS'
    AND "startedAt" IS NOT NULL
    AND "completedAt" IS NULL
    AND "cancelledAt" IS NULL
    AND "cancellationReason" IS NULL
  )
  OR
  (
    "status" = 'COMPLETED'
    AND "startedAt" IS NOT NULL
    AND "completedAt" IS NOT NULL
    AND "cancelledAt" IS NULL
    AND "cancellationReason" IS NULL
  )
  OR
  (
    "status" = 'CANCELLED'
    AND "completedAt" IS NULL
    AND "cancelledAt" IS NOT NULL
    AND "cancellationReason" IS NOT NULL
    AND LENGTH(BTRIM("cancellationReason")) > 0
  )
);

ALTER TABLE "encounters"
ADD CONSTRAINT "encounters_started_after_occurrence_check"
CHECK (
  "startedAt" IS NULL
  OR "startedAt" >= "occurredAt"
);

ALTER TABLE "encounters"
ADD CONSTRAINT "encounters_completed_after_occurrence_check"
CHECK (
  "completedAt" IS NULL
  OR "completedAt" >= "occurredAt"
);

ALTER TABLE "encounters"
ADD CONSTRAINT "encounters_cancelled_after_occurrence_check"
CHECK (
  "cancelledAt" IS NULL
  OR "cancelledAt" >= "occurredAt"
);

ALTER TABLE "encounters"
ADD CONSTRAINT "encounters_cancellation_reason_length_check"
CHECK (
  "cancellationReason" IS NULL
  OR LENGTH("cancellationReason") <= 500
);
