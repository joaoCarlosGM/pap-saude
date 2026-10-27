import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { db } from "../../src/server/db/client";
import { AccessDeniedError } from "../../src/server/iam/authorization.errors";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import type { ClinicalMeasurementActorContext } from "../../src/server/clinical-revision/clinical-provenance.service";
const actors = new Map<string, ClinicalMeasurementActorContext>();

const sourceRoot = resolve(process.env.PAP_CLINICAL_TEST_SOURCE_ROOT || "src/server");
let vitals: typeof import("../../src/server/vital-signs/vital-signs.service");
let obstetrics: typeof import("../../src/server/obstetric-data/obstetric-data.service");
let encounters: typeof import("../../src/server/encounters/encounter.service");

before(async () => {
  vitals = await import(pathToFileURL(resolve(sourceRoot, "vital-signs/vital-signs.service.ts")).href);
  obstetrics = await import(pathToFileURL(resolve(sourceRoot, "obstetric-data/obstetric-data.service.ts")).href);
  encounters = await import(pathToFileURL(resolve(sourceRoot, "encounters/encounter.service.ts")).href);
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.pathname, "/pap_release_clinical_backend_test");
  assert.equal(url.hostname, "127.0.0.1");
  assert.notEqual(url.port, "15432");
  await bootstrapSystemIam();
  const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(rows[0].name, "pap_release_clinical_backend_test");
});
after(async () => { await db.$disconnect(); });

