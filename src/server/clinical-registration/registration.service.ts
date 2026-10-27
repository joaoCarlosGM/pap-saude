import { createHash, createHmac } from "node:crypto";
import { AuditOutcome, Prisma, type ClinicalRegistrationOperation } from "@prisma/client";
import { db } from "../db/client";
import { validateSession } from "../auth/session.service";
import { InvalidSessionError, ExpiredSessionError, RevokedSessionError, InactiveSessionUserError } from "../auth/session.errors";
import { requirePermission } from "../iam/authorization.service";
import { AccessDeniedError } from "../iam/authorization.errors";
import { PERMISSIONS } from "../iam/permissions";
import { createPatient, findPatientByCpf } from "../patients/patient.service";
import { PatientCpfConflictError } from "../patients/patient.errors";
import { hasActivePatientOrganizationLink, linkPatientToOrganization } from "../patients/patient-organization.service";
import { createPregnancy, getActivePregnancyForPatient } from "../pregnancies/pregnancy.service";
import { ActivePregnancyConflictError } from "../pregnancies/pregnancy.errors";
import { createEncounter, startEncounter, completeEncounter } from "../encounters/encounter.service";
import { createVitalSigns } from "../vital-signs/vital-signs.service";
import { createObstetricData } from "../obstetric-data/obstetric-data.service";
import { persistEncounterMeowsEvaluation } from "../meows/meows.service";
import { RegistrationInputError, validateRegistrationPayload } from "./registration.validation";

export class RegistrationOperationError extends Error {
  constructor(readonly code: string, readonly status: 400 | 401 | 403 | 409 | 503) { super(code); }
}
export type RegistrationStage = "AUTHORIZED" | "CLAIMED" | "PATIENT" | "PREGNANCY" | "ENCOUNTER" | "STARTED" | "VITALS" | "OBSTETRICS" | "EVALUATED" | "COMPLETED" | "FINALIZED";
export type RegistrationIdentity = { sessionToken: string; organizationId: string; operationKey: string };
type Actor = { userId: string; sessionId: string; organizationId: string };
const permissions = [PERMISSIONS.PATIENT_READ, PERMISSIONS.PATIENT_CREATE, PERMISSIONS.PREGNANCY_READ, PERMISSIONS.PREGNANCY_CREATE, PERMISSIONS.ENCOUNTER_READ, PERMISSIONS.ENCOUNTER_CREATE, PERMISSIONS.ENCOUNTER_UPDATE, PERMISSIONS.VITAL_SIGNS_CREATE, PERMISSIONS.OBSTETRIC_DATA_CREATE, PERMISSIONS.MEOWS_READ, PERMISSIONS.MEOWS_EVALUATE] as const;

function identity(input: RegistrationIdentity) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationKey)) throw new RegistrationInputError();
  if (!input.organizationId.trim() || input.organizationId.length > 128 || /[\x00-\x1f,]/.test(input.organizationId)) throw new RegistrationInputError();
  const operationKey = input.operationKey.toLowerCase();
  return { operationKey, keyHash: createHash("sha256").update("pap:clinical-registration:key:v1:").update(operationKey).digest("hex") };
}
async function authorize(input: RegistrationIdentity, tx: Prisma.TransactionClient): Promise<Actor> {
  let actor;
  try {
    actor = await validateSession(input.sessionToken, { client: tx, updateLastSeen: false });
  } catch (error) {
    if (error instanceof InvalidSessionError || error instanceof ExpiredSessionError || error instanceof RevokedSessionError || error instanceof InactiveSessionUserError) {
      throw new RegistrationOperationError("AUTHENTICATION_REQUIRED", 401);
    }
    throw error;
  }
  for (const permission of permissions) await requirePermission({ userId: actor.user.id, organizationId: input.organizationId, permission }, tx);
  // Professional enrollment remains optional. Once enrolled, a primary session
  // cannot substitute for the real second-factor login, including old sessions.
  const factor = await tx.mfaFactor.findFirst({ where: { userId: actor.user.id, type: "TOTP", status: "ACTIVE" }, orderBy: { enabledAt: "desc" }, select: { enabledAt: true } });
  if (factor) {
    const verified = actor.session.mfaVerifiedAt;
    if (!verified || !factor.enabledAt || verified < factor.enabledAt || verified < actor.session.createdAt || verified > new Date()) throw new RegistrationOperationError("MFA_REQUIRED", 403);
  }
  return { userId: actor.user.id, sessionId: actor.session.id, organizationId: input.organizationId };
}
function selector(actor: Actor, keyHash: string) {
  return { actorUserId_organizationId_keyHash: { actorUserId: actor.userId, organizationId: actor.organizationId, keyHash } };
}
async function completedResult(row: ClinicalRegistrationOperation, actor: Actor, tx: Prisma.TransactionClient) {
  if (row.status !== "COMPLETED" || !row.patientId || !row.encounterId || !row.evaluationId) throw new RegistrationOperationError("REGISTRATION_UNAVAILABLE", 503);
  if (!await hasActivePatientOrganizationLink(row.patientId, actor.organizationId, tx)) throw new AccessDeniedError();
  const [patient, encounter, meows] = await Promise.all([
    tx.patient.findUnique({ where: { id: row.patientId }, select: { isActive: true } }),
    tx.encounter.findUnique({ where: { id: row.encounterId }, select: { organizationId: true, patientId: true, pregnancyId: true, status: true } }),
    tx.clinicalEvaluation.findUnique({ where: { id: row.evaluationId } }),
  ]);
  if (!patient?.isActive || encounter?.organizationId !== actor.organizationId || encounter.patientId !== row.patientId || encounter.pregnancyId !== row.pregnancyId || encounter.status !== "COMPLETED" || !meows || meows.encounterId !== row.encounterId || meows.patientId !== row.patientId) throw new AccessDeniedError();
  return { patientId: row.patientId, pregnancyId: row.pregnancyId, encounterId: row.encounterId, meows };
}
function retryable(error: unknown) {
  return (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) || error instanceof PatientCpfConflictError || error instanceof ActivePregnancyConflictError;
}
function classification(error: unknown) {
  if (error instanceof AccessDeniedError) return "ACCESS_DENIED";
  if (error instanceof RegistrationOperationError) return error.code;
  if (error instanceof RegistrationInputError) return "REGISTRATION_INVALID_INPUT";
  return "REGISTRATION_UNAVAILABLE";
}

