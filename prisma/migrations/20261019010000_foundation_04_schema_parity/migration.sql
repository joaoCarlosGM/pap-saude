-- Forward-only reconciliation of historical SQL with the unchanged Prisma model.
-- No rows/columns/tables are removed; historical checksums remain unchanged.
BEGIN;
-- Require callers to provide provenance explicitly, as the model already requires.
ALTER TABLE "clinical_evaluations"
 ALTER COLUMN "status" DROP DEFAULT,
 ALTER COLUMN "protocolId" DROP DEFAULT,
 ALTER COLUMN "protocolVersion" DROP DEFAULT,
 ALTER COLUMN "protocolStatus" DROP DEFAULT;
ALTER TABLE "clinical_flags" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "obstetric_data" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "vital_signs" ALTER COLUMN "updatedAt" DROP DEFAULT;
-- The remaining (userId, consumedAt, expiresAt) index retains the userId lookup
-- prefix. This obsolete auxiliary index is not a uniqueness/security constraint.
DROP INDEX "mfa_challenges_userId_revokedAt_idx";
-- PostgreSQL truncated the historical overlong name; adopt Prisma's canonical one.
ALTER INDEX "organization_metric_snapshots_organizationId_periodStart_period"
 RENAME TO "organization_metric_snapshots_organizationId_periodStart_pe_key";
COMMIT;
