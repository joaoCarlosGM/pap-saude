-- Forward-only private clinical provenance; no legacy snapshots/authors invented.
BEGIN;
CREATE TYPE "ClinicalProvenanceKind" AS ENUM ('REVISION_PROPOSAL', 'MEASUREMENT_CREATED', 'MEASUREMENT_UPDATED');
CREATE TYPE "ClinicalProvenanceStatus" AS ENUM ('PROPOSED_NOT_APPLIED', 'APPLIED');
CREATE TABLE "clinical_provenance_events" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "encounterId" TEXT,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "kind" "ClinicalProvenanceKind" NOT NULL,
  "status" "ClinicalProvenanceStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "proposedAfter" JSONB,
  "sourceSnapshotHash" TEXT NOT NULL,
  "sessionId" TEXT,
  "requestId" TEXT,
  "correlationId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_provenance_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinical_provenance_actor_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_provenance_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_provenance_patient_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_provenance_encounter_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "clinical_provenance_status_consistency" CHECK (
    ("kind" = 'REVISION_PROPOSAL' AND "status" = 'PROPOSED_NOT_APPLIED' AND "proposedAfter" IS NOT NULL AND "before" = "after")
    OR ("kind" IN ('MEASUREMENT_CREATED', 'MEASUREMENT_UPDATED') AND "status" = 'APPLIED' AND "proposedAfter" IS NULL)
  ),
  CONSTRAINT "clinical_provenance_hash_format" CHECK ("sourceSnapshotHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "clinical_provenance_reason_present" CHECK (length(trim("reason")) BETWEEN 3 AND 1000)
);
CREATE INDEX "clinical_provenance_patient_scope_time_idx" ON "clinical_provenance_events"("patientId", "organizationId", "occurredAt");
CREATE INDEX "clinical_provenance_resource_time_idx" ON "clinical_provenance_events"("resourceType", "resourceId", "occurredAt");
CREATE INDEX "clinical_provenance_actor_time_idx" ON "clinical_provenance_events"("actorUserId", "occurredAt");
CREATE FUNCTION "p0_reject_clinical_provenance_mutation"() RETURNS trigger LANGUAGE plpgsql AS $ledger$
BEGIN
 RAISE EXCEPTION 'clinical_provenance_events is append-only: % forbidden', TG_OP USING ERRCODE='23514';
END
$ledger$;
CREATE TRIGGER "p0_clinical_provenance_immutable_row" BEFORE UPDATE OR DELETE ON "clinical_provenance_events" FOR EACH ROW EXECUTE FUNCTION "p0_reject_clinical_provenance_mutation"();
CREATE TRIGGER "p0_clinical_provenance_immutable_truncate" BEFORE TRUNCATE ON "clinical_provenance_events" FOR EACH STATEMENT EXECUTE FUNCTION "p0_reject_clinical_provenance_mutation"();
COMMIT;
