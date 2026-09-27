-- Foundation 02.4A — Organization lifecycle

CREATE TYPE "OrganizationStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

ALTER TABLE "organizations"
ADD COLUMN "status" "OrganizationStatus"
NOT NULL DEFAULT 'PENDING_VERIFICATION';

ALTER TABLE "organizations"
ADD COLUMN "cnes" TEXT;

ALTER TABLE "organizations"
ADD COLUMN "cnpj" TEXT;

ALTER TABLE "organizations"
ADD COLUMN "city" TEXT;

ALTER TABLE "organizations"
ADD COLUMN "state" TEXT;

ALTER TABLE "organizations"
ADD COLUMN "address" TEXT;

CREATE UNIQUE INDEX
  "organizations_cnes_key"
ON "organizations"("cnes");

CREATE UNIQUE INDEX
  "organizations_cnpj_key"
ON "organizations"("cnpj");

DROP INDEX IF EXISTS
  "organizations_type_isActive_idx";

CREATE INDEX
  "organizations_type_status_idx"
ON "organizations"(
  "type",
  "status"
);

CREATE INDEX
  "organizations_city_state_idx"
ON "organizations"(
  "city",
  "state"
);

CREATE INDEX
  "organizations_name_idx"
ON "organizations"("name");
