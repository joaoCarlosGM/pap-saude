ALTER TABLE "patients"
ADD COLUMN "socialName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "patients_birthDate_idx"
ON "patients"("birthDate");

CREATE INDEX "patients_isActive_idx"
ON "patients"("isActive");

ALTER TABLE "patients"
ADD CONSTRAINT "patients_cpf_format_check"
CHECK (
  "cpf" IS NULL
  OR "cpf" ~ '^[0-9]{11}$'
);

ALTER TABLE "patients"
ADD CONSTRAINT "patients_cns_format_check"
CHECK (
  "cns" IS NULL
  OR "cns" ~ '^[0-9]{15}$'
);

ALTER TABLE "patients"
ADD CONSTRAINT "patients_full_name_not_blank_check"
CHECK (
  length(btrim("fullName")) >= 2
);

ALTER TABLE "patients"
ADD CONSTRAINT "patients_state_format_check"
CHECK (
  "state" IS NULL
  OR "state" ~ '^[A-Z]{2}$'
);

ALTER TABLE "patients"
ADD CONSTRAINT "patients_birth_date_not_future_check"
CHECK (
  "birthDate" <= CURRENT_DATE
);