async function fixture() {
  const suffix = randomUUID();
  const pap = await db.organization.create({ data: { name: `Synthetic PAP ${suffix}`, type: "PAP", status: "ACTIVE" } });
  const municipality = await db.organization.create({ data: { name: `Synthetic municipality ${suffix}`, type: "MUNICIPALITY", status: "ACTIVE", parentId: pap.id } });
  const unit = await db.organization.create({ data: { name: `Synthetic unit ${suffix}`, type: "HEALTH_UNIT", status: "ACTIVE", parentId: municipality.id } });
  const patient = await db.patient.create({ data: { fullName: "Synthetic race patient", birthDate: new Date("1990-01-01") } });
  await db.patientOrganization.create({ data: { organizationId: unit.id, patientId: patient.id } });
  const occurredAt = new Date(Date.now() - 60_000);
  const encounter = await db.encounter.create({ data: { organizationId: unit.id, patientId: patient.id, occurredAt, status: "IN_PROGRESS", startedAt: occurredAt } });
  const actor = await db.user.create({ data: { email: `${suffix}@synthetic.invalid`, displayName: "Synthetic clinical author" } });
  await db.membership.create({ data: { userId: actor.id, organizationId: unit.id, status: "ACTIVE" } });
  await assignSystemRole({ userId: actor.id, roleKey: "PROFESSIONAL", organizationId: unit.id });
  actors.set(encounter.id, { actorUserId: actor.id, organizationId: unit.id });
  return { encounter, actor };

}
type Resource = "vitalSigns" | "obstetricData";
type Operation = "create" | "update";
type Finalization = "complete" | "cancel";
async function readRecord(resource: Resource, encounterId: string) {
  return resource === "vitalSigns" ? db.vitalSigns.findUnique({ where: { encounterId } }) : db.obstetricData.findUnique({ where: { encounterId } });
}
async function mutate(resource: Resource, operation: Operation, encounterId: string, client?: Parameters<typeof vitals.createVitalSigns>[1]) {
  return resource === "vitalSigns"
    ? operation === "create" ? vitals.createVitalSigns({ actorContext: actors.get(encounterId)!, encounterId, systolicBp: 121, diastolicBp: 81, heartRate: 76, respiratoryRate: 17 }, client) : vitals.updateVitalSigns(encounterId, { actorContext: actors.get(encounterId)!, heartRate: 90 }, client)
    : operation === "create" ? obstetrics.createObstetricData({ actorContext: actors.get(encounterId)!, encounterId, weightKg: 61 }, client) : obstetrics.updateObstetricData(encounterId, { actorContext: actors.get(encounterId)!, weightKg: 62 }, client);
}
async function seedRecord(resource: Resource, operation: Operation, encounterId: string) {
  if (operation !== "update") return;
  if (resource === "vitalSigns") await vitals.createVitalSigns({ actorContext: actors.get(encounterId)!, encounterId, systolicBp: 120, diastolicBp: 80, heartRate: 75, respiratoryRate: 16 });
  else await obstetrics.createObstetricData({ actorContext: actors.get(encounterId)!, encounterId, weightKg: 60 });
}
async function waitForLock(client: pg.Client) {
  for (let i = 0; i < 250; i++) {
    await client.query("SELECT pg_stat_clear_snapshot()");
    const { rows } = await client.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");
    if (Number(rows[0].count) > 0) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("The competing request must wait for a real PostgreSQL row lock");
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

for (const resource of ["vitalSigns", "obstetricData"] as const) {
  for (const operation of ["create", "update"] as const) {
    for (const finalization of ["complete", "cancel"] as const) {
      test(`${resource}/${operation}: ${finalization} commits first; later write is rejected without changing clinical data`, { timeout: 15_000 }, async () => {
        const { encounter } = await fixture();
        await seedRecord(resource, operation, encounter.id);
        const before = await readRecord(resource, encounter.id);
        const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
        await lock.connect();
        let committed = false;
        let pending: Promise<{ value?: unknown; error?: unknown }> | undefined;
        try {
          await lock.query("BEGIN");
          await lock.query("SELECT id FROM encounters WHERE id=$1 FOR UPDATE", [encounter.id]);
          if (operation === "update") await lock.query(resource === "vitalSigns" ? "SELECT id FROM vital_signs WHERE \"encounterId\"=$1 FOR UPDATE" : "SELECT id FROM obstetric_data WHERE \"encounterId\"=$1 FOR UPDATE", [encounter.id]);
          pending = mutate(resource, operation, encounter.id).then(value => ({ value }), error => ({ error }));
          await waitForLock(lock);
          if (finalization === "complete") await lock.query("UPDATE encounters SET status='COMPLETED', \"completedAt\"=clock_timestamp() WHERE id=$1", [encounter.id]);
          else await lock.query("UPDATE encounters SET status='CANCELLED', \"cancelledAt\"=clock_timestamp(), \"cancellationReason\"='Synthetic cancellation' WHERE id=$1", [encounter.id]);
          await lock.query("COMMIT"); committed = true;
          const outcome = await pending;
          assert.ok(outcome.error instanceof Error, "A clinical write must not succeed after finalization");
          assert.match(outcome.error.name, /EncounterNotEditable|Finalized/);
          assert.deepEqual(await readRecord(resource, encounter.id), before);
          assert.equal((await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } })).status, finalization === "complete" ? "COMPLETED" : "CANCELLED");
        } finally {
          if (!committed) await lock.query("ROLLBACK");
          await pending; await lock.end();
        }
      });

      test(`${resource}/${operation}: clinical write holds the lock; ${finalization} waits until that write commits`, { timeout: 15_000 }, async () => {
        const { encounter } = await fixture();
        await seedRecord(resource, operation, encounter.id);
        const written = deferred(), release = deferred();
        const write = db.$transaction(async tx => {
          const result = await mutate(resource, operation, encounter.id, tx);
          written.resolve(); await release.promise; return result;
        }, { timeout: 10_000 });
        let finished = false;
        let finalize: Promise<unknown> | undefined;
        const observer = new pg.Client({ connectionString: process.env.DATABASE_URL });
        await observer.connect();
        try {
          await written.promise;
          finalize = (finalization === "complete" ? encounters.completeEncounter(encounter.id) : encounters.cancelEncounter({ encounterId: encounter.id, reason: "Synthetic cancellation" })).then(value => { finished = true; return value; });
          await waitForLock(observer);
          assert.equal(finished, false);
          release.resolve(); await write; await finalize;
          assert.ok(await readRecord(resource, encounter.id));
          assert.equal((await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } })).status, finalization === "complete" ? "COMPLETED" : "CANCELLED");
        } finally {
          release.resolve(); await write; await finalize; await observer.end();
        }
      });
    }
  }
}

