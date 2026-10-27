-- CreateEnum
CREATE TYPE "ClinicalRegistrationOperationStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "clinical_registration_operations" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "requestFingerprint" TEXT,
    "status" "ClinicalRegistrationOperationStatus" NOT NULL DEFAULT 'PENDING',
    "patientId" TEXT,
    "pregnancyId" TEXT,
    "encounterId" TEXT,
    "evaluationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "clinical_registration_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_registration_operations_encounterId_key" ON "clinical_registration_operations"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_registration_operations_evaluationId_key" ON "clinical_registration_operations"("evaluationId");

-- CreateIndex
CREATE INDEX "clinical_registration_operations_organizationId_createdAt_idx" ON "clinical_registration_operations"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "clinical_registration_operations_patientId_idx" ON "clinical_registration_operations"("patientId");

-- CreateIndex
CREATE INDEX "clinical_registration_operations_pregnancyId_idx" ON "clinical_registration_operations"("pregnancyId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_registration_operations_actorUserId_organizationId_key" ON "clinical_registration_operations"("actorUserId", "organizationId", "keyHash");

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "pregnancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_registration_operations" ADD CONSTRAINT "clinical_registration_operations_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "clinical_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only terminal operations may survive COMMIT; neither a timeout nor a crash
-- can leave a publicly observable PENDING claim or a partial clinical graph.
ALTER TABLE "clinical_registration_operations"
ADD CONSTRAINT "clinical_registration_operation_hash_shape"
CHECK (
  "keyHash" ~ '^[0-9a-f]{64}$'
  AND ("requestFingerprint" IS NULL OR "requestFingerprint" ~ '^[0-9a-f]{64}$')
),
ADD CONSTRAINT "clinical_registration_operation_state_shape"
CHECK (
  ("status" = 'PENDING' AND "requestFingerprint" IS NOT NULL
    AND "patientId" IS NULL AND "pregnancyId" IS NULL
    AND "encounterId" IS NULL AND "evaluationId" IS NULL AND "completedAt" IS NULL)
  OR
  ("status" = 'COMPLETED' AND "requestFingerprint" IS NOT NULL
    AND "patientId" IS NOT NULL AND "encounterId" IS NOT NULL
    AND "evaluationId" IS NOT NULL AND "completedAt" IS NOT NULL)
  OR
  ("status" = 'CANCELLED' AND "requestFingerprint" IS NULL
    AND "patientId" IS NULL AND "pregnancyId" IS NULL
    AND "encounterId" IS NULL AND "evaluationId" IS NULL AND "completedAt" IS NOT NULL)
);

CREATE FUNCTION "p0_registration_terminal_at_commit"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE persisted "clinical_registration_operations"%ROWTYPE;
BEGIN
  SELECT * INTO persisted FROM "clinical_registration_operations" WHERE "id" = NEW."id";
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF persisted."status" = 'PENDING' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'REGISTRATION_OPERATION_MUST_BE_TERMINAL';
  END IF;
  IF persisted."status" = 'COMPLETED' AND NOT EXISTS (
    SELECT 1 FROM "encounters" e
    JOIN "clinical_evaluations" v ON v."id" = persisted."evaluationId"
    WHERE e."id" = persisted."encounterId"
      AND e."organizationId" = persisted."organizationId"
      AND e."patientId" = persisted."patientId"
      AND e."pregnancyId" IS NOT DISTINCT FROM persisted."pregnancyId"
      AND e."status" = 'COMPLETED'
      AND v."encounterId" = e."id" AND v."patientId" = e."patientId"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'REGISTRATION_OPERATION_RESULT_MISMATCH';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "p0_registration_terminal_at_commit"
AFTER INSERT OR UPDATE ON "clinical_registration_operations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "p0_registration_terminal_at_commit"();

-- A cancelled key is a durable barrier against a late/retried POST. A completed
-- key is immutable so a retry cannot lose the identity of its committed graph.
CREATE FUNCTION "p0_registration_operation_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'REGISTRATION_OPERATION_IMMUTABLE';
  END IF;
  IF OLD."status" <> 'PENDING'
    OR NEW."status" = 'PENDING'
    OR NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."actorUserId" IS DISTINCT FROM OLD."actorUserId"
    OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
    OR NEW."keyHash" IS DISTINCT FROM OLD."keyHash"
    OR NEW."requestFingerprint" IS DISTINCT FROM OLD."requestFingerprint"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'REGISTRATION_OPERATION_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "p0_registration_operation_immutable"
BEFORE UPDATE OR DELETE ON "clinical_registration_operations"
FOR EACH ROW EXECUTE FUNCTION "p0_registration_operation_immutable"();

CREATE TRIGGER "p0_registration_operation_no_truncate"
BEFORE TRUNCATE ON "clinical_registration_operations"
FOR EACH STATEMENT EXECUTE FUNCTION "p0_registration_operation_immutable"();
