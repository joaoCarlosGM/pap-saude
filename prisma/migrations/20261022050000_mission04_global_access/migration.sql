-- Forward-only additive schema. No writes to legacy identities, credentials, MFA, sessions or organizations.
BEGIN;
-- CreateEnum
CREATE TYPE "AccessInvitationStatus" AS ENUM ('PENDING_ACCEPTANCE', 'PENDING_ASSIGNMENT', 'ACTIVE', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "access_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "proposedRoleKey" TEXT NOT NULL,
    "status" "AccessInvitationStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "activeSlot" INTEGER DEFAULT 1,
    "tokenHash" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "invitedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "assignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_invitations_tokenHash_key" ON "access_invitations"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "access_invitations_assignmentId_key" ON "access_invitations"("assignmentId");

-- CreateIndex
CREATE INDEX "access_invitations_invitedByUserId_status_createdAt_idx" ON "access_invitations"("invitedByUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "access_invitations_userId_createdAt_idx" ON "access_invitations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "access_invitations_status_expiresAt_idx" ON "access_invitations"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "access_invitations_email_activeSlot_key" ON "access_invitations"("email", "activeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_dedupeKey_key" ON "user_notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "user_notifications_userId_createdAt_idx" ON "user_notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_invitations" ADD CONSTRAINT "access_invitations_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "role_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "access_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "access_invitations"
 ADD CONSTRAINT "access_invitation_email_normalized" CHECK ("email" = lower(btrim("email"))),
 ADD CONSTRAINT "access_invitation_role" CHECK ("proposedRoleKey" IN ('PAP_MANAGER','COMMERCIAL','PROFESSIONAL','HEALTH_UNIT_ADMIN','MUNICIPAL_ADMIN')),
 ADD CONSTRAINT "access_invitation_slot" CHECK (("status" IN ('PENDING_ACCEPTANCE','PENDING_ASSIGNMENT','ACTIVE') AND "activeSlot" IS NOT NULL AND "activeSlot" = 1) OR ("status" IN ('REJECTED','EXPIRED','REVOKED') AND "activeSlot" IS NULL)),
 ADD CONSTRAINT "access_invitation_consent" CHECK ("status" NOT IN ('PENDING_ASSIGNMENT','ACTIVE') OR ("acceptedAt" IS NOT NULL AND "userId" IS NOT NULL)),
 ADD CONSTRAINT "access_invitation_decision" CHECK ("status" <> 'ACTIVE' OR ("decidedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL)),
 ADD CONSTRAINT "access_invitation_token" CHECK (("status" = 'PENDING_ACCEPTANCE' AND "tokenHash" IS NOT NULL) OR ("status" <> 'PENDING_ACCEPTANCE' AND "tokenHash" IS NULL)),
 ADD CONSTRAINT "access_invitation_hash" CHECK ("tokenHash" IS NULL OR "tokenHash" ~ '^[0-9a-f]{64}$'),
 ADD CONSTRAINT "access_invitation_version" CHECK ("tokenVersion" > 0),
 ADD CONSTRAINT "access_invitation_delivery" CHECK ("deliveryStatus" IN ('PENDING','CAPTURED','FAILED'));
ALTER TABLE "user_notifications"
 ADD CONSTRAINT "access_notification_kind" CHECK ("kind" IN ('ACCESS_APPROVED','ACCESS_REVOKED')),
 ADD CONSTRAINT "access_notification_email" CHECK ("emailStatus" IN ('PENDING','CAPTURED','FAILED','NOT_REQUESTED'));
-- Validate at COMMIT so identity consent, grant, decision and notification can be atomic.
CREATE FUNCTION enforce_access_invitation_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_row access_invitations%ROWTYPE;
BEGIN
 SELECT * INTO current_row FROM access_invitations WHERE id = NEW.id;
 IF current_row.status = 'ACTIVE' AND NOT EXISTS (
   SELECT 1 FROM role_assignments a JOIN roles r ON r.id = a."roleId"
   WHERE a.id = current_row."assignmentId" AND a."userId" = current_row."userId"
     AND r.key = current_row."proposedRoleKey" AND r.system = true
 ) THEN RAISE EXCEPTION 'access_invitation_assignment_required' USING ERRCODE = '23514'; END IF;
 RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER access_invitation_assignment_required
 AFTER INSERT OR UPDATE ON access_invitations
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_access_invitation_assignment();
COMMIT;
