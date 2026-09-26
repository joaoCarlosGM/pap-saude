-- CreateEnum
CREATE TYPE "PasswordAlgorithm" AS ENUM ('ARGON2ID');

-- CreateEnum
CREATE TYPE "MfaFactorType" AS ENUM ('TOTP');

-- CreateEnum
CREATE TYPE "MfaFactorStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionRevocationReason" AS ENUM ('LOGOUT', 'PASSWORD_CHANGED', 'MFA_RESET', 'ADMIN_REVOKED', 'USER_SUSPENDED', 'SECURITY_EVENT');

-- CreateTable
CREATE TABLE "password_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "algorithm" "PasswordAlgorithm" NOT NULL DEFAULT 'ARGON2ID',
    "mustChange" BOOLEAN NOT NULL DEFAULT false,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_factors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MfaFactorType" NOT NULL DEFAULT 'TOTP',
    "status" "MfaFactorStatus" NOT NULL DEFAULT 'PENDING',
    "secretEncrypted" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" "SessionRevocationReason",
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_credentials_userId_key" ON "password_credentials"("userId");

-- CreateIndex
CREATE INDEX "mfa_factors_userId_status_idx" ON "mfa_factors"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_recovery_codes_codeHash_key" ON "mfa_recovery_codes"("codeHash");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_userId_usedAt_idx" ON "mfa_recovery_codes"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_expiresAt_idx" ON "sessions"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- F02_SECURITY_CONSTRAINTS
-- PAP SAUDE - Identity & Access security invariants
-- ============================================================

-- ------------------------------------------------------------
-- MFA lifecycle
-- ------------------------------------------------------------

ALTER TABLE "mfa_factors"
ADD CONSTRAINT "mfa_factor_active_requires_enabled_at"
CHECK (
  "status" <> 'ACTIVE'
  OR "enabledAt" IS NOT NULL
);

ALTER TABLE "mfa_factors"
ADD CONSTRAINT "mfa_factor_revoked_requires_revoked_at"
CHECK (
  "status" <> 'REVOKED'
  OR "revokedAt" IS NOT NULL
);

-- Um usuario pode possuir historico de fatores,
-- mas somente um TOTP ACTIVE simultaneamente.
CREATE UNIQUE INDEX "mfa_one_active_totp_per_user"
ON "mfa_factors" ("userId")
WHERE "type" = 'TOTP'
  AND "status" = 'ACTIVE';

-- ------------------------------------------------------------
-- Session lifecycle
-- ------------------------------------------------------------

ALTER TABLE "sessions"
ADD CONSTRAINT "session_expiration_after_creation"
CHECK (
  "expiresAt" > "createdAt"
);

ALTER TABLE "sessions"
ADD CONSTRAINT "session_revocation_consistency"
CHECK (
  (
    "revokedAt" IS NULL
    AND "revocationReason" IS NULL
  )
  OR
  (
    "revokedAt" IS NOT NULL
    AND "revocationReason" IS NOT NULL
  )
);

-- lastSeenAt nao pode representar atividade anterior
-- a criacao da sessao.
ALTER TABLE "sessions"
ADD CONSTRAINT "session_last_seen_after_creation"
CHECK (
  "lastSeenAt" >= "createdAt"
);

-- ------------------------------------------------------------
-- Recovery-code lifecycle
-- ------------------------------------------------------------

ALTER TABLE "mfa_recovery_codes"
ADD CONSTRAINT "recovery_code_used_after_creation"
CHECK (
  "usedAt" IS NULL
  OR "usedAt" >= "createdAt"
);

ALTER TABLE "mfa_recovery_codes"
ADD CONSTRAINT "recovery_code_revoked_after_creation"
CHECK (
  "revokedAt" IS NULL
  OR "revokedAt" >= "createdAt"
);

-- ------------------------------------------------------------
-- MFA temporal consistency
-- ------------------------------------------------------------

ALTER TABLE "mfa_factors"
ADD CONSTRAINT "mfa_enabled_after_creation"
CHECK (
  "enabledAt" IS NULL
  OR "enabledAt" >= "createdAt"
);

ALTER TABLE "mfa_factors"
ADD CONSTRAINT "mfa_revoked_after_creation"
CHECK (
  "revokedAt" IS NULL
  OR "revokedAt" >= "createdAt"
);
