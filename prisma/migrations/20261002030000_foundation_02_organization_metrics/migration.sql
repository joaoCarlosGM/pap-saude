-- Foundation 02.4F
-- Organization metrics snapshots.
--
-- Snapshots contain aggregate product usage metrics only.
-- They must not contain patient or clinical information.

CREATE TABLE "organization_metric_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,

    "dashboardViews" INTEGER NOT NULL DEFAULT 0,
    "patientSearches" INTEGER NOT NULL DEFAULT 0,
    "encountersStarted" INTEGER NOT NULL DEFAULT 0,
    "encountersCompleted" INTEGER NOT NULL DEFAULT 0,
    "feedbackOpened" INTEGER NOT NULL DEFAULT 0,
    "organizationSwitches" INTEGER NOT NULL DEFAULT 0,

    "featureUsage" JSONB,

    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_metric_snapshots_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "organization_metric_snapshots_valid_period_check"
        CHECK ("periodEnd" > "periodStart"),

    CONSTRAINT "organization_metric_snapshots_nonnegative_check"
        CHECK (
            "eventCount" >= 0 AND
            "activeUsers" >= 0 AND
            "dashboardViews" >= 0 AND
            "patientSearches" >= 0 AND
            "encountersStarted" >= 0 AND
            "encountersCompleted" >= 0 AND
            "feedbackOpened" >= 0 AND
            "organizationSwitches" >= 0
        )
);

CREATE UNIQUE INDEX
"organization_metric_snapshots_organizationId_periodStart_periodEnd_key"
ON "organization_metric_snapshots"
(
    "organizationId",
    "periodStart",
    "periodEnd"
);

CREATE INDEX
"organization_metric_snapshots_organizationId_periodStart_idx"
ON "organization_metric_snapshots"
(
    "organizationId",
    "periodStart"
);

CREATE INDEX
"organization_metric_snapshots_periodStart_periodEnd_idx"
ON "organization_metric_snapshots"
(
    "periodStart",
    "periodEnd"
);

ALTER TABLE "organization_metric_snapshots"
ADD CONSTRAINT "organization_metric_snapshots_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
