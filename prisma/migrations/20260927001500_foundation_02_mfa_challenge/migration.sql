-- Foundation 02 — MFA login challenge
--
-- A successful password verification MUST NOT create an authenticated
-- session when an ACTIVE MFA factor exists.
--
-- Only the SHA-256 representation of the opaque challenge token is
-- persisted.

CREATE TABLE "mfa_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "mfa_challenges_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "mfa_challenges_tokenHash_key"
ON "mfa_challenges"("tokenHash");

CREATE INDEX
  "mfa_challenges_userId_consumedAt_expiresAt_idx"
ON "mfa_challenges"(
  "userId",
  "consumedAt",
  "expiresAt"
);

CREATE INDEX
  "mfa_challenges_expiresAt_idx"
ON "mfa_challenges"("expiresAt");

ALTER TABLE "mfa_challenges"
ADD CONSTRAINT "mfa_challenges_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "mfa_challenges"
ADD CONSTRAINT "mfa_challenge_expiration_after_creation"
CHECK (
  "expiresAt" > "createdAt"
);

ALTER TABLE "mfa_challenges"
ADD CONSTRAINT "mfa_challenge_consumption_after_creation"
CHECK (
  "consumedAt" IS NULL
  OR "consumedAt" >= "createdAt"
);
