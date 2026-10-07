CREATE TYPE "OnboardingStatus"
AS ENUM (
  'STARTED',
  'COMPLETED',
  'SKIPPED'
);

CREATE TABLE "user_onboarding_progress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tourKey" TEXT NOT NULL,
  "tourVersion" INTEGER NOT NULL,
  "status" "OnboardingStatus" NOT NULL DEFAULT 'STARTED',
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_onboarding_progress_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_onboarding_progress_userId_tourKey_tourVersion_key"
ON "user_onboarding_progress" (
  "userId",
  "tourKey",
  "tourVersion"
);

CREATE INDEX "user_onboarding_progress_userId_status_idx"
ON "user_onboarding_progress" (
  "userId",
  "status"
);

CREATE INDEX "user_onboarding_progress_tourKey_tourVersion_idx"
ON "user_onboarding_progress" (
  "tourKey",
  "tourVersion"
);

ALTER TABLE "user_onboarding_progress"
ADD CONSTRAINT "user_onboarding_progress_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "user_onboarding_progress"
ADD CONSTRAINT "user_onboarding_progress_version_positive"
CHECK (
  "tourVersion" > 0
);

ALTER TABLE "user_onboarding_progress"
ADD CONSTRAINT "user_onboarding_progress_step_nonnegative"
CHECK (
  "currentStep" >= 0
);

ALTER TABLE "user_onboarding_progress"
ADD CONSTRAINT "user_onboarding_progress_state_consistency"
CHECK (
  (
    "status" = 'STARTED'
    AND "completedAt" IS NULL
    AND "skippedAt" IS NULL
  )
  OR
  (
    "status" = 'COMPLETED'
    AND "completedAt" IS NOT NULL
    AND "skippedAt" IS NULL
  )
  OR
  (
    "status" = 'SKIPPED'
    AND "completedAt" IS NULL
    AND "skippedAt" IS NOT NULL
  )
);
