import { createHash } from "node:crypto";
import { AuditOutcome, Prisma, type ClinicalProvenanceEvent } from "@prisma/client";
import { AccessDeniedError } from "../iam/authorization.errors";
import { requirePermission } from "../iam/authorization.service";
import { PERMISSIONS } from "../iam/permissions";
import type { ClinicalRevisionResourceType } from "./clinical-revision.types";

export type ClinicalMeasurementActorContext = {
  actorUserId: string;
  organizationId: string;
  sessionId?: string;
  requestId?: string;
  reason?: string;
};

/** Only server-loaded rows enter this serializer; Date/Decimal become JSON. */
export function clinicalSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]),
  );
  return value;
}
export function clinicalSnapshotHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

/** Snapshot and tenant identity are resolved together, never from request JSON. */
export async function loadClinicalSnapshot(tx: Prisma.TransactionClient, type: ClinicalRevisionResourceType, id: string) {
  if (typeof id !== "string" || !id) throw new AccessDeniedError();
  let row: unknown;
  let patientId: string | undefined;
  let organizationId: string | null = null;
  let encounterId: string | null = null;
  switch (type) {
    case "PATIENT": {
      const item = await tx.patient.findUnique({ where: { id } }); row = item; patientId = item?.id; break;
    }
    case "PREGNANCY": {
      const item = await tx.pregnancy.findUnique({ where: { id } }); row = item; patientId = item?.patientId; break;
    }
    case "ENCOUNTER": {
      const item = await tx.encounter.findUnique({ where: { id } }); row = item; patientId = item?.patientId;
      organizationId = item?.organizationId ?? null; encounterId = item?.id ?? null; break;
    }
    case "VITAL_SIGNS":
    case "OBSTETRIC_DATA": {
      const item = type === "VITAL_SIGNS"
        ? await tx.vitalSigns.findUnique({ where: { id }, include: { encounter: true } })
        : await tx.obstetricData.findUnique({ where: { id }, include: { encounter: true } });
      if (item) {
        const { encounter, ...measurement } = item;
        row = measurement; patientId = encounter.patientId;
        organizationId = encounter.organizationId; encounterId = encounter.id;
      }
      break;
    }
    case "ALLERGY": {
      const item = await tx.allergy.findUnique({ where: { id } }); row = item; patientId = item?.patientId; break;
    }
    case "CLINICAL_FLAG": {
      const item = await tx.clinicalFlag.findUnique({ where: { id } }); row = item; patientId = item?.patientId; break;
    }
    case "MEOWS_EVALUATION": {
      const item = await tx.clinicalEvaluation.findUnique({ where: { id }, include: { encounter: true } });
      if (item?.encounter) {
        const { encounter, ...evaluation } = item; row = evaluation; patientId = item.patientId;
        organizationId = encounter?.organizationId ?? null; encounterId = encounter?.id ?? null;
      }
      break;
    }
    default: throw new AccessDeniedError();
  }
  if (!row || !patientId) throw new AccessDeniedError();
  return { snapshot: clinicalSnapshot(row), patientId, organizationId, encounterId };
}

export async function requireClinicalProvenanceScope(
  tx: Prisma.TransactionClient,
  actor: ClinicalMeasurementActorContext | undefined,
  patientId: string,
  permission: typeof PERMISSIONS.CLINICAL_REVISION_CREATE | typeof PERMISSIONS.CLINICAL_REVISION_READ | typeof PERMISSIONS.VITAL_SIGNS_CREATE | typeof PERMISSIONS.VITAL_SIGNS_UPDATE | typeof PERMISSIONS.OBSTETRIC_DATA_CREATE | typeof PERMISSIONS.OBSTETRIC_DATA_UPDATE,
) {
  if (!actor?.actorUserId || !actor.organizationId) throw new AccessDeniedError();
  await requirePermission({ userId: actor.actorUserId, organizationId: actor.organizationId, permission }, tx);
  const linked = await tx.patientOrganization.findUnique({ where: {
    patientId_organizationId: { patientId, organizationId: actor.organizationId },
  }, select: { unlinkedAt: true } });
  if (!linked || linked.unlinkedAt) throw new AccessDeniedError();
  if (actor.sessionId) {
    const session = await tx.session.findUnique({ where: { id: actor.sessionId }, select: { userId: true, revokedAt: true, expiresAt: true } });
    if (!session || session.userId !== actor.actorUserId || session.revokedAt || session.expiresAt <= new Date()) throw new AccessDeniedError();
  }
}

/** Admin audit receives opaque references only. PHI stays in the private ledger. */
export async function recordProvenanceReference(tx: Prisma.TransactionClient, event: ClinicalProvenanceEvent) {
  const opaqueId = (value: string | null) => value && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value) ? value : undefined;
  await tx.auditEvent.create({ data: {
    actorUserId: event.actorUserId, organizationId: event.organizationId,
    action: event.kind === "REVISION_PROPOSAL" ? "CLINICAL_REVISION_PROPOSED" : "CLINICAL_MEASUREMENT_RECORDED",
    resourceType: "CLINICAL_PROVENANCE", resourceId: event.id,
    outcome: AuditOutcome.SUCCESS, sessionId: event.sessionId, requestId: opaqueId(event.requestId),
    correlationId: opaqueId(event.correlationId), metadata: { kind: event.kind, status: event.status },
    occurredAt: event.occurredAt,
  } });
}

/** Call in the SAME transaction as a measurement mutation; never after commit. */
export async function recordClinicalMeasurementProvenance(tx: Prisma.TransactionClient, input: {
  actorContext: ClinicalMeasurementActorContext;
  resourceType: "VITAL_SIGNS" | "OBSTETRIC_DATA";
  resourceId: string;
  before: unknown | null;
}) {
  const resource = await loadClinicalSnapshot(tx, input.resourceType, input.resourceId);
  if (resource.organizationId !== input.actorContext?.organizationId) throw new AccessDeniedError();
  const created = input.before === null;
  const permission = input.resourceType === "VITAL_SIGNS"
    ? created ? PERMISSIONS.VITAL_SIGNS_CREATE : PERMISSIONS.VITAL_SIGNS_UPDATE
    : created ? PERMISSIONS.OBSTETRIC_DATA_CREATE : PERMISSIONS.OBSTETRIC_DATA_UPDATE;
  await requireClinicalProvenanceScope(tx, input.actorContext, resource.patientId, permission);
  const before = input.before === null ? Prisma.JsonNull : clinicalSnapshot(input.before);
  const reason = input.actorContext.reason?.trim() || (created ? "Registro clínico inicial" : "Atualização clínica durante atendimento");
  if (reason.length < 3 || reason.length > 1000) throw new AccessDeniedError();
  const event = await tx.clinicalProvenanceEvent.create({ data: {
    actorUserId: input.actorContext.actorUserId, organizationId: input.actorContext.organizationId,
    patientId: resource.patientId, encounterId: resource.encounterId,
    resourceType: input.resourceType, resourceId: input.resourceId,
    kind: created ? "MEASUREMENT_CREATED" : "MEASUREMENT_UPDATED", status: "APPLIED",
    reason, before, after: resource.snapshot, sourceSnapshotHash: clinicalSnapshotHash(resource.snapshot),
    sessionId: input.actorContext.sessionId, requestId: input.actorContext.requestId,
  } });
  await recordProvenanceReference(tx, event);
  return event;
}
