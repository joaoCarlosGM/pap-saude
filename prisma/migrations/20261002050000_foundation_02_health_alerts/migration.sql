CREATE TYPE "OrganizationHealthAlertType" AS ENUM (
    'LOW_ACTIVITY',
    'LOW_SATISFACTION',
    'FEEDBACK_BACKLOG'
);

CREATE TYPE "OrganizationHealthAlertSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

CREATE TYPE "OrganizationHealthAlertStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED'
);

CREATE TABLE "organization_health_alerts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "OrganizationHealthAlertType" NOT NULL,
    "severity" "OrganizationHealthAlertSeverity" NOT NULL,
    "status" "OrganizationHealthAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "observedValue" DOUBLE PRECISION,
    "thresholdValue" DOUBLE PRECISION,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "details" JSONB,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_health_alerts_pkey"
        PRIMARY KEY ("id")
);

CREATE INDEX
"organization_health_alerts_organizationId_status_idx"
ON "organization_health_alerts"
("organizationId", "status");

CREATE INDEX
"organization_health_alerts_organizationId_severity_idx"
ON "organization_health_alerts"
("organizationId", "severity");

CREATE INDEX
"organization_health_alerts_type_status_idx"
ON "organization_health_alerts"
("type", "status");

CREATE INDEX
"organization_health_alerts_lastDetectedAt_idx"
ON "organization_health_alerts"
("lastDetectedAt");

CREATE UNIQUE INDEX
"organization_health_alerts_active_type_key"
ON "organization_health_alerts"
("organizationId", "type")
WHERE "status" IN ('OPEN', 'ACKNOWLEDGED');

ALTER TABLE "organization_health_alerts"
ADD CONSTRAINT "organization_health_alerts_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
