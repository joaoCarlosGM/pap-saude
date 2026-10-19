CREATE TYPE "InvitationStatus"
AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REVOKED'
);

CREATE TABLE "user_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "userId" TEXT,
  "organizationId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "invitedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_invitations_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_invitations_tokenHash_key"
ON "user_invitations" ("tokenHash");

CREATE INDEX "user_invitations_email_status_idx"
ON "user_invitations" ("email", "status");

CREATE INDEX "user_invitations_organizationId_status_idx"
ON "user_invitations" ("organizationId", "status");

CREATE INDEX "user_invitations_expiresAt_idx"
ON "user_invitations" ("expiresAt");

CREATE UNIQUE INDEX "user_invitations_pending_email_org_role_key"
ON "user_invitations" (
  "email",
  "organizationId",
  "roleKey"
)
WHERE "status" = 'PENDING';

ALTER TABLE "user_invitations"
ADD CONSTRAINT "user_invitations_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "user_invitations"
ADD CONSTRAINT "user_invitations_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "user_invitations"
ADD CONSTRAINT "user_invitations_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "user_invitations"
ADD CONSTRAINT "user_invitations_expiration_after_creation"
CHECK (
  "expiresAt" > "createdAt"
);

ALTER TABLE "user_invitations"
ADD CONSTRAINT "user_invitations_state_consistency"
CHECK (
  (
    "status" = 'PENDING'
    AND "acceptedAt" IS NULL
    AND "revokedAt" IS NULL
  )
  OR
  (
    "status" = 'ACCEPTED'
    AND "acceptedAt" IS NOT NULL
    AND "revokedAt" IS NULL
  )
  OR
  (
    "status" = 'REVOKED'
    AND "acceptedAt" IS NULL
    AND "revokedAt" IS NOT NULL
  )
);
