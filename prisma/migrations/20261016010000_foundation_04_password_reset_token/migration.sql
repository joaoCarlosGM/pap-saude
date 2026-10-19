-- F04.5F - append-only migration. No historical migration modified.
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "originHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "password_reset_tokens_not_expired_at_creation"
    CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "password_reset_tokens_consumed_after_creation"
    CHECK ("consumedAt" IS NULL OR "consumedAt" >= "createdAt"),
  CONSTRAINT "password_reset_tokens_revoked_after_creation"
    CHECK ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_createdAt_idx" ON "password_reset_tokens"("userId", "createdAt");
CREATE INDEX "password_reset_tokens_originHash_createdAt_idx" ON "password_reset_tokens"("originHash", "createdAt");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");
