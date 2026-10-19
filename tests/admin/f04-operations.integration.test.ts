import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import { MembershipStatus, OrganizationStatus, OrganizationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { SYSTEM_ROLE_KEYS } from "../../src/server/iam/system-role-catalog";
import { createSession } from "../../src/server/auth/session.service";
import { SESSION_COOKIE_NAME } from "../../src/server/security/constants";
import { PRODUCT_ACTIVITY_EVENTS } from "../../src/server/activity/activity-events";
import { GET as metricsGET } from "../../src/app/api/admin/operations/metrics/route";
import { GET as monitoringGET } from "../../src/app/api/admin/operations/monitoring/route";
import { GET as integrationsGET } from "../../src/app/api/admin/operations/integrations/route";

const DATABASE = "pap_saude_f04_operations_test";
const BASE_URL = "http://localhost:3000";
async function clear() {
  await db.interoperabilityTransmission.deleteMany();
  await db.rNDSValidationResult.deleteMany();
  await db.rNDSValidationRun.deleteMany();
  await db.integrationPolicy.deleteMany();
  await db.rNDSIntegration.deleteMany();
  await db.productActivityEvent.deleteMany();
  await db.organizationMetricSnapshot.deleteMany();
  await db.auditEvent.deleteMany();
  await db.session.deleteMany();
  await db.roleAssignment.deleteMany();
  await db.membership.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  for (const type of [OrganizationType.HEALTH_UNIT, OrganizationType.MUNICIPALITY, OrganizationType.PAP])
    await db.organization.deleteMany({ where: { type } });
  await db.user.deleteMany();
}
async function user() {
  const id = randomUUID();
  return db.user.create({ data: { email: `${id}@example.test`, displayName: id, isActive: true } });
}
async function tree() {
  const pap = await db.organization.create({ data: { type: "PAP", name: "PAP", status: "ACTIVE" } });
  const a = await db.organization.create({ data: { type: "MUNICIPALITY", name: "Mun A", parentId: pap.id, status: "ACTIVE" } });
  const b = await db.organization.create({ data: { type: "MUNICIPALITY", name: "Mun B", parentId: pap.id, status: "ACTIVE" } });
  const unitA = await db.organization.create({ data: { type: "HEALTH_UNIT", name: "UBS A", parentId: a.id, status: "ACTIVE" } });
  const unitB = await db.organization.create({ data: { type: "HEALTH_UNIT", name: "UBS B", parentId: b.id, status: "ACTIVE" } });
  return { pap, a, b, unitA, unitB };
}
async function municipal(orgId: string) {
  const actor = await user();
  await db.membership.create({ data: { userId: actor.id, organizationId: orgId, status: MembershipStatus.ACTIVE } });
  await assignSystemRole({ userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN, organizationId: orgId });
  return actor;
}
async function admin() { const actor = await user(); await assignSystemRole({ userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.PAP_ADMIN }); return actor; }
async function request(userId: string | null, path: string) {
  const token = userId ? (await createSession({ userId })).token : null;
  return new NextRequest(`${BASE_URL}${path}`, { headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined });
}

before(async () => {
  const actual = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(actual[0]?.name, DATABASE);
  process.env.AUTH_ALLOWED_ORIGINS = BASE_URL;
  await clear();
});
beforeEach(async () => { await clear(); await bootstrapSystemIam(); });
after(async () => { await clear(); await db.$disconnect(); });

test("F04.7/8/9: unauthenticated endpoints deny access", async () => {
  for (const [endpoint, handler] of [
    ["monitoring", monitoringGET], ["metrics", metricsGET], ["integrations", integrationsGET],
  ] as const) {
    const response = await handler(await request(null, `/api/admin/operations/${endpoint}`));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("F04.7/8/9: clinical professional has no administrative reporting access", async () => {
  const { unitA } = await tree();
  const actor = await user();
  await db.membership.create({ data: { userId: actor.id, organizationId: unitA.id, status: "ACTIVE" } });
  await assignSystemRole({ userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: unitA.id });
  for (const [endpoint, handler] of [
    ["monitoring", monitoringGET], ["metrics", metricsGET], ["integrations", integrationsGET],
  ] as const) {
    const response = await handler(await request(actor.id, `/api/admin/operations/${endpoint}`));
    assert.equal(response.status, 403);
  }
});

test("F04.8: municipal aggregates include own UBS only and suppress small user cohorts", async () => {
  const { a, b, unitA, unitB } = await tree();
  const actor = await municipal(a.id);
  const at = new Date();
  await db.productActivityEvent.createMany({ data: [
    { organizationId: unitA.id, eventKey: PRODUCT_ACTIVITY_EVENTS.ENCOUNTER_STARTED, occurredAt: at, actorUserId: actor.id },
    { organizationId: unitA.id, eventKey: PRODUCT_ACTIVITY_EVENTS.DASHBOARD_VIEWED, occurredAt: at, actorUserId: actor.id },
    { organizationId: unitB.id, eventKey: PRODUCT_ACTIVITY_EVENTS.ENCOUNTER_COMPLETED, occurredAt: at },
  ] });
  const result = await metricsGET(await request(actor.id, "/api/admin/operations/metrics"));
  assert.equal(result.status, 200);
  const payload = await result.json();
  assert.equal(payload.rows.find((o: { id: string }) => o.id === a.id).eventCount, 2);
  assert.equal(payload.rows.find((o: { id: string }) => o.id === a.id).activeUsers, null);
  assert.equal(payload.rows.some((o: { id: string }) => o.id === b.id || o.id === unitB.id), false);
  assert.equal(JSON.stringify(payload).includes("ENCOUNTER_COMPLETED"), false);
  const foreign = await metricsGET(await request(actor.id, `/api/admin/operations/metrics?organizationId=${unitB.id}`));
  assert.equal(foreign.status, 403);
});

test("F04.7: monitoring cannot count a foreign municipality's RNDS backlog", async () => {
  const { a, unitB } = await tree();
  const actor = await municipal(a.id);
  const integration = await db.rNDSIntegration.create({ data: {
    healthUnitId: unitB.id, status: "ACTIVE", environment: "PRODUCTION",
    configuration: { token: "SECRET-EXTERNAL-CREDENTIAL" },
  } });
  await db.interoperabilityTransmission.create({ data: {
    rndsIntegrationId: integration.id, resourceType: "TEST", resourceId: randomUUID(), correlationId: randomUUID(),
    status: "QUEUED", requestedAt: new Date(Date.now() - 2 * 60 * 60_000),
  } });
  const response = await monitoringGET(await request(actor.id, "/api/admin/operations/monitoring"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.database, "REACHABLE");
  assert.equal(body.overdueTransmissionQueue, 0);
  assert.deepEqual(body.integrations, {});
  assert.equal(body.workerHeartbeat, "NOT_INSTRUMENTED");
  assert.equal(JSON.stringify(body).includes("SECRET-EXTERNAL-CREDENTIAL"), false);
});

test("F04.9: integration inventory hides config and is scoped and paged by UBS", async () => {
  const { a, unitA, unitB } = await tree();
  const actor = await municipal(a.id);
  await db.rNDSIntegration.create({ data: {
    healthUnitId: unitA.id, status: "VALIDATING", environment: "HOMOLOGATION",
    configuration: { token: "SECRET-EXTERNAL-CREDENTIAL" },
  } });
  const response = await integrationsGET(await request(actor.id, "/api/admin/operations/integrations"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 1);
  assert.equal(body.units[0].id, unitA.id);
  assert.equal(body.units[0].status, "VALIDATING");
  assert.equal(body.n8n.status, "NOT_DISCLOSED");
  assert.equal(body.readOnly, true);
  assert.equal(JSON.stringify(body).includes("SECRET-EXTERNAL-CREDENTIAL"), false);
  assert.equal((await integrationsGET(await request(actor.id, `/api/admin/operations/integrations?organizationId=${unitB.id}`))).status, 403);
  const unitOnly = await integrationsGET(await request(actor.id, `/api/admin/operations/integrations?organizationId=${unitA.id}`));
  assert.equal(unitOnly.status, 200);
  assert.equal((await unitOnly.json()).total, 1);
});

test("F04.7/8/9: malformed duplicate oversized or unknown filters are rejected", async () => {
  const actor = await admin();
  for (const [endpoint, handler] of [
    ["monitoring", monitoringGET], ["metrics", metricsGET], ["integrations", integrationsGET],
  ] as const) {
    for (const suffix of ["?page=0", "?page=1&page=2", "?organizationId=123", "?unexpected=true", `?page=${"9".repeat(501)}`]) {
      assert.equal((await handler(await request(actor.id, `/api/admin/operations/${endpoint}${suffix}`))).status, 400);
    }
  }
  assert.equal((await metricsGET(await request(actor.id, "/api/admin/operations/metrics?from=2026-02-30"))).status, 400);
  assert.equal((await metricsGET(await request(actor.id, "/api/admin/operations/metrics?from=2020-01-01"))).status, 400);
});

test("F04.8/9: global PAP admin observes org hierarchy without clinical records", async () => {
  const { pap, unitA, unitB } = await tree();
  const actor = await admin();
  await db.productActivityEvent.create({ data: {
    organizationId: unitB.id, eventKey: PRODUCT_ACTIVITY_EVENTS.DASHBOARD_VIEWED,
  } });
  const metrics = await metricsGET(await request(actor.id, `/api/admin/operations/metrics?organizationId=${pap.id}`));
  assert.equal(metrics.status, 200);
  const payload = await metrics.json();
  assert.equal(payload.rows.length, 1);
  assert.equal(payload.rows[0].eventCount, 1);
  const integrations = await integrationsGET(await request(actor.id, "/api/admin/operations/integrations"));
  assert.equal(integrations.status, 200);
  const inventory = await integrations.json();
  assert.equal(inventory.total, 2);
  assert.deepEqual(new Set(inventory.units.map((u: {id:string}) => u.id)), new Set([unitA.id, unitB.id]));
});


test("F04.9: inventory pagination returns only 25 units at a time", async () => {
  const { pap, a } = await tree();
  const actor = await admin();
  await db.organization.createMany({ data: Array.from({ length: 28 }, (_, i) => ({
    id: randomUUID(), name: `UBS extra ${i.toString().padStart(2, "0")}`,
    type: OrganizationType.HEALTH_UNIT, parentId: a.id, status: OrganizationStatus.ACTIVE,
  })) });
  const first = await integrationsGET(await request(actor.id, `/api/admin/operations/integrations?organizationId=${pap.id}&page=1`));
  const second = await integrationsGET(await request(actor.id, `/api/admin/operations/integrations?organizationId=${pap.id}&page=2`));
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const aPage = await first.json();
  const bPage = await second.json();
  assert.equal(aPage.total, 30);
  assert.equal(aPage.units.length, 25);
  assert.equal(bPage.units.length, 5);
  assert.equal(new Set([...aPage.units, ...bPage.units].map((u: { id: string }) => u.id)).size, 30);
});
