import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { createSession } from "../../src/server/auth/session.service";
import { recordClinicalRevision, listClinicalRevisionHistory } from "../../src/server/clinical-revision/clinical-revision.service";
import { clinicalSnapshot, clinicalSnapshotHash, recordClinicalMeasurementProvenance, requireClinicalProvenanceScope } from "../../src/server/clinical-revision/clinical-provenance.service";
import { PERMISSIONS } from "../../src/server/iam/permissions";
import { AccessDeniedError } from "../../src/server/iam/authorization.errors";
import { ClinicalRevisionConflictError } from "../../src/server/clinical-revision/clinical-revision.errors";

before(async () => {
  const u = new URL(process.env.DATABASE_URL!);
  assert.equal(u.hostname, "127.0.0.1"); assert.equal(u.port, "25444"); assert.equal(u.pathname, "/pap_p0_provenance_test");
  const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(rows[0].name, "pap_p0_provenance_test");
  await bootstrapSystemIam();
});
after(() => db.$disconnect());
async function fixture() {
  const suffix = randomUUID();
  const pap = await db.organization.create({ data: { name: "Synthetic PAP", type: "PAP", status: "ACTIVE" } });
  const city = await db.organization.create({ data: { name: "Synthetic city", type: "MUNICIPALITY", status: "ACTIVE", parentId: pap.id } });
  const unit = await db.organization.create({ data: { name: "Synthetic unit", type: "HEALTH_UNIT", status: "ACTIVE", parentId: city.id } });
  const user = await db.user.create({ data: { email: `${suffix}@synthetic.invalid`, displayName: "Synthetic professional" } });
  await db.membership.create({ data: { userId: user.id, organizationId: unit.id, status: "ACTIVE" } });
  await assignSystemRole({ userId: user.id, roleKey: "PROFESSIONAL", organizationId: unit.id });
  const session = await createSession({ userId: user.id });
  const patient = await db.patient.create({ data: { fullName: "SYNTHETIC_PATIENT_PRIVATE_CANARY", birthDate: new Date("2000-01-01") } });
  await db.patientOrganization.create({ data: { patientId: patient.id, organizationId: unit.id } });
  const startedAt = new Date();
  const encounter = await db.encounter.create({ data: {
    patientId: patient.id, organizationId: unit.id, status: "IN_PROGRESS",
    occurredAt: new Date(startedAt.getTime() - 1000), startedAt,
  } });
  const actor = { actorUserId: user.id, organizationId: unit.id, sessionId: session.session.id };
  return { user, unit, patient, encounter, session, actor };
}
async function proposal(f: Awaited<ReturnType<typeof fixture>>, extra: Record<string, unknown> = {}) {
  return recordClinicalRevision({ ...f.actor, patientId: f.patient.id, resourceType: "PATIENT", resourceId: f.patient.id,
    reason: "SYNTHETIC_PRIVATE_REASON_CANARY", before: { fullName: "FORGED_BEFORE_CANARY" },
    after: { fullName: "PROPOSED_NAME_CANARY" }, ...extra });
}
async function counts() { return { ledger: await db.clinicalProvenanceEvent.count(), audits: await db.auditEvent.count() }; }

test("revision is explicitly not applied and captures the real server state instead of client before", async () => {
  const f = await fixture(); const event = await proposal(f);
  assert.equal(event.status, "PROPOSED_NOT_APPLIED"); assert.equal(event.applied, false);
  assert.equal(event.actorUserId, f.user.id); assert.equal(event.patientId, f.patient.id); assert.equal(event.organizationId, f.unit.id);
  assert.equal((event.before as Record<string, unknown>).fullName, f.patient.fullName);
  assert.deepEqual(event.before, event.after); assert.deepEqual(event.proposedAfter, { fullName: "PROPOSED_NAME_CANARY" });
  assert.equal((await db.patient.findUniqueOrThrow({ where: { id: f.patient.id } })).fullName, f.patient.fullName);
  assert.equal(JSON.stringify(event).includes("FORGED_BEFORE_CANARY"), false);
  assert.equal(event.sourceSnapshotHash, clinicalSnapshotHash(event.before));
});

