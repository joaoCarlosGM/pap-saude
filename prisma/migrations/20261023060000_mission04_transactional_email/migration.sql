-- Forward-only. Extend delivery observability without modifying legacy identities,
-- credentials, factors, sessions, assignments, organization state or invitation consent.
BEGIN;
CREATE TABLE "transactional_emails" (
 "id" TEXT NOT NULL PRIMARY KEY, "keyHash" TEXT NOT NULL UNIQUE,
 "contentHash" TEXT NOT NULL, "provider" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "providerMessageId" TEXT UNIQUE,
 "referenceKind" TEXT, "referenceId" TEXT, "referenceVersion" INTEGER,
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT email_provider CHECK ("provider" IN ('LOCAL_DEMO','RESEND')),
 CONSTRAINT email_status CHECK ("status" IN ('PENDING','CAPTURED','ACCEPTED_BY_PROVIDER','DELIVERED','BOUNCED','COMPLAINED','FAILED')),
 CONSTRAINT email_hashes CHECK ("keyHash" ~ '^[0-9a-f]{64}$' AND "contentHash" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT email_attempts CHECK ("attempts" >= 0)
);
CREATE INDEX "transactional_emails_referenceKind_referenceId_idx" ON "transactional_emails"("referenceKind","referenceId");
CREATE TABLE "transactional_email_events" (
 "id" TEXT NOT NULL PRIMARY KEY, "eventHash" TEXT NOT NULL UNIQUE,
 "emailId" TEXT NOT NULL REFERENCES "transactional_emails"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "kind" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT email_event_kind CHECK ("kind" IN ('DELIVERED','BOUNCED','COMPLAINED','FAILED')),
 CONSTRAINT email_event_hash CHECK ("eventHash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "transactional_email_events_emailId_occurredAt_idx" ON "transactional_email_events"("emailId","occurredAt");
ALTER TABLE "user_invitations" DROP CONSTRAINT "invitation_delivery_status";
ALTER TABLE "user_invitations" ADD CONSTRAINT "invitation_delivery_status" CHECK ("deliveryStatus" IN ('NOT_ATTEMPTED','SENDING','SENT','DEVELOPMENT','NOT_REQUESTED','CAPTURED','ACCEPTED_BY_PROVIDER','DELIVERED','BOUNCED','COMPLAINED','FAILED'));
ALTER TABLE "access_invitations" DROP CONSTRAINT "access_invitation_delivery";
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitation_delivery" CHECK ("deliveryStatus" IN ('PENDING','CAPTURED','ACCEPTED_BY_PROVIDER','DELIVERED','BOUNCED','COMPLAINED','FAILED'));
ALTER TABLE "user_notifications" DROP CONSTRAINT "access_notification_email";
ALTER TABLE "user_notifications" ADD CONSTRAINT "access_notification_email" CHECK ("emailStatus" IN ('PENDING','CAPTURED','ACCEPTED_BY_PROVIDER','DELIVERED','BOUNCED','COMPLAINED','FAILED','NOT_REQUESTED'));
CREATE TABLE "organization_activation_notices" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL,
 "userId" TEXT NOT NULL, "organizationName" TEXT NOT NULL,
 "activatedAt" TIMESTAMP(3) NOT NULL, "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT activation_notice_status CHECK ("emailStatus" IN ('PENDING','CAPTURED','ACCEPTED_BY_PROVIDER','DELIVERED','BOUNCED','COMPLAINED','FAILED','NOT_REQUESTED'))
);
CREATE UNIQUE INDEX "activation_notice_recipient_event_key" ON "organization_activation_notices"("organizationId","userId","activatedAt");
CREATE INDEX "organization_activation_notices_organizationId_emailStatus_idx" ON "organization_activation_notices"("organizationId","emailStatus");
COMMIT;