test("invalid clinical input rolls back the lock touch and all mutations", async () => {
  const { encounter } = await fixture();
  await assert.rejects(vitals.createVitalSigns({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, systolicBp: -1, diastolicBp: 80, heartRate: 80, respiratoryRate: 16 }));
  assert.equal(await db.vitalSigns.count({ where: { encounterId: encounter.id } }), 0);
  assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
  await assert.rejects(obstetrics.createObstetricData({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, weightKg: -1 }));
  assert.equal(await db.obstetricData.count({ where: { encounterId: encounter.id } }), 0);
  assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
});

async function competingEncounterMutations(encounterId: string, actions: Array<() => Promise<unknown>>) {
  const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lock.connect(); let committed = false;
  let pending: Promise<Array<PromiseSettledResult<unknown>>> | undefined;
  try {
    await lock.query("BEGIN");
    await lock.query("SELECT id FROM encounters WHERE id=$1 FOR UPDATE", [encounterId]);
    pending = Promise.allSettled(actions.map(action => action()));
    for (let i = 0; i < 250; i++) {
      await lock.query("SELECT pg_stat_clear_snapshot()");
      const { rows } = await lock.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");
      if (Number(rows[0].count) >= actions.length) break;
      if (i === 249) assert.fail("Both mutations must reach the PostgreSQL lock barrier");
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await lock.query("COMMIT"); committed = true;
    return await pending;
  } finally {
    if (!committed) await lock.query("ROLLBACK");
    await pending; await lock.end();
  }
}

test("two competing starts have exactly one winner and preserve a single start timestamp", async () => {
  const { encounter } = await fixture();
  await db.encounter.update({ where: { id: encounter.id }, data: { status: "DRAFT", startedAt: null } });
  const results = await competingEncounterMutations(encounter.id, [
    () => encounters.startEncounter(encounter.id), () => encounters.startEncounter(encounter.id),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.equal(rejected.reason.name, "InvalidEncounterTransitionError");
  const row = await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } });
  assert.equal(row.status, "IN_PROGRESS"); assert.ok(row.startedAt);
});

test("competing complete/cancel has exactly one domain-level winner and no contradictory activity event", async () => {
  const { encounter } = await fixture();
  const actor = await db.user.create({ data: { email: `${randomUUID()}@synthetic.invalid`, displayName: "Synthetic completing actor" } });
  const results = await competingEncounterMutations(encounter.id, [
    () => encounters.completeEncounter(encounter.id, actor.id),
    () => encounters.cancelEncounter({ encounterId: encounter.id, reason: "Synthetic competing cancellation" }),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult;
  assert.match(rejected.reason.name, /InvalidEncounterTransition|EncounterFinalized/);
  const row = await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } });
  const events = await db.productActivityEvent.findMany({ where: { organizationId: row.organizationId, eventKey: "encounter.completed" } });
  assert.equal(events.length, row.status === "COMPLETED" ? 1 : 0);
  if (events[0]) assert.equal(events[0].actorUserId, actor.id);
  assert.ok((row.completedAt === null) !== (row.cancelledAt === null));
});

test("an explicitly supplied root Prisma client is rejected before touching any row", async () => {
  const { encounter } = await fixture();
  await assert.rejects(vitals.createVitalSigns({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 80, respiratoryRate: 16 }, db), /CLINICAL_ROOT_CLIENT_NOT_ALLOWED/);
  await assert.rejects(encounters.completeEncounter(encounter.id, undefined, db), /CLINICAL_ROOT_CLIENT_NOT_ALLOWED/);
  assert.equal(await db.vitalSigns.count({ where: { encounterId: encounter.id } }), 0);
  assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
});

test("a real caller-owned transaction keeps clinical mutations atomic with its rollback", async () => {
  const { encounter } = await fixture();
  await assert.rejects(db.$transaction(async tx => {
    await vitals.createVitalSigns({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 80, respiratoryRate: 16 }, tx);
    await obstetrics.createObstetricData({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, weightKg: 60 }, tx);
    throw new Error("SYNTHETIC_PARENT_ABORT");
  }), /SYNTHETIC_PARENT_ABORT/);
  assert.equal(await db.vitalSigns.count({ where: { encounterId: encounter.id } }), 0);
  assert.equal(await db.obstetricData.count({ where: { encounterId: encounter.id } }), 0);
  assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
});


