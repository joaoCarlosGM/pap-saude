-- Foundation 02.4E
-- Product activity telemetry.
--
-- This ledger is intentionally separate from security/clinical audit events.
-- Metadata must contain operational/product information only.

CREATE TABLE "product_activity_events" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organizationId" TEXT,
    "eventKey" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "screen" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_activity_events_pkey"
        PRIMARY KEY ("id")
);

CREATE INDEX "product_activity_events_actorUserId_occurredAt_idx"
ON "product_activity_events" ("actorUserId", "occurredAt");

CREATE INDEX "product_activity_events_organizationId_occurredAt_idx"
ON "product_activity_events" ("organizationId", "occurredAt");

CREATE INDEX "product_activity_events_eventKey_occurredAt_idx"
ON "product_activity_events" ("eventKey", "occurredAt");

CREATE INDEX "product_activity_events_resourceType_resourceId_idx"
ON "product_activity_events" ("resourceType", "resourceId");

CREATE INDEX "product_activity_events_correlationId_occurredAt_idx"
ON "product_activity_events" ("correlationId", "occurredAt");

ALTER TABLE "product_activity_events"
ADD CONSTRAINT "product_activity_events_actorUserId_fkey"
FOREIGN KEY ("actorUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "product_activity_events"
ADD CONSTRAINT "product_activity_events_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
