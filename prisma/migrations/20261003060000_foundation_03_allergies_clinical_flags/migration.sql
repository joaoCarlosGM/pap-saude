CREATE TYPE "ClinicalFlagStatus"
AS ENUM (
  'ACTIVE',
  'RESOLVED',
  'ENTERED_IN_ERROR'
);

ALTER TABLE "allergies"
ADD COLUMN "endedAt" TIMESTAMP(3);

ALTER TABLE "allergies"
ADD COLUMN "createdAt" TIMESTAMP(3)
NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "allergies"
ADD CONSTRAINT "allergies_status_ended_at_check"
CHECK (
  (
    "status" = 'ACTIVE'
    AND "endedAt" IS NULL
  )
  OR
  (
    "status" <> 'ACTIVE'
    AND "endedAt" IS NOT NULL
  )
);

CREATE INDEX "allergies_patientId_notedAt_idx"
ON "allergies"("patientId", "notedAt");

CREATE TABLE "clinical_flags" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "details" TEXT,
  "status" "ClinicalFlagStatus"
    NOT NULL DEFAULT 'ACTIVE',
  "activeSlot" INTEGER DEFAULT 1,
  "notedAt" TIMESTAMP(3)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)
    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "clinical_flags_pkey"
  PRIMARY KEY ("id")
);

ALTER TABLE "clinical_flags"
ADD CONSTRAINT "clinical_flags_patientId_fkey"
FOREIGN KEY ("patientId")
REFERENCES "patients"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "clinical_flags"
ADD CONSTRAINT "clinical_flags_status_slot_check"
CHECK (
  (
    "status" = 'ACTIVE'
    AND "activeSlot" = 1
    AND "endedAt" IS NULL
  )
  OR
  (
    "status" <> 'ACTIVE'
    AND "activeSlot" IS NULL
    AND "endedAt" IS NOT NULL
  )
);

ALTER TABLE "clinical_flags"
ADD CONSTRAINT "clinical_flags_code_format_check"
CHECK (
  "code" ~ '^[A-Z0-9_]{2,64}$'
);

CREATE UNIQUE INDEX
"clinical_flags_patientId_code_activeSlot_key"
ON "clinical_flags"(
  "patientId",
  "code",
  "activeSlot"
);

CREATE INDEX
"clinical_flags_patientId_status_idx"
ON "clinical_flags"(
  "patientId",
  "status"
);

CREATE INDEX
"clinical_flags_patientId_notedAt_idx"
ON "clinical_flags"(
  "patientId",
  "notedAt"
);

CREATE INDEX
"clinical_flags_status_idx"
ON "clinical_flags"(
  "status"
);
