BEGIN;
ALTER TABLE "organization_requests" ALTER COLUMN "requestedByUserId" DROP NOT NULL;
ALTER TABLE "organization_candidates"
 ADD COLUMN "contactName" TEXT, ADD COLUMN "contactEmail" TEXT,
 ADD COLUMN "contactPhone" TEXT, ADD COLUMN "consentedAt" TIMESTAMP(3),
 ADD COLUMN "reviewReason" TEXT, ADD COLUMN "reviewedByUserId" TEXT,
 ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "user_invitations"
 ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'NOT_ATTEMPTED',
 ADD COLUMN "providerMessageId" TEXT,
 ADD COLUMN "deliveryAttemptedAt" TIMESTAMP(3),
 ADD CONSTRAINT "invitation_delivery_status" CHECK ("deliveryStatus" IN ('NOT_ATTEMPTED','SENDING','SENT','DEVELOPMENT','FAILED'));
ALTER TABLE "sessions" ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);
CREATE TABLE "beta_abuse_buckets" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "beta_abuse_buckets_expiresAt_idx" ON "beta_abuse_buckets" ("expiresAt");
COMMIT;
