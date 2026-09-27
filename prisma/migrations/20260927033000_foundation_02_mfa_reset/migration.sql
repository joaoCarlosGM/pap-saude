-- Foundation 02 — MFA reset / revocation
--
-- A challenge may be invalidated administratively without pretending
-- that the second factor was successfully consumed.

ALTER TABLE "mfa_challenges"
ADD COLUMN "revokedAt" TIMESTAMP(3);

ALTER TABLE "mfa_challenges"
ADD CONSTRAINT "mfa_challenge_revocation_after_creation"
CHECK (
  "revokedAt" IS NULL
  OR "revokedAt" >= "createdAt"
);

CREATE INDEX
  "mfa_challenges_userId_revokedAt_idx"
ON "mfa_challenges"(
  "userId",
  "revokedAt"
);
