import { Prisma } from "@prisma/client";
import { db } from "../db/client";
import { AccessDeniedError } from "../iam/authorization.errors";
import { PERMISSIONS } from "../iam/permissions";
import { ClinicalRevisionConflictError } from "./clinical-revision.errors";
import type { ListClinicalRevisionInput, RecordClinicalRevisionInput } from "./clinical-revision.types";
import { assertClinicalRevisionResourceType, normalizeClinicalRevisionReason, normalizeProposedClinicalChange } from "./clinical-revision.validation";
import { clinicalSnapshotHash, loadClinicalSnapshot, recordProvenanceReference, requireClinicalProvenanceScope } from "./clinical-provenance.service";

async function serializable<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 4) throw error;
    }
  }
}

/** A revision is an explicit proposal. No request JSON is a committed snapshot.
 * Legacy `before` is ignored, never copied to the clinical ledger or admin audit.
 * A separate, reviewed application workflow is required to enact a correction.
 */
export async function recordClinicalRevision(input: RecordClinicalRevisionInput) {
  assertClinicalRevisionResourceType(input.resourceType);
  const reason = normalizeClinicalRevisionReason(input.reason);
  const proposedAfter = normalizeProposedClinicalChange(input.resourceType, input.after);
  return serializable(async tx => {
    const current = await loadClinicalSnapshot(tx, input.resourceType, input.resourceId);
    if (current.patientId !== input.patientId || (current.organizationId && current.organizationId !== input.organizationId)) throw new AccessDeniedError();
    await requireClinicalProvenanceScope(tx, {
      actorUserId: input.actorUserId, organizationId: input.organizationId,
      sessionId: input.sessionId ?? undefined,
    }, current.patientId, PERMISSIONS.CLINICAL_REVISION_CREATE);
    const hash = clinicalSnapshotHash(current.snapshot);
    if (input.expectedSnapshotHash !== undefined && input.expectedSnapshotHash !== hash) throw new ClinicalRevisionConflictError();
    const currentValues = current.snapshot as Record<string, unknown>;
    if (Object.entries(proposedAfter).every(([key, value]) => JSON.stringify(currentValues[key]) === JSON.stringify(value))) {
      throw new ClinicalRevisionConflictError("Proposal does not change the current state.");
    }
    const event = await tx.clinicalProvenanceEvent.create({ data: {
      actorUserId: input.actorUserId, organizationId: input.organizationId,
      patientId: current.patientId, encounterId: current.encounterId,
      resourceType: input.resourceType, resourceId: input.resourceId,
      kind: "REVISION_PROPOSAL", status: "PROPOSED_NOT_APPLIED", reason,
      before: current.snapshot, after: current.snapshot, proposedAfter, sourceSnapshotHash: hash,
      requestId: input.requestId, correlationId: input.correlationId, sessionId: input.sessionId,
    } });
    await recordProvenanceReference(tx, event);
    return { ...event, action: "CLINICAL_REVISION_PROPOSED" as const, applied: false as const };
  });
}

/** Only clinical callers may read the private ledger. Legacy audit claims remain
 * explicitly unverified and never become authoritative before/after snapshots.
 */
export async function listClinicalRevisionHistory(input: ListClinicalRevisionInput) {
  if (!input.actorUserId) throw new AccessDeniedError();
  return serializable(async tx => {
    await requireClinicalProvenanceScope(tx, {
      actorUserId: input.actorUserId!, organizationId: input.organizationId,
      sessionId: input.sessionId ?? undefined,
    }, input.patientId, PERMISSIONS.CLINICAL_REVISION_READ);
    const where = {
      patientId: input.patientId, organizationId: input.organizationId,
      ...(input.resourceType ? { resourceType: input.resourceType } : {}),
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    };
    const [events, legacy] = await Promise.all([
      tx.clinicalProvenanceEvent.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }),
      tx.auditEvent.findMany({ where: { ...where, action: "CLINICAL_REVISION" }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }),
    ]);
    return [
      ...events.map(event => ({ ...event, action: event.kind === "REVISION_PROPOSAL" ? "CLINICAL_REVISION_PROPOSED" : "CLINICAL_MEASUREMENT_RECORDED", applied: event.status === "APPLIED", source: "PRIVATE_CLINICAL_LEDGER" })),
      ...legacy.map(event => ({
        id: event.id, actorUserId: event.actorUserId, organizationId: event.organizationId,
        patientId: event.patientId, resourceType: event.resourceType, resourceId: event.resourceId,
        reason: event.reason, occurredAt: event.occurredAt, action: event.action,
        status: "LEGACY_UNVERIFIED", applied: null, source: "LEGACY_AUDIT_CLAIM",
        // Preserve access to old claims without asserting that changes happened.
        legacyClaim: { before: event.before, after: event.after },
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id));
  });
}