test("administrative audit stores only opaque references, not clinical names, proposed values, reason or snapshots", async () => {
  const f = await fixture(); const event = await proposal(f);
  const audit = await db.auditEvent.findFirstOrThrow({ where: { resourceId: event.id } });
  assert.equal(audit.action, "CLINICAL_REVISION_PROPOSED");
  assert.equal(audit.before, null); assert.equal(audit.after, null); assert.equal(audit.reason, null); assert.equal(audit.patientId, null);
  for (const marker of [f.patient.fullName, "PROPOSED_NAME_CANARY", "SYNTHETIC_PRIVATE_REASON_CANARY", "FORGED_BEFORE_CANARY"]) assert.equal(JSON.stringify(audit).includes(marker), false);
});

test("an old expected snapshot is rejected after a real server update, without a new proposal or audit", async () => {
  const f = await fixture(); const expectedSnapshotHash = clinicalSnapshotHash(clinicalSnapshot(f.patient));
  await db.patient.update({ where: { id: f.patient.id }, data: { fullName: "NEW_SERVER_STATE" } });
  const before = await counts(); await assert.rejects(proposal(f, { expectedSnapshotHash }), ClinicalRevisionConflictError);
  assert.deepEqual(await counts(), before);
});

test("two concurrent proposals preserve authoritative snapshots and never apply either proposed value", async () => {
  const f = await fixture();
  const events = await Promise.all([proposal(f), proposal(f, { after: { fullName: "SECOND_PROPOSAL" } })]);
  assert.notEqual(events[0].id, events[1].id);
  for (const event of events) { assert.deepEqual(event.before, event.after); assert.equal(event.status, "PROPOSED_NOT_APPLIED"); }
  assert.equal((await db.patient.findUniqueOrThrow({ where: { id: f.patient.id } })).fullName, f.patient.fullName);
});

test("cross-tenant, mismatched patient and missing resources fail without ledger or success audit", async () => {
  const a = await fixture(), b = await fixture(); const before = await counts();
  await assert.rejects(proposal(a, { ...b.actor }), AccessDeniedError);
  await assert.rejects(proposal(a, { patientId: b.patient.id }), AccessDeniedError);
  await assert.rejects(proposal(a, { resourceId: randomUUID() }), AccessDeniedError);
  assert.deepEqual(await counts(), before);
});

test("role and live-session revocation deny proposals and private ledger history", async () => {
  const f = await fixture(); await proposal(f);
  await db.session.update({ where: { id: f.session.session.id }, data: { revokedAt: new Date(), revocationReason: "ADMIN_REVOKED" } });
  let before = await counts(); await assert.rejects(proposal(f), AccessDeniedError);
  await assert.rejects(listClinicalRevisionHistory({ ...f.actor, patientId: f.patient.id }), AccessDeniedError);
  assert.deepEqual(await counts(), before);
  const g = await fixture(); await db.roleAssignment.deleteMany({ where: { userId: g.user.id } });
  before = await counts(); await assert.rejects(proposal(g), AccessDeniedError); assert.deepEqual(await counts(), before);
});

