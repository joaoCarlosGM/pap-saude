-- Foundation 02 — Login abuse protection
--
-- Stores only cryptographic hashes of login identity and origin.
-- Raw e-mail addresses and raw network addresses are intentionally
-- excluded from this table.

CREATE TYPE "LoginAttemptOutcome" AS ENUM (
  'SUCCESS',
  'FAILURE',
  'THROTTLED'
);

CREATE TABLE "login_attempts" (
  "id" TEXT NOT NULL,
  "identityHash" TEXT NOT NULL,
  "originHash" TEXT NOT NULL,
  "outcome" "LoginAttemptOutcome" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_attempts_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX
  "login_attempts_identityHash_occurredAt_idx"
ON "login_attempts"(
  "identityHash",
  "occurredAt"
);

CREATE INDEX
  "login_attempts_originHash_occurredAt_idx"
ON "login_attempts"(
  "originHash",
  "occurredAt"
);

CREATE INDEX
  "login_attempts_originHash_identityHash_occurredAt_idx"
ON "login_attempts"(
  "originHash",
  "identityHash",
  "occurredAt"
);
