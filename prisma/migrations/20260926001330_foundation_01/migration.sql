-- PAP Saúde - Foundation 01
--
-- Esta migration sucede 20260909150044_init_clinical_schema.
-- A migration anterior já foi aplicada em produção, portanto seu histórico não deve ser reescrito.
-- Antes da criação desta migration foi verificado em produção que patients, admissions e
-- clinical_evaluations continham 0 registros.
-- Por esse motivo, as operações destrutivas abaixo fazem parte intencionalmente da
-- substituição do modelo clínico inicial pela Foundation 01 e não exigem migração de dados.
--
-- Verificado em: 2026-09-26

/*
  Warnings:

  - You are about to drop the column `consciousness` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `diastolicBp` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `heartRate` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `oxygenSaturation` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `respiratoryRate` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `systolicBp` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `clinical_evaluations` table. All the data in the column will be lost.
  - You are about to drop the column `medicalRecordNo` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the `admissions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cns]` on the table `patients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PAP', 'MUNICIPALITY', 'HEALTH_UNIT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "PregnancyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EdemaGrade" AS ENUM ('NONE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS', 'FOUR_PLUS');

-- CreateEnum
CREATE TYPE "ProteinuriaResult" AS ENUM ('NOT_PERFORMED', 'NEGATIVE', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS', 'FOUR_PLUS');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "IntegrationEnvironment" AS ENUM ('SANDBOX', 'HOMOLOGATION', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "RNDSIntegrationStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'CONFIGURING', 'VALIDATING', 'HOMOLOGATION', 'PENDING_PAP_APPROVAL', 'APPROVED', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ValidationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ValidationResultStatus" AS ENUM ('PASSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "IntegrationPolicyAction" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "TransmissionStatus" AS ENUM ('QUEUED', 'SENDING', 'ACKNOWLEDGED', 'FAILED', 'RETRY_SCHEDULED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_patientId_fkey";

-- DropForeignKey
ALTER TABLE "clinical_evaluations" DROP CONSTRAINT "clinical_evaluations_patientId_fkey";

-- DropIndex
DROP INDEX "patients_medicalRecordNo_key";

-- AlterTable
ALTER TABLE "clinical_evaluations" DROP COLUMN "consciousness",
DROP COLUMN "diastolicBp",
DROP COLUMN "heartRate",
DROP COLUMN "oxygenSaturation",
DROP COLUMN "respiratoryRate",
DROP COLUMN "systolicBp",
DROP COLUMN "temperature",
ADD COLUMN     "encounterId" TEXT;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "medicalRecordNo",
ADD COLUMN     "cns" TEXT,
ALTER COLUMN "cpf" DROP NOT NULL;

-- DropTable
DROP TABLE "admissions";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_organizations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medicalRecordNo" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),

    CONSTRAINT "patient_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregnancies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "PregnancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMenstrualDate" TIMESTAMP(3),
    "estimatedDueDate" TIMESTAMP(3),
    "firstPrenatalAt" TIMESTAMP(3),
    "gravida" INTEGER,
    "parity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pregnancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "organizationId" TEXT NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'DRAFT',
    "chiefComplaint" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "systolicBp" INTEGER NOT NULL,
    "diastolicBp" INTEGER NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "respiratoryRate" INTEGER NOT NULL,
    "temperature" DECIMAL(4,1),
    "oxygenSaturation" INTEGER,
    "consciousness" "ConsciousnessState" NOT NULL DEFAULT 'ALERT',
    "urineOutputMl" INTEGER,
    "proteinuria" "ProteinuriaResult" NOT NULL DEFAULT 'NOT_PERFORMED',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obstetric_data" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "uterineHeightCm" DECIMAL(5,2),
    "fetalHeartRate" INTEGER,
    "fetalMovement" BOOLEAN,
    "edema" "EdemaGrade" NOT NULL DEFAULT 'NONE',
    "bleeding" BOOLEAN,
    "weightKg" DECIMAL(6,2),
    "complaints" TEXT,
    "notes" TEXT,

    CONSTRAINT "obstetric_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT,
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "notedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "reason" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rnds_integrations" (
    "id" TEXT NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "environment" "IntegrationEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "RNDSIntegrationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "statusMessage" TEXT,
    "requestedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rnds_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_policies" (
    "id" TEXT NOT NULL,
    "rndsIntegrationId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "action" "IntegrationPolicyAction" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rnds_validation_runs" (
    "id" TEXT NOT NULL,
    "rndsIntegrationId" TEXT NOT NULL,
    "requestedById" TEXT,
    "status" "ValidationRunStatus" NOT NULL DEFAULT 'PENDING',
    "version" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rnds_validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rnds_validation_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "checkKey" TEXT NOT NULL,
    "status" "ValidationResultStatus" NOT NULL,
    "message" TEXT,
    "evidence" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rnds_validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interoperability_transmissions" (
    "id" TEXT NOT NULL,
    "rndsIntegrationId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" "TransmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "errorCode" TEXT,
    "errorMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interoperability_transmissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "organizations_parentId_idx" ON "organizations"("parentId");

-- CreateIndex
CREATE INDEX "organizations_type_isActive_idx" ON "organizations"("type", "isActive");

-- CreateIndex
CREATE INDEX "memberships_organizationId_status_idx" ON "memberships"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_organizationId_key" ON "memberships"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_assignments_userId_organizationId_idx" ON "role_assignments"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_userId_roleId_organizationId_key" ON "role_assignments"("userId", "roleId", "organizationId");

-- CreateIndex
CREATE INDEX "patient_organizations_organizationId_isPrimary_idx" ON "patient_organizations"("organizationId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "patient_organizations_patientId_organizationId_key" ON "patient_organizations"("patientId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_organizations_organizationId_medicalRecordNo_key" ON "patient_organizations"("organizationId", "medicalRecordNo");

-- CreateIndex
CREATE INDEX "pregnancies_patientId_status_idx" ON "pregnancies"("patientId", "status");

-- CreateIndex
CREATE INDEX "encounters_organizationId_occurredAt_idx" ON "encounters"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "encounters_patientId_occurredAt_idx" ON "encounters"("patientId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "vital_signs_encounterId_key" ON "vital_signs"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "obstetric_data_encounterId_key" ON "obstetric_data"("encounterId");

-- CreateIndex
CREATE INDEX "allergies_patientId_status_idx" ON "allergies"("patientId", "status");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_occurredAt_idx" ON "audit_events"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_occurredAt_idx" ON "audit_events"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_resourceType_resourceId_idx" ON "audit_events"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_events_correlationId_occurredAt_idx" ON "audit_events"("correlationId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "rnds_integrations_healthUnitId_key" ON "rnds_integrations"("healthUnitId");

-- CreateIndex
CREATE INDEX "rnds_integrations_status_environment_idx" ON "rnds_integrations"("status", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "integration_policies_rndsIntegrationId_resourceType_key" ON "integration_policies"("rndsIntegrationId", "resourceType");

-- CreateIndex
CREATE INDEX "rnds_validation_runs_rndsIntegrationId_createdAt_idx" ON "rnds_validation_runs"("rndsIntegrationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rnds_validation_results_runId_checkKey_key" ON "rnds_validation_results"("runId", "checkKey");

-- CreateIndex
CREATE UNIQUE INDEX "interoperability_transmissions_correlationId_key" ON "interoperability_transmissions"("correlationId");

-- CreateIndex
CREATE INDEX "interoperability_transmissions_rndsIntegrationId_status_req_idx" ON "interoperability_transmissions"("rndsIntegrationId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "interoperability_transmissions_resourceType_resourceId_idx" ON "interoperability_transmissions"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "clinical_evaluations_patientId_evaluatedAt_idx" ON "clinical_evaluations"("patientId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "clinical_evaluations_encounterId_evaluatedAt_idx" ON "clinical_evaluations"("encounterId", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_cns_key" ON "patients"("cns");

-- CreateIndex
CREATE INDEX "patients_fullName_birthDate_idx" ON "patients"("fullName", "birthDate");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_organizations" ADD CONSTRAINT "patient_organizations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_organizations" ADD CONSTRAINT "patient_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "pregnancies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obstetric_data" ADD CONSTRAINT "obstetric_data_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_evaluations" ADD CONSTRAINT "clinical_evaluations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_evaluations" ADD CONSTRAINT "clinical_evaluations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rnds_integrations" ADD CONSTRAINT "rnds_integrations_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rnds_integrations" ADD CONSTRAINT "rnds_integrations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_policies" ADD CONSTRAINT "integration_policies_rndsIntegrationId_fkey" FOREIGN KEY ("rndsIntegrationId") REFERENCES "rnds_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rnds_validation_runs" ADD CONSTRAINT "rnds_validation_runs_rndsIntegrationId_fkey" FOREIGN KEY ("rndsIntegrationId") REFERENCES "rnds_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rnds_validation_runs" ADD CONSTRAINT "rnds_validation_runs_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rnds_validation_results" ADD CONSTRAINT "rnds_validation_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "rnds_validation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interoperability_transmissions" ADD CONSTRAINT "interoperability_transmissions_rndsIntegrationId_fkey" FOREIGN KEY ("rndsIntegrationId") REFERENCES "rnds_integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
