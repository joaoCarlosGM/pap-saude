-- Foundation 02.4B
-- Membership lifecycle + institutional discovery/commercial pipeline.

ALTER TYPE "MembershipStatus"
ADD VALUE IF NOT EXISTS 'REQUESTED'
BEFORE 'INVITED';

CREATE TYPE "OrganizationCandidateStatus" AS ENUM (
  'NEW',
  'QUALIFYING',
  'CONTACTED',
  'INTERESTED',
  'VALIDATING',
  'APPROVED',
  'REJECTED',
  'DUPLICATE',
  'CLOSED'
);

CREATE TYPE "OrganizationLeadTemperature" AS ENUM (
  'COLD',
  'WARM',
  'HOT'
);

CREATE TYPE "OrganizationRequestStatus" AS ENUM (
  'REQUESTED',
  'WITHDRAWN',
  'RESOLVED'
);

CREATE TABLE "organization_candidates" (
  "id" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "cnes" TEXT,
  "cnpj" TEXT,
  "city" TEXT,
  "state" TEXT,
  "address" TEXT,
  "status" "OrganizationCandidateStatus" NOT NULL DEFAULT 'NEW',
  "leadTemperature" "OrganizationLeadTemperature" NOT NULL DEFAULT 'COLD',
  "convertedOrganizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_candidates_pkey"
  PRIMARY KEY ("id")
);

CREATE TABLE "organization_requests" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "status" "OrganizationRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_requests_pkey"
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "organization_candidates_dedupeKey_key"
ON "organization_candidates"("dedupeKey");

CREATE UNIQUE INDEX
  "organization_candidates_cnes_key"
ON "organization_candidates"("cnes");

CREATE UNIQUE INDEX
  "organization_candidates_convertedOrganizationId_key"
ON "organization_candidates"("convertedOrganizationId");

CREATE INDEX
  "organization_candidates_type_status_idx"
ON "organization_candidates"("type", "status");

CREATE INDEX
  "organization_candidates_leadTemperature_status_idx"
ON "organization_candidates"("leadTemperature", "status");

CREATE INDEX
  "organization_candidates_city_state_idx"
ON "organization_candidates"("city", "state");

CREATE INDEX
  "organization_candidates_normalizedName_idx"
ON "organization_candidates"("normalizedName");

CREATE UNIQUE INDEX
  "organization_requests_candidateId_requestedByUserId_key"
ON "organization_requests"(
  "candidateId",
  "requestedByUserId"
);

CREATE INDEX
  "organization_requests_requestedByUserId_status_idx"
ON "organization_requests"(
  "requestedByUserId",
  "status"
);

CREATE INDEX
  "organization_requests_candidateId_status_idx"
ON "organization_requests"(
  "candidateId",
  "status"
);

ALTER TABLE "organization_candidates"
ADD CONSTRAINT
  "organization_candidates_convertedOrganizationId_fkey"
FOREIGN KEY ("convertedOrganizationId")
REFERENCES "organizations"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "organization_requests"
ADD CONSTRAINT
  "organization_requests_candidateId_fkey"
FOREIGN KEY ("candidateId")
REFERENCES "organization_candidates"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "organization_requests"
ADD CONSTRAINT
  "organization_requests_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
