import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { actor, request } from "../mission04-b/fixtures";
import { createProfessionalInvitation } from "../../src/server/invitations/invitation.service";
import { mutateBetaInvitation } from "../../src/server/admin-beta/invitations.service";
import { POST as legacyInvite } from "../../src/app/api/admin/invitations/route";
import { POST as betaInvite } from "../../src/app/api/admin/beta/invitations/route";

const database = "pap_saude_release_admin_test";
let admin: Awaited<ReturnType<typeof actor>>;
before(async () => {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, `/${database}`);
  const [actual] = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(actual.name, database);
  mock.method(globalThis, "fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_TEST"); });
  await bootstrapSystemIam();
  admin = await actor();
});
after(async () => { mock.restoreAll(); await db.$disconnect(); });
const address = () => `${randomUUID()}@synthetic.invalid`;
type Actor = Awaited<ReturnType<typeof actor>>;
async function invitation(f: Actor, email = address()) {
  return createProfessionalInvitation({ invitedByUserId: f.user.id,
    actorSessionToken: f.token, organizationId: f.unit.id,
    email, displayName: "Pessoa sintética de auditoria" });
}
async function revoke(f: Actor, kind: "session" | "factor" | "role") {
  if (kind === "session") await db.session.updateMany({
    where: { userId: f.user.id }, data: { revokedAt: new Date(), revocationReason: "ADMIN_REVOKED" },
  });
  if (kind === "factor") await db.mfaFactor.updateMany({
    where: { userId: f.user.id, status: "ACTIVE" }, data: { status: "REVOKED", revokedAt: new Date() },
  });
  if (kind === "role") await db.roleAssignment.deleteMany({ where: { userId: f.user.id } });
}
async function counts() {
  return {
    identities: await db.user.count(), invitations: await db.userInvitation.count(),
    roles: await db.roleAssignment.count(), notifications: await db.userNotification.count(),
    created: await db.auditEvent.count({ where: { action: "INVITATION_CREATED" } }),
    revoked: await db.auditEvent.count({ where: { action: "INVITATION_REVOKED" } }),
    mail: await db.transactionalEmail.count(),
  };
}
// Barrier is a real locked rate-limit bucket: the request has passed HTTP MFA,
// but cannot enter the institutional service until the revocation commits.
async function afterHttpGuard(f: Actor, pendingRequest: () => Promise<Response>, change: () => Promise<void>) {
  const key = createHash("sha256").update(`beta:v1:invites:${Math.floor(Date.now()/3_600_000)}:${f.user.id}`).digest("hex");
  await db.betaAbuseBucket.upsert({ where: { key }, create: { key, count: 0, expiresAt: new Date(Date.now()+3_600_000) }, update: {} });
  const lock = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await lock.connect(); let response: Promise<Response> | undefined; let committed = false;
  try {
    await lock.query("BEGIN");
    await lock.query("SELECT key FROM beta_abuse_buckets WHERE key=$1 FOR UPDATE", [key]);
    response = pendingRequest(); let waiting = false;
    for (let i = 0; i < 200; i++) {
      await lock.query("SELECT pg_stat_clear_snapshot()");
      waiting = Number((await lock.query("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%beta_abuse_buckets%'")).rows[0].count) > 0;
      if (waiting) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(waiting, "HTTP authorization passed before the rate-limit barrier");
    await change(); await lock.query("COMMIT"); committed = true;
    return await response;
  } finally {
    if (!committed) await lock.query("ROLLBACK");
    await response; await lock.end();
  }
}

test("institutional service rejects missing and primary-only MFA sessions without side effects", async () => {
  const f = await actor("PAP_MANAGER"); const email = address(); const beforeCounts = await counts();
  for (const token of [undefined, f.session.token]) {
    await assert.rejects(createProfessionalInvitation({ invitedByUserId: f.user.id,
      actorSessionToken: token, organizationId: f.unit.id, email, displayName: "Pessoa sintética" }));
    await assert.rejects(mutateBetaInvitation(f.user.id, {
      operation: "INVITE", organizationId: f.unit.id, email, displayName: "Pessoa sintética",
    }, token));
  }
  assert.deepEqual(await counts(), beforeCounts);
});

test("verified institutional invitation and revocation remain operational and audited once", async () => {
  const created = await invitation(admin);
  const before = await db.auditEvent.count({ where: { resourceId: created.invitation.id, action: "INVITATION_REVOKED" } });
  const result = await mutateBetaInvitation(admin.user.id, {
    operation: "REVOKE", organizationId: admin.unit.id, id: created.invitation.id,
  }, admin.token);
  assert.deepEqual(result, { revoked: true });
  await mutateBetaInvitation(admin.user.id, {
    operation: "REVOKE", organizationId: admin.unit.id, id: created.invitation.id,
  }, admin.token);
  assert.equal(await db.auditEvent.count({ where: { resourceId: created.invitation.id, action: "INVITATION_REVOKED" } }), before + 1);
});

for (const operation of ["LEGACY_CREATE", "INVITE", "RESEND", "REVOKE"] as const) {
  for (const kind of ["session", "factor", "role"] as const) {
    test(`HTTP ${operation} denies ${kind} revoked after HTTP MFA guard; no grant, notice or success audit`, async () => {
      const f = await actor("PAP_MANAGER");
      const existing = operation === "RESEND" || operation === "REVOKE" ? await invitation(f) : null;
      const email = address(); const beforeCounts = await counts();
      const body = { operation, organizationId: f.unit.id, email,
        displayName: "Pessoa sintética", ...(existing ? { id: existing.invitation.id } : {}) };
      const response = await afterHttpGuard(f, () => operation === "LEGACY_CREATE"
        ? legacyInvite(request("/api/admin/invitations", f.token, body))
        : betaInvite(request("/api/admin/beta/invitations", f.token, body)), () => revoke(f, kind));
      assert.ok([401, 403].includes(response.status), `${operation}/${kind} must fail closed`);
      const afterCounts = await counts();
      assert.deepEqual(afterCounts, { ...beforeCounts,
        roles: kind === "role" ? beforeCounts.roles - 1 : beforeCounts.roles });
      if (existing) assert.equal((await db.userInvitation.findUniqueOrThrow({ where: { id: existing.invitation.id } })).status, "PENDING");
      assert.equal(await db.user.count({ where: { email } }), 0);
    });
  }
}

for (const operation of ["CREATE", "REVOKE"] as const) {
  for (const kind of ["session", "factor", "role"] as const) {
    test(`transaction ${operation} rechecks ${kind} after service preflight`, async () => {
      const f = await actor("PAP_MANAGER");
      const created = operation === "REVOKE" ? await invitation(f) : null;
      const beforeCounts = await counts();
      const original = db.$transaction.bind(db);
      let entered = false;
      // Instrument only the transaction boundary, not authentication/Prisma data.
      // The actual revocation commits before the real transaction callback runs.
      Object.defineProperty(db, "$transaction", { configurable: true, writable: true, value: async (...args: Parameters<typeof original>) => {
        if (!entered && typeof args[0] === "function") { entered = true; await revoke(f, kind); }
        return Reflect.apply(original, db, args);
      } });
      try {
        if (operation === "CREATE") await assert.rejects(invitation(f));
        else await assert.rejects(mutateBetaInvitation(f.user.id, {
          operation: "REVOKE", organizationId: f.unit.id, id: created!.invitation.id,
        }, f.token));
      } finally { Object.defineProperty(db, "$transaction", { configurable: true, writable: true, value: original }); }
      assert.ok(entered, "mutation reached the real transaction boundary");
      assert.deepEqual(await counts(), { ...beforeCounts,
        roles: kind === "role" ? beforeCounts.roles - 1 : beforeCounts.roles });
      if (created) assert.equal((await db.userInvitation.findUniqueOrThrow({ where: { id: created.invitation.id } })).status, "PENDING");
    });
  }
}

async function securityTargetState(userId: string) {
  return {
    factors: await db.mfaFactor.findMany({ where: { userId }, select: { id: true, status: true, revokedAt: true }, orderBy: { id: "asc" } }),
    sessions: await db.session.findMany({ where: { userId }, select: { id: true, revokedAt: true }, orderBy: { id: "asc" } }),
    events: await db.auditEvent.count({ where: { resourceId: userId, action: { in: ["USER_SESSIONS_REVOKED", "MFA_RESET"] } } }),
    sessionEvents: await db.auditEvent.count({ where: { action: "SESSION_REVOKED", resourceId: { in: (await db.session.findMany({ where: { userId }, select: { id: true } })).map(s => s.id) } } }),
  };
}
import { revokeAdminUserSession, revokeAdminUserSessions, resetAdminUserMfa } from "../../src/server/admin/admin-security.service";
import { POST as securityPost } from "../../src/app/api/admin/security/route";
type SecurityAction = "REVOKE_SESSION" | "REVOKE_ALL_SESSIONS" | "RESET_MFA";
const securityActions: readonly SecurityAction[] = ["REVOKE_SESSION", "REVOKE_ALL_SESSIONS", "RESET_MFA"];
function securityCall(action: SecurityAction, actor: Actor, target: Actor, token: string | undefined) {
  const input = { actorUserId: actor.user.id, actorSessionToken: token,
    targetUserId: target.user.id, targetSessionId: target.session.session.id };
  return action === "REVOKE_SESSION" ? revokeAdminUserSession(input)
    : action === "REVOKE_ALL_SESSIONS" ? revokeAdminUserSessions(input) : resetAdminUserMfa(input);
}
for (const action of securityActions) {
  test(`security ${action} rejects missing/primary-only MFA and PAP_MANAGER without modifying target`, async () => {
    const target = await actor("COMMERCIAL"); const manager = await actor("PAP_MANAGER");
    const before = await securityTargetState(target.user.id);
    await assert.rejects(securityCall(action, admin, target, undefined));
    await assert.rejects(securityCall(action, admin, target, admin.session.token));
    await assert.rejects(securityCall(action, manager, target, manager.token));
    assert.deepEqual(await securityTargetState(target.user.id), before);
  });
  for (const kind of ["session", "factor", "role"] as const) {
    test(`security ${action} denies ${kind} revoked at transaction entry after HTTP MFA`, async () => {
      const f = await actor(); const target = await actor("COMMERCIAL");
      const before = await securityTargetState(target.user.id);
      const original = db.$transaction.bind(db); let entered = false;
      Object.defineProperty(db, "$transaction", { configurable: true, writable: true, value: async (...args: Parameters<typeof original>) => {
        if (!entered && typeof args[0] === "function") { entered = true; await revoke(f, kind); }
        return Reflect.apply(original, db, args);
      } });
      let response: Response;
      try {
        response = await securityPost(request("/api/admin/security", f.token, {
          action, targetUserId: target.user.id, sessionId: target.session.session.id,
          reason: "Validação sintética de segurança",
        }));
      } finally { Object.defineProperty(db, "$transaction", { configurable: true, writable: true, value: original }); }
      assert.ok(entered, "request passed HTTP MFA and reached transaction boundary");
      assert.ok([401, 403].includes(response!.status));
      assert.deepEqual(await securityTargetState(target.user.id), before);
    });
  }
  test(`security ${action} accepts legitimate MFA admin and audits verified session provenance`, async () => {
    const target = await actor("COMMERCIAL");
    const response = await securityPost(request("/api/admin/security", admin.token, {
      action, targetUserId: target.user.id, sessionId: target.session.session.id,
      reason: "Validação sintética legítima",
    }));
    assert.equal(response.status, 200);
    const event = await db.auditEvent.findFirstOrThrow({
      where: { actorUserId: admin.user.id,
        action: action === "REVOKE_SESSION" ? "SESSION_REVOKED" : action === "RESET_MFA" ? "MFA_RESET" : "USER_SESSIONS_REVOKED",
        resourceId: action === "REVOKE_SESSION" ? target.session.session.id : target.user.id },
    });
    assert.equal(event.sessionId, admin.verified.session.id);
    assert.ok((await db.session.findUniqueOrThrow({ where: { id: target.session.session.id } })).revokedAt);
    if (action === "RESET_MFA") assert.equal(await db.mfaFactor.count({ where: { userId: target.user.id, status: "ACTIVE" } }), 0);
  });
}

import { listOperationsMetrics } from "../../src/server/admin/operations-metrics.service";
import { PRODUCT_ACTIVITY_EVENTS } from "../../src/server/activity/activity-events";
async function metricActors(unitId: string, eventKey: string) {
  const users = await Promise.all(Array.from({ length: 6 }, () => db.user.create({
    data: { email: address(), displayName: "Pessoa sintética de métrica" },
  })));
  await db.productActivityEvent.createMany({ data: users.flatMap(user => [1, 2].map(() => ({
    organizationId: unitId, actorUserId: user.id, eventKey,
  }))) });
}
async function metricRow(unitId: string) {
  const result = await listOperationsMetrics({ userId: admin.user.id,
    organizationId: unitId, page: 1, start: new Date(Date.now()-86_400_000), end: new Date(Date.now()+60_000) });
  return result.rows.find(row => row.id === unitId)!;
}
test("operations metrics exclude unknown legacy event keys from totals AND active-user cohort", async () => {
  const f = await actor();
  await metricActors(f.unit.id, "unallowlisted.synthetic.event");
  const row = await metricRow(f.unit.id);
  assert.equal(row.eventCount, 0); assert.equal(row.activeUsers, null);
  assert.equal(row.activeUsersSuppressed, true);
});
test("operations metrics count distinct actors across duplicate events and exclude a foreign unit", async () => {
  const f = await actor(); const foreign = await actor();
  await metricActors(f.unit.id, PRODUCT_ACTIVITY_EVENTS.DASHBOARD_VIEWED);
  await metricActors(foreign.unit.id, PRODUCT_ACTIVITY_EVENTS.DASHBOARD_VIEWED);
  const row = await metricRow(f.unit.id);
  assert.equal(row.eventCount, 12); assert.equal(row.dashboardViews, 12);
  assert.equal(row.activeUsers, 6); assert.equal(row.activeUsersSuppressed, false);
});