test("another root Prisma client cannot substitute for an interactive transaction", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const other = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const { encounter } = await fixture();
    await assert.rejects(vitals.createVitalSigns({ actorContext: actors.get(encounter.id)!, encounterId: encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 80, respiratoryRate: 16 }, other), /CLINICAL_ROOT_CLIENT_NOT_ALLOWED/);
    assert.equal(await db.vitalSigns.count({ where: { encounterId: encounter.id } }), 0);
    assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
  } finally { await other.$disconnect(); }
});


test("a missing measurement author rejects the entire mutation without creating provenance", async () => {
  const { encounter } = await fixture();
  const input = { encounterId: encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 80, respiratoryRate: 16 };
  await assert.rejects(vitals.createVitalSigns(input as Parameters<typeof vitals.createVitalSigns>[0]), AccessDeniedError);
  assert.equal(await db.vitalSigns.count({ where: { encounterId: encounter.id } }), 0);
  assert.equal(await db.clinicalProvenanceEvent.count({ where: { encounterId: encounter.id } }), 0);
  assert.deepEqual(await db.encounter.findUniqueOrThrow({ where: { id: encounter.id } }), encounter);
});

test("an author from another unit cannot create a measurement or provenance for the target encounter", async () => {
  const { encounter } = await fixture(), other = await fixture();
  await assert.rejects(obstetrics.createObstetricData({ encounterId: encounter.id, weightKg: 61, actorContext: actors.get(other.encounter.id)! }), AccessDeniedError);
  assert.equal(await db.obstetricData.count({ where: { encounterId: encounter.id } }), 0);
  assert.equal(await db.clinicalProvenanceEvent.count({ where: { encounterId: encounter.id } }), 0);
});

test("successful create and update retain server snapshots and author while administrative audit stays clinical-data free", async () => {
  const { encounter, actor } = await fixture();
  const actorContext = actors.get(encounter.id)!;
  await vitals.createVitalSigns({ encounterId: encounter.id, systolicBp: 120, diastolicBp: 80, heartRate: 80, respiratoryRate: 16, actorContext });
  await vitals.updateVitalSigns(encounter.id, { heartRate: 90, actorContext });
  const events = await db.clinicalProvenanceEvent.findMany({ where: { encounterId: encounter.id } });
  assert.equal(events.length, 2);
  const created = events.find(e => e.kind === "MEASUREMENT_CREATED")!;
  const updated = events.find(e => e.kind === "MEASUREMENT_UPDATED")!;
  assert.equal(created.actorUserId, actor.id); assert.equal(updated.actorUserId, actor.id);
  assert.equal(created.before, null);
  assert.equal((updated.before as Record<string, unknown>).heartRate, 80);
  assert.equal((updated.after as Record<string, unknown>).heartRate, 90);
  const audits = await db.auditEvent.findMany({ where: { resourceId: { in: events.map(e => e.id) } } });
  assert.equal(audits.length, 2);
  assert.ok(audits.every(e => e.before === null && e.after === null && e.patientId === null));
});

test("two concurrent edits serialize their authoritative provenance snapshots", async () => {
  const { encounter } = await fixture(); const actorContext = actors.get(encounter.id)!;
  await obstetrics.createObstetricData({ encounterId: encounter.id, fetalHeartRate: 140, weightKg: 60, actorContext });
  await Promise.all([
    obstetrics.updateObstetricData(encounter.id, { fetalHeartRate: 141, actorContext }),
    obstetrics.updateObstetricData(encounter.id, { weightKg: 61, actorContext }),
  ]);
  const row = await db.obstetricData.findUniqueOrThrow({ where: { encounterId: encounter.id } });
  assert.equal(row.fetalHeartRate, 141); assert.equal(Number(row.weightKg), 61);
  const edits = await db.clinicalProvenanceEvent.findMany({ where: { encounterId: encounter.id, kind: "MEASUREMENT_UPDATED" } });
  assert.equal(edits.length, 2);
  const normalize = (value: unknown) => JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b))));
  assert.ok(normalize(edits[0].after) === normalize(edits[1].before) || normalize(edits[1].after) === normalize(edits[0].before));
});
