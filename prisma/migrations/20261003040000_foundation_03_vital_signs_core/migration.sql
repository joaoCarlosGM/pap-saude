ALTER TABLE "vital_signs"
ADD COLUMN "createdAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "vital_signs"
ADD COLUMN "updatedAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "vital_signs"
DROP CONSTRAINT "vital_signs_encounterId_fkey";

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_encounterId_fkey"
FOREIGN KEY ("encounterId")
REFERENCES "encounters"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_systolic_positive_check"
CHECK ("systolicBp" > 0);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_diastolic_positive_check"
CHECK ("diastolicBp" > 0);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_heart_rate_positive_check"
CHECK ("heartRate" > 0);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_respiratory_rate_positive_check"
CHECK ("respiratoryRate" > 0);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_temperature_positive_check"
CHECK (
  "temperature" IS NULL
  OR "temperature" > 0
);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_oxygen_saturation_check"
CHECK (
  "oxygenSaturation" IS NULL
  OR (
    "oxygenSaturation" >= 0
    AND "oxygenSaturation" <= 100
  )
);

ALTER TABLE "vital_signs"
ADD CONSTRAINT "vital_signs_urine_output_check"
CHECK (
  "urineOutputMl" IS NULL
  OR "urineOutputMl" >= 0
);

CREATE INDEX "vital_signs_recordedAt_idx"
ON "vital_signs"("recordedAt");
