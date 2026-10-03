ALTER TABLE "pregnancies"
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "activeSlot" INTEGER;

UPDATE "pregnancies"
SET "activeSlot" = 1
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "pregnancies_patientId_activeSlot_key"
ON "pregnancies"("patientId", "activeSlot");

CREATE INDEX "pregnancies_status_idx"
ON "pregnancies"("status");

ALTER TABLE "pregnancies"
ADD CONSTRAINT "pregnancies_active_slot_consistency_check"
CHECK (
  (
    "status" = 'ACTIVE'
    AND "activeSlot" = 1
  )
  OR
  (
    "status" <> 'ACTIVE'
    AND "activeSlot" IS NULL
  )
);

ALTER TABLE "pregnancies"
ADD CONSTRAINT "pregnancies_gravida_nonnegative_check"
CHECK (
  "gravida" IS NULL
  OR "gravida" >= 0
);

ALTER TABLE "pregnancies"
ADD CONSTRAINT "pregnancies_parity_nonnegative_check"
CHECK (
  "parity" IS NULL
  OR "parity" >= 0
);