test("PAP_ADMIN and COMMERCIAL have no implicit private-ledger or clinical-revision access", async () => {
  const f = await fixture();
  for (const roleKey of ["PAP_ADMIN", "COMMERCIAL"] as const) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@synthetic.invalid`, displayName: "Synthetic nonclinical user" } });
    await assignSystemRole({ userId: user.id, roleKey });
    const before = await counts();
    await assert.rejects(proposal(f, { actorUserId: user.id, sessionId: undefined }), AccessDeniedError);
    await assert.rejects(listClinicalRevisionHistory({ actorUserId: user.id, organizationId: f.unit.id, patientId: f.patient.id }), AccessDeniedError);
    assert.deepEqual(await counts(), before);
  }
});

test("unsupported types, immutable identity fields and MEOWS validation/score proposals are rejected", async () => {
  const f = await fixture(); const before = await counts();
  for (const after of [{ id: randomUUID() }, { organizationId: f.unit.id }, { meowsScore: 0 }]) await assert.rejects(proposal(f, { after }));
  await assert.rejects(proposal(f, { resourceType: "UNKNOWN" }));
  await assert.rejects(proposal(f, { after: {} }));
  await assert.rejects(proposal(f, { after: { fullName: f.patient.fullName } }), ClinicalRevisionConflictError);
  assert.deepEqual(await counts(), before);
});

test("measurement creation and update ledger capture server rows, author, time and clinical scope in the same transaction", async () => {
  const f = await fixture();
  const first = await db.$transaction(async tx => {
    const row = await tx.vitalSigns.create({ data: { encounterId: f.encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 90, respiratoryRate: 16 } });
    return recordClinicalMeasurementProvenance(tx, { actorContext: f.actor, resourceType: "VITAL_SIGNS", resourceId: row.id, before: null });
  });
  assert.equal(first.kind, "MEASUREMENT_CREATED"); assert.equal(first.status, "APPLIED"); assert.equal(first.before, null);
  assert.equal(first.actorUserId, f.user.id); assert.equal(first.encounterId, f.encounter.id); assert.equal(first.patientId, f.patient.id);
  const second = await db.$transaction(async tx => {
    const before = await tx.vitalSigns.findUniqueOrThrow({ where: { encounterId: f.encounter.id } });
    const row = await tx.vitalSigns.update({ where: { id: before.id }, data: { heartRate: 100 } });
    return recordClinicalMeasurementProvenance(tx, { actorContext: f.actor, resourceType: "VITAL_SIGNS", resourceId: row.id, before });
  });
  assert.equal((second.before as Record<string, unknown>).heartRate, 90);
  assert.equal((second.after as Record<string, unknown>).heartRate, 100);
  assert.equal(second.sourceSnapshotHash, clinicalSnapshotHash(second.after)); assert.ok(second.occurredAt instanceof Date);
});

test("missing, foreign or revoked measurement actor rolls back both the clinical write and ledger", async () => {
  const f = await fixture(), other = await fixture();
  for (const actorContext of [undefined, other.actor]) {
    const before = await counts();
    await assert.rejects(db.$transaction(async tx => {
      const row = await tx.obstetricData.create({ data: { encounterId: f.encounter.id, fetalHeartRate: 140 } });
      await recordClinicalMeasurementProvenance(tx, { actorContext: actorContext!, resourceType: "OBSTETRIC_DATA", resourceId: row.id, before: null });
    }), AccessDeniedError);
    assert.equal(await db.obstetricData.count({ where: { encounterId: f.encounter.id } }), 0); assert.deepEqual(await counts(), before);
  }
});

test("a transaction failure rolls back clinical mutation, provenance and administrative reference together", async () => {
  const f = await fixture(); const before = await counts();
  await assert.rejects(db.$transaction(async tx => {
    const row = await tx.obstetricData.create({ data: { encounterId: f.encounter.id, weightKg: 60 } });
    await recordClinicalMeasurementProvenance(tx, { actorContext: f.actor, resourceType: "OBSTETRIC_DATA", resourceId: row.id, before: null });
    throw new Error("SYNTHETIC_TRANSACTION_INTERRUPTION");
  }), /SYNTHETIC_TRANSACTION_INTERRUPTION/);
  assert.equal(await db.obstetricData.count({ where: { encounterId: f.encounter.id } }), 0); assert.deepEqual(await counts(), before);
});

test("the private ledger denies update, delete and truncate with both immutable triggers enabled", async () => {
  const f = await fixture(); const event = await proposal(f);
  await assert.rejects(db.clinicalProvenanceEvent.update({ where: { id: event.id }, data: { reason: "Attempt to rewrite history" } }));
  await assert.rejects(db.clinicalProvenanceEvent.delete({ where: { id: event.id } }));
  await assert.rejects(db.$executeRaw`TRUNCATE clinical_provenance_events`);
  assert.equal((await db.clinicalProvenanceEvent.findUniqueOrThrow({ where: { id: event.id } })).reason, event.reason);
  const triggers = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM pg_trigger WHERE tgrelid='clinical_provenance_events'::regclass AND tgname IN ('p0_clinical_provenance_immutable_row','p0_clinical_provenance_immutable_truncate') AND tgenabled='O'`;
  assert.equal(Number(triggers[0].count), 2);
});

test("history labels legacy claims as unverified and scopes every returned row", async () => {
  const f = await fixture(); const event = await proposal(f);
  await db.auditEvent.create({ data: { actorUserId: f.user.id, organizationId: f.unit.id, patientId: f.patient.id, action: "CLINICAL_REVISION", resourceType: "PATIENT", resourceId: f.patient.id, outcome: "SUCCESS", before: { fullName: "LEGACY_CLAIM" }, after: { fullName: "LEGACY_PROPOSED" } } });
  const items = await listClinicalRevisionHistory({ ...f.actor, patientId: f.patient.id });
  const legacy = items.find(item => item.source === "LEGACY_AUDIT_CLAIM");
  assert.equal(legacy?.status, "LEGACY_UNVERIFIED"); assert.equal(legacy?.applied, null);
  assert.ok(items.some(item => item.id === event.id));
  assert.ok(items.every(item => item.organizationId === f.unit.id));
});
