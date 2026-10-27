import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { globalGovernanceSummary } from "../../src/server/admin-beta/governance-metrics.service";
import { GET as metrics } from "../../src/app/api/admin/beta/metrics/route";
import { actor, request } from "../mission04-b/fixtures";
import { fixture } from "../first-access/fixtures";
import { verifiedSessionToken } from "../helpers/verified-admin-session";
import { PERMISSIONS } from "../../src/server/iam/permissions";
let admin: Awaited<ReturnType<typeof actor>>;
const end = new Date(); end.setUTCHours(0, 0, 0, 0); end.setUTCDate(end.getUTCDate()+1);
const start = new Date(end.getTime()-7*86_400_000);
const query = `from=${start.toISOString().slice(0,10)}&to=${end.toISOString().slice(0,10)}`;
before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/pap_saude_release_governance_test");
  const [actual] = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(actual.name, "pap_saude_release_governance_test");
  mock.method(globalThis, "fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_TEST"); });
  await bootstrapSystemIam(); admin = await actor();
});
after(async () => { mock.restoreAll(); await db.$disconnect(); });
const summary = (who = admin, organizationId?: string) => globalGovernanceSummary(who.user.id, who.token, start, end, organizationId);
const address = () => `${randomUUID()}@synthetic.invalid`;
async function recipient() { return db.user.create({ data: { email: address(), displayName: "Pessoa sintética" } }); }
async function pendingInvitation(createdAt: Date, accepted = false) {
  const user = accepted ? await recipient() : null;
  return db.accessInvitation.create({ data: {
    email: user?.email ?? address(), displayName: "Convite sintético", proposedRoleKey: "COMMERCIAL",
    status: accepted ? "PENDING_ASSIGNMENT" : "PENDING_ACCEPTANCE",
    tokenHash: accepted ? null : createHash("sha256").update(randomUUID()).digest("hex"),
    createdAt, expiresAt: new Date(createdAt.getTime()+86_400_000),
    acceptedAt: accepted ? createdAt : null, userId: user?.id ?? null, invitedByUserId: admin.user.id,
  } });
}