/** Trusted dependency injection only; no HTTP payload or environment enables hooks. */
export function createClinicalRegistrationService(options: { afterStage?: (stage: RegistrationStage) => Promise<void>; transactionTimeoutMs?: number } = {}) {
  async function transaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await db.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: options.transactionTimeoutMs ?? 15_000 });
      } catch (error) {
        if (!retryable(error) || attempt >= 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
      }
    }
  }
  async function auditFailure(actor: Actor | undefined, stage: RegistrationStage | "VALIDATION", error: unknown) {
    if (!actor) return;
    try {
      await db.auditEvent.create({ data: {
        actorUserId: actor.userId, sessionId: actor.sessionId, organizationId: actor.organizationId,
        action: "CLINICAL_REGISTRATION_FAILED", resourceType: "CLINICAL_REGISTRATION_OPERATION",
        outcome: AuditOutcome.FAILURE,
        // A connection failure during COMMIT can leave the caller uncertain.
        // Never describe a failed response as proof of database rollback.
        reason: classification(error), metadata: { version: 1, stage, writeOutcome: "UNCONFIRMED", retrySameKey: true },
      } });
    } catch {
      throw new RegistrationOperationError("REGISTRATION_AUDIT_UNAVAILABLE", 503);
    }
  }
  async function submit(input: RegistrationIdentity & { payload: unknown }) {
    const key = identity(input);
    const payload = validateRegistrationPayload(input.payload);
    // Generated timestamps never enter the fingerprint. HMAC avoids persisting
    // a dictionary-checkable unsalted digest of names or dates of birth.
    const fingerprint = createHmac("sha256", key.operationKey).update("pap:clinical-registration:payload:v1:").update(JSON.stringify(payload)).digest("hex");
    let failureActor: Actor | undefined;
    let stage: RegistrationStage | "VALIDATION" = "VALIDATION";
    try {
      return await transaction(async tx => {
        const actor = await authorize(input, tx);
        failureActor = actor;
        const observe = async (next: RegistrationStage) => { stage = next; await options.afterStage?.(next); };
        await observe("AUTHORIZED");
        const existing = await tx.clinicalRegistrationOperation.findUnique({ where: selector(actor, key.keyHash) });
        if (existing) {
          if (existing.status === "CANCELLED") throw new RegistrationOperationError("REGISTRATION_OPERATION_CANCELLED", 409);
          if (existing.requestFingerprint !== fingerprint) throw new RegistrationOperationError("REGISTRATION_OPERATION_PAYLOAD_CONFLICT", 409);
          return { status: "COMPLETED" as const, replayed: true, registration: await completedResult(existing, actor, tx) };
        }
        const operation = await tx.clinicalRegistrationOperation.create({ data: { actorUserId: actor.userId, organizationId: actor.organizationId, keyHash: key.keyHash, requestFingerprint: fingerprint } });
        await observe("CLAIMED");
        let patient = payload.patient.cpf ? await findPatientByCpf(payload.patient.cpf, tx) : null;
        if (patient) {
          // A CPF is never permission to attach a foreign tenant's chart.
          if (!await hasActivePatientOrganizationLink(patient.id, actor.organizationId, tx)) throw new RegistrationOperationError("REGISTRATION_PATIENT_REQUIRES_REVIEW", 409);
          if (!patient.isActive) throw new AccessDeniedError();
        } else {
          patient = await createPatient(payload.patient, tx);
          await linkPatientToOrganization({ patientId: patient.id, organizationId: actor.organizationId, isPrimary: true }, tx);
        }
        await observe("PATIENT");
        let pregnancy = await getActivePregnancyForPatient(patient.id, tx);
        if (!pregnancy && (payload.pregnancy.firstPrenatal || payload.pregnancy.lastMenstrualDate)) {
          pregnancy = await createPregnancy({ patientId: patient.id, lastMenstrualDate: payload.pregnancy.lastMenstrualDate, firstPrenatalAt: payload.pregnancy.firstPrenatal ? new Date() : null }, tx);
        }
        await observe("PREGNANCY");
        const encounter = await createEncounter({ patientId: patient.id, pregnancyId: pregnancy?.id ?? null, organizationId: actor.organizationId, chiefComplaint: payload.chiefComplaint }, tx);
        await observe("ENCOUNTER");
        await startEncounter(encounter.id, tx);
        await observe("STARTED");
        const actorContext = { actorUserId: actor.userId, sessionId: actor.sessionId, organizationId: actor.organizationId, reason: "Cadastro clínico inicial" };
        const vitals = { ...payload.vitalSigns, encounterId: encounter.id, actorContext };
        await createVitalSigns(vitals, tx);
        await observe("VITALS");
        const obstetric = { ...payload.obstetricData, encounterId: encounter.id, actorContext };
        await createObstetricData(obstetric, tx);
        await observe("OBSTETRICS");
        const meows = await persistEncounterMeowsEvaluation(encounter.id, payload.obstetricData.notes, tx);
        await observe("EVALUATED");
        await completeEncounter(encounter.id, actor.userId, tx);
        await observe("COMPLETED");
        const completed = await tx.clinicalRegistrationOperation.update({ where: { id: operation.id }, data: { status: "COMPLETED", patientId: patient.id, pregnancyId: pregnancy?.id ?? null, encounterId: encounter.id, evaluationId: meows.id, completedAt: new Date() } });
        await tx.auditEvent.create({ data: { actorUserId: actor.userId, sessionId: actor.sessionId, organizationId: actor.organizationId, patientId: patient.id, action: "CLINICAL_REGISTRATION_COMPLETED", resourceType: "CLINICAL_REGISTRATION_OPERATION", resourceId: operation.id, outcome: AuditOutcome.SUCCESS, metadata: { version: 1 } } });
        await observe("FINALIZED");
        return { status: "COMPLETED" as const, replayed: false, registration: await completedResult(completed, actor, tx) };
      });
    } catch (error) {
      await auditFailure(failureActor, stage, error);
      throw error;
    }
  }
  async function status(input: RegistrationIdentity) {
    const key = identity(input);
    return transaction(async tx => {
      const actor = await authorize(input, tx);
      const row = await tx.clinicalRegistrationOperation.findUnique({ where: selector(actor, key.keyHash) });
      if (!row) return { status: "NOT_FOUND" as const };
      if (row.status === "CANCELLED") return { status: "CANCELLED" as const };
      return { status: "COMPLETED" as const, replayed: true, registration: await completedResult(row, actor, tx) };
    });
  }
  async function cancel(input: RegistrationIdentity) {
    const key = identity(input);
    return transaction(async tx => {
      const actor = await authorize(input, tx);
      const existing = await tx.clinicalRegistrationOperation.findUnique({ where: selector(actor, key.keyHash) });
      if (existing?.status === "COMPLETED") return { status: "COMPLETED" as const, replayed: true, registration: await completedResult(existing, actor, tx) };
      if (existing?.status === "CANCELLED") return { status: "CANCELLED" as const };
      if (existing) throw new RegistrationOperationError("REGISTRATION_UNAVAILABLE", 503);
      const operation = await tx.clinicalRegistrationOperation.create({ data: { actorUserId: actor.userId, organizationId: actor.organizationId, keyHash: key.keyHash, status: "CANCELLED", completedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: actor.userId, sessionId: actor.sessionId, organizationId: actor.organizationId, action: "CLINICAL_REGISTRATION_CANCELLED", resourceType: "CLINICAL_REGISTRATION_OPERATION", resourceId: operation.id, outcome: AuditOutcome.SUCCESS, metadata: { version: 1 } } });
      return { status: "CANCELLED" as const };
    });
  }
  return { submit, status, cancel };
}
export const clinicalRegistrationService = createClinicalRegistrationService();
