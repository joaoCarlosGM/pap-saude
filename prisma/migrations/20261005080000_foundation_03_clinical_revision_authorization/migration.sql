ALTER TABLE "audit_events"
ADD COLUMN "patientId" TEXT;

ALTER TABLE "audit_events"
ADD CONSTRAINT "audit_events_patientId_fkey"
FOREIGN KEY ("patientId")
REFERENCES "patients"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX "audit_events_patientId_occurredAt_idx"
ON "audit_events"(
  "patientId",
  "occurredAt"
);
