ALTER TABLE "obstetric_data"
ADD COLUMN "recordedAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "obstetric_data"
ADD COLUMN "createdAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "obstetric_data"
ADD COLUMN "updatedAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "obstetric_data"
DROP CONSTRAINT "obstetric_data_encounterId_fkey";

ALTER TABLE "obstetric_data"
ADD CONSTRAINT "obstetric_data_encounterId_fkey"
FOREIGN KEY ("encounterId")
REFERENCES "encounters"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "obstetric_data"
ADD CONSTRAINT "obstetric_data_uterine_height_check"
CHECK (
  "uterineHeightCm" IS NULL
  OR "uterineHeightCm" >= 0
);

ALTER TABLE "obstetric_data"
ADD CONSTRAINT "obstetric_data_fetal_heart_rate_check"
CHECK (
  "fetalHeartRate" IS NULL
  OR "fetalHeartRate" > 0
);

ALTER TABLE "obstetric_data"
ADD CONSTRAINT "obstetric_data_weight_check"
CHECK (
  "weightKg" IS NULL
  OR "weightKg" > 0
);

CREATE INDEX "obstetric_data_recordedAt_idx"
ON "obstetric_data"("recordedAt");