test("global governance returns explicit NO_DATA zero, source, UTC window and no invented denominators", async () => {
  const result = await summary(); assert.ok(result);
  assert.equal(result.scope, "PAP_GLOBAL"); assert.equal(result.timezone, "UTC");
  assert.equal(result.periodStart, start.toISOString()); assert.equal(result.periodEnd, end.toISOString());
  for (const metric of [result.invitationsCreated, result.pendingAssignments, result.commercialUsers, result.unitsAwaitingActivation]) {
    assert.equal(metric.value, 0); assert.equal(metric.status, "NO_DATA");
    assert.equal(metric.denominator, null); assert.ok(metric.source && metric.definition);
  }
  assert.equal(result.invitationsCreated.window, "SELECTED_PERIOD");
  assert.equal(result.pendingAssignments.window, "CURRENT_SNAPSHOT");
});
test("summary requires exact live MFA session even when caller supplies an Admin userId", async () => {
  await assert.rejects(globalGovernanceSummary(admin.user.id, undefined, start, end));
  await assert.rejects(globalGovernanceSummary(admin.user.id, admin.session.token, start, end));
  const other = await actor(); await assert.rejects(globalGovernanceSummary(admin.user.id, other.token, start, end));
  await db.session.update({ where: { id: other.verified.session.id }, data: { revokedAt: new Date(), revocationReason: "ADMIN_REVOKED" } });
  await assert.rejects(summary(other));
});
test("global counts are absent for Manager, Commercial, municipal admin, UBS admin and professional", async () => {
  for (const role of ["PAP_MANAGER", "COMMERCIAL"] as const) assert.equal(await summary(await actor(role)), null);
  for (const role of ["HEALTH_UNIT_ADMIN", "PROFESSIONAL"] as const) {
    const f = await fixture(role); const token = await verifiedSessionToken(f.user.id);
    assert.equal(await globalGovernanceSummary(f.user.id, token, start, end), null);
  }
  const municipal = await fixture("HEALTH_UNIT_ADMIN");
  await db.roleAssignment.deleteMany({ where: { userId: municipal.user.id } });
  await db.membership.create({ data: { userId: municipal.user.id, organizationId: municipal.unit.parentId!, status: "ACTIVE" } });
  await assignSystemRole({ userId: municipal.user.id, roleKey: "MUNICIPAL_ADMIN", organizationId: municipal.unit.parentId! });
  assert.equal(await globalGovernanceSummary(municipal.user.id, await verifiedSessionToken(municipal.user.id), start, end), null);
});
test("an organizational filter never leaks a global governance count, including a real UBS filter", async () => {
  assert.equal(await summary(admin, admin.unit.id), null);
  const response = await metrics(request(`/api/admin/beta/metrics?${query}&organizationId=${admin.unit.id}`, admin.token));
  assert.equal(response.status, 200); assert.equal((await response.json()).governanceSummary, null);
});
test("created invitations use exact UTC half-open boundaries while pending decisions are current-state counts", async () => {
  const before = (await summary())!;
  await pendingInvitation(new Date(start.getTime()-1));
  await pendingInvitation(start);
  await pendingInvitation(new Date(end.getTime()-1));
  await pendingInvitation(end);
  const pending = await pendingInvitation(new Date(start.getTime()-10*86_400_000), true);
  assert.ok(pending.expiresAt < start, "old acceptance link expired; assignment is still pending legitimately");
  const result = (await summary())!;
  assert.equal(result.invitationsCreated.value-before.invitationsCreated.value, 2);
  assert.equal(result.pendingAssignments.value-before.pendingAssignments.value, 1);
  assert.equal(result.pendingAssignments.status, "AVAILABLE");
});
test("Commercial metric counts distinct active identities with canonical global grants and persisted read permission", async () => {
  const before = (await summary())!; const active = await recipient();
  const inactive = await db.user.create({ data: { email: address(), displayName: "Pessoa inativa sintética", isActive: false } });
  await assignSystemRole({ userId: active.id, roleKey: "COMMERCIAL" });
  await assignSystemRole({ userId: active.id, roleKey: "PAP_MANAGER" });
  await assignSystemRole({ userId: inactive.id, roleKey: "COMMERCIAL" });
  const role = await db.role.findUniqueOrThrow({ where: { key: "COMMERCIAL" } });
  await assert.rejects(db.roleAssignment.create({ data: { userId: active.id, roleId: role.id, organizationId: null } }));
  assert.equal((await summary())!.commercialUsers.value-before.commercialUsers.value, 1);
  const read = await db.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.COMMERCIAL_READ } });
  await db.rolePermission.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: read.id } } });
  try { assert.equal((await summary())!.commercialUsers.value, 0); }
  finally { await db.rolePermission.create({ data: { roleId: role.id, permissionId: read.id } }); }
});
test("awaiting activation counts only consented READY_FOR_ACTIVATION UBS that remain pending and inactive", async () => {
  const before = (await summary())!;
  for (const entry of [
    { status: "PENDING_VERIFICATION", candidate: "READY_FOR_ACTIVATION", active: false, consent: true },
    { status: "ACTIVE", candidate: "APPROVED", active: true, consent: true },
    { status: "PENDING_VERIFICATION", candidate: "NEW", active: false, consent: true },
    { status: "PENDING_VERIFICATION", candidate: "READY_FOR_ACTIVATION", active: false, consent: false },
    { status: "ARCHIVED", candidate: "READY_FOR_ACTIVATION", active: false, consent: true },
  ] as const) {
    const unit = await db.organization.create({ data: { name: `UBS sintética ${randomUUID()}`, type: "HEALTH_UNIT", parentId: admin.unit.parentId, status: entry.status, isActive: entry.active } });
    await db.organizationCandidate.create({ data: { type: "HEALTH_UNIT", name: unit.name, normalizedName: unit.name.toLowerCase(), dedupeKey: randomUUID(), status: entry.candidate, convertedOrganizationId: unit.id, consentedAt: entry.consent ? new Date() : null } });
  }
  const wrongType = await db.organization.create({ data: { name: "Unidade de proveniência legada inconsistente", type: "HEALTH_UNIT", parentId: admin.unit.parentId, status: "PENDING_VERIFICATION", isActive: false } });
  await db.organizationCandidate.create({ data: { type: "MUNICIPALITY", name: wrongType.name, normalizedName: wrongType.name.toLowerCase(), dedupeKey: randomUUID(), status: "READY_FOR_ACTIVATION", convertedOrganizationId: wrongType.id, consentedAt: new Date() } });
  assert.equal((await summary())!.unitsAwaitingActivation.value-before.unitsAwaitingActivation.value, 1);
});
test("HTTP response exposes only authorized aggregate fields, never recipient identities, tokens or notification data", async () => {
  const response = await metrics(request(`/api/admin/beta/metrics?${query}`, admin.token));
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const payload = await response.json(); const result = payload.governanceSummary;
  assert.ok(result && result.scope === "PAP_GLOBAL");
  assert.deepEqual(Object.keys(result).sort(), ["scope","timezone","periodStart","periodEnd","generatedAt","invitationsCreated","pendingAssignments","commercialUsers","unitsAwaitingActivation"].sort());
  assert.ok(!JSON.stringify(result).includes("@") && !JSON.stringify(result).includes(admin.user.id));
  for (const role of ["PAP_MANAGER", "COMMERCIAL"] as const) {
    const f = await actor(role); const denied = await metrics(request(`/api/admin/beta/metrics?${query}`, f.token));
    assert.equal(denied.status, 403); assert.ok(!(await denied.text()).includes("governanceSummary"));
  }
});
test("removing a persisted Admin read permission hides all governance counters despite catalog membership", async () => {
  const role = await db.role.findUniqueOrThrow({ where: { key: "PAP_ADMIN" } });
  const permission = await db.permission.findUniqueOrThrow({ where: { key: PERMISSIONS.ROLE_READ } });
  await db.rolePermission.delete({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } } });
  try { assert.equal(await summary(), null); }
  finally { await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } }); }
});
test("invalid intervals fail closed without synthesizing metrics", async () => {
  for (const [from, to] of [[end,start],[start,start],[new Date(NaN),end],[new Date(end.getTime()-91*86_400_000),end]]) {
    await assert.rejects(globalGovernanceSummary(admin.user.id, admin.token, from, to));
  }
});
test("RepeatableRead snapshot keeps governance counts coherent under a concurrent committed invitation", async () => {
  const previous = (await summary())!; const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lock.connect(); let pending: ReturnType<typeof summary> | undefined; let committed = false;
  try {
    await lock.query("BEGIN"); await lock.query("LOCK TABLE role_assignments IN ACCESS EXCLUSIVE MODE");
    pending = summary(); let waiting = false;
    for (let i=0;i<300;i++) {
      await lock.query("SELECT pg_stat_clear_snapshot()");
      waiting = Number((await lock.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%role_assignments%'")).rows[0].count) > 0;
      if (waiting) break; await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(waiting, "authenticated snapshot is waiting for role projection");
    await lock.query('INSERT INTO access_invitations (id,email,"displayName","proposedRoleKey",status,"activeSlot","tokenHash","expiresAt","invitedByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,\'EXPIRED\',NULL,NULL,NOW(),$5,NOW(),NOW())', [randomUUID(),address(),"Convite concorrente sintético","COMMERCIAL",admin.user.id]);
    await lock.query("COMMIT"); committed = true;
    const snapshot = (await pending)!;
    assert.equal(snapshot.invitationsCreated.value, previous.invitationsCreated.value);
    assert.equal((await summary())!.invitationsCreated.value, previous.invitationsCreated.value+1);
  } finally { if (!committed) await lock.query("ROLLBACK"); await pending; await lock.end(); }
});

import { spawnSync } from "node:child_process";
test("governance summary works with database ACLs that deny all clinical tables and credential/recovery reads", async () => {
  const sql = new pg.Client({ connectionString: process.env.DATABASE_URL }); await sql.connect();
  let created = false;
  try {
    await sql.query("CREATE ROLE pap_p0_governance_reader NOLOGIN"); created = true;
    await sql.query("GRANT USAGE ON SCHEMA public TO pap_p0_governance_reader");
    await sql.query("GRANT SELECT ON users, sessions, memberships, organizations, role_assignments, roles, permissions, role_permissions, access_invitations, organization_candidates TO pap_p0_governance_reader");
    await sql.query('GRANT SELECT (id, "userId", type, status, "enabledAt") ON mfa_factors TO pap_p0_governance_reader');
    const connection = new URL(process.env.DATABASE_URL!);
    connection.searchParams.set("options", "-c role=pap_p0_governance_reader");
    const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "tests/release/governance-readonly-child.ts"], {
      encoding: "utf8", timeout: 30_000, env: { ...process.env, DATABASE_URL: connection.toString(),
        PAP_TEST_ACTOR_ID: admin.user.id, PAP_TEST_SESSION_TOKEN: admin.token,
        PAP_TEST_PERIOD_START: start.toISOString(), PAP_TEST_PERIOD_END: end.toISOString() },
    });
    const diagnostic = result.stderr.match(/READONLY_GOVERNANCE_FAILED\|[A-Z0-9_]+\|[A-Z0-9_]+\|[a-z_A-Z]+/)?.[0] ?? "child startup failed";
    assert.equal(result.status, 0, `restricted-role child: ${diagnostic}`);
    assert.equal(result.stdout.trim(), "READONLY_GOVERNANCE_PASS");
  } finally {
    if (created) { await sql.query("DROP OWNED BY pap_p0_governance_reader"); await sql.query("DROP ROLE pap_p0_governance_reader"); }
    await sql.end();
  }
});
