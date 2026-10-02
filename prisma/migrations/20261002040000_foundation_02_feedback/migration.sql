-- Foundation 02.4G
-- Product feedback and satisfaction.
--
-- This model is for product/service feedback.
-- It must not be used as a clinical record.

CREATE TYPE "ProductFeedbackCategory" AS ENUM (
    'BUG',
    'USABILITY',
    'FEATURE_REQUEST',
    'PERFORMANCE',
    'SUPPORT',
    'OTHER'
);

CREATE TYPE "ProductFeedbackStatus" AS ENUM (
    'OPEN',
    'TRIAGED',
    'IN_PROGRESS',
    'RESOLVED',
    'DISMISSED'
);

CREATE TYPE "ProductFeedbackSource" AS ENUM (
    'WEB',
    'MOBILE',
    'SUPPORT',
    'ADMIN'
);

CREATE TABLE "product_feedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "resolvedByUserId" TEXT,
    "category" "ProductFeedbackCategory" NOT NULL,
    "status" "ProductFeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "source" "ProductFeedbackSource" NOT NULL,
    "satisfactionScore" INTEGER,
    "message" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "triagedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "product_feedback_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "product_feedback_satisfaction_score_check"
        CHECK (
            "satisfactionScore" IS NULL OR
            (
                "satisfactionScore" >= 1 AND
                "satisfactionScore" <= 5
            )
        )
);

CREATE INDEX
"product_feedback_organizationId_createdAt_idx"
ON "product_feedback" (
    "organizationId",
    "createdAt"
);

CREATE INDEX
"product_feedback_organizationId_status_createdAt_idx"
ON "product_feedback" (
    "organizationId",
    "status",
    "createdAt"
);

CREATE INDEX
"product_feedback_category_createdAt_idx"
ON "product_feedback" (
    "category",
    "createdAt"
);

CREATE INDEX
"product_feedback_actorUserId_createdAt_idx"
ON "product_feedback" (
    "actorUserId",
    "createdAt"
);

CREATE INDEX
"product_feedback_resolvedByUserId_resolvedAt_idx"
ON "product_feedback" (
    "resolvedByUserId",
    "resolvedAt"
);

ALTER TABLE "product_feedback"
ADD CONSTRAINT "product_feedback_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "product_feedback"
ADD CONSTRAINT "product_feedback_actorUserId_fkey"
FOREIGN KEY ("actorUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "product_feedback"
ADD CONSTRAINT "product_feedback_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
