import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import { AuditOutcome, MembershipStatus, OrganizationStatus, OrganizationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { SYSTEM_ROLE_KEYS } from "../../src/server/iam/system-role-catalog";
import { createAdminMfaSessionFixture } from "../helpers/admin-mfa-session";
import { SESSION_COOKIE_NAME } from "../../src/server/security/constants";
import { writeAdminAudit } from "../../src/server/audit/admin-audit-writer.service";
import { listAdminAuditEvents } from "../../src/server/audit/admin-audit-query.service";
import { createAdminOrganization, mutateAdminOrganization } from "../../src/server/admin/admin-organizations.service";
import { createProfessionalInvitation } from "../../src/server/invitations/invitation.service";
import { GET as auditGET } from "../../src/app/api/admin/audit/route";

const DATABASE = "pap_saude_f04_audit_idor_test";
const BASE_URL = "http://localhost:3000";
async function clear() {
  await db.auditEvent.deleteMany();
  await db.userInvitation.deleteMany();
  await db.session.deleteMany();
  await db.roleAssignment.deleteMany();
  await db.membership.deleteMany();
  await db.rolePermission.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  for (const type of [OrganizationType.HEALTH_UNIT, OrganizationType.MUNICIPALITY, OrganizationType.PAP]) {
    await db.organization.deleteMany({ where: { type } });
  }
  await db.user.deleteMany();
}
async function user() { const id = randomUUID(); return db.user.create({ data: { email: `${id}@example.test`, displayName: id, isActive: true } }); }
async function admin() { const actor = await user(); await assignSystemRole({ userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.PAP_ADMIN }); return actor; }
async function tree() {
  const pap = await db.organization.create({ data: { type: OrganizationType.PAP, name: "PAP", isActive: true, status: OrganizationStatus.ACTIVE } });
  const a = await db.organization.create({ data: { type: OrganizationType.MUNICIPALITY, name: "Mun A", parentId: pap.id, isActive: true, status: OrganizationStatus.ACTIVE } });
  const b = await db.organization.create({ data: { type: OrganizationType.MUNICIPALITY, name: "Mun B", parentId: pap.id, isActive: true, status: OrganizationStatus.ACTIVE } });
  const unitA = await db.organization.create({ data: { type: OrganizationType.HEALTH_UNIT, name: "UBS A", parentId: a.id, isActive: true, status: OrganizationStatus.ACTIVE } });
  const unitB = await db.organization.create({ data: { type: OrganizationType.HEALTH_UNIT, name: "UBS B", parentId: b.id, isActive: true, status: OrganizationStatus.ACTIVE } });
  return { pap, a, b, unitA, unitB };
}
async function request(userId: string | null, path = "/api/admin/audit") {
  const token = userId ? (await createAdminMfaSessionFixture(userId)).token : null;
  return new NextRequest(`${BASE_URL}${path}`, { headers: token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : undefined });
}
before(async () => {
  const actual = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assert.equal(actual[0]?.name, DATABASE);
  process.env.AUTH_ALLOWED_ORIGINS = BASE_URL;
  process.env.PAP_EMAIL_PROVIDER = "";
  await clear();
});
beforeEach(async () => { await clear(); await bootstrapSystemIam(); });
after(async () => { await clear(); await db.$disconnect(); });

test("A/B: writer allowlists admin snapshots and refuses clinical audit", async () => {
  const actor = await admin();
  await assert.rejects(writeAdminAudit({ action: "CLINICAL_REVISION", resourceType: "PATIENT" }));
  await writeAdminAudit({ actorUserId: actor.id, action: "ORGANIZATION_CREATED", resourceType: "ORGANIZATION", after: { name: "UBS", status: "ACTIVE", token: "SECRET", secretEncrypted: "SECRET" } });
  const event = await db.auditEvent.findFirstOrThrow();
  assert.deepEqual(event.after, { name: "UBS", status: "ACTIVE" });
  assert.equal(JSON.stringify(event).includes("SECRET"), false);
});

test("C: organization create and update write authoritative events", async () => {
  const actor = await admin();
  const { pap } = await tree();
  const org = await createAdminOrganization(actor.id, { type: OrganizationType.MUNICIPALITY, parentId: pap.id, name: "Original" });
  await mutateAdminOrganization(actor.id, org.id, { operation: "UPDATE", name: "Updated" });
  const events = await db.auditEvent.findMany({ where: { resourceId: org.id }, orderBy: { occurredAt: "asc" } });
  assert.equal(events.length, 2);
  assert.equal((events[0].after as Record<string, unknown>).name, "Original");
  assert.equal((events[1].before as Record<string, unknown>).name, "Original");
  assert.equal((events[1].after as Record<string, unknown>).name, "Updated");
});

test("C/H: rejected organization updates never produce success events", async () => {
  const actor = await admin();
  const { unitA } = await tree();
  await assert.rejects(mutateAdminOrganization(actor.id, unitA.id, { operation: "UPDATE", cnes: "123" }));
  assert.equal(await db.auditEvent.count({ where: { resourceId: unitA.id } }), 0);
});

test("D: invitation records no token or email in audit data", async () => {
  const actor = await admin();
  const { unitA } = await tree();
  const result = await createProfessionalInvitation({ invitedByUserId: actor.id, organizationId: unitA.id, email: "professional@example.test", displayName: "Professional" });
  const event = await db.auditEvent.findFirstOrThrow({ where: { resourceId: result.invitation.id, action: "INVITATION_CREATED" } });
  assert.equal(event.organizationId, unitA.id);
  assert.equal(JSON.stringify(event).includes("professional@example.test"), false);
  assert.equal(JSON.stringify(event).includes("tokenHash"), false);
});

test("F/H: unauthenticated and municipality admin cannot query global audit", async () => {
  const { a } = await tree();
  const municipal = await user();
  await db.membership.create({ data: { userId: municipal.id, organizationId: a.id, status: MembershipStatus.ACTIVE } });
  await assignSystemRole({ userId: municipal.id, roleKey: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN, organizationId: a.id });
  assert.equal((await auditGET(await request(null))).status, 401);
  assert.equal((await auditGET(await request(municipal.id))).status, 403);
});

test("F/G: clinical events cannot be listed even by PAP administrator", async () => {
  const actor = await admin();
  await db.auditEvent.create({ data: { action: "CLINICAL_REVISION", resourceType: "PATIENT", before: { diagnosis: "PRIVATE" } } });
  await writeAdminAudit({ actorUserId: actor.id, action: "ROLE_ASSIGNED", resourceType: "ROLE_ASSIGNMENT", after: { roleKey: "PAP_ADMIN" } });
  const result = await listAdminAuditEvents(actor.id);
  assert.equal(result.total, 1);
  assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
});

test("F: pagination, action and outcome filters", async () => {
  const actor = await admin();
  await db.auditEvent.createMany({ data: Array.from({ length: 30 }, (_, i) => ({
    action: "ROLE_ASSIGNED", resourceType: "ROLE_ASSIGNMENT", actorUserId: actor.id,
    outcome: i === 0 ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS,
    occurredAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
  })) });
  const one = await listAdminAuditEvents(actor.id, { page: 1 });
  const two = await listAdminAuditEvents(actor.id, { page: 2 });
  assert.equal(one.total, 30);
  assert.equal(one.events.length, 25);
  assert.equal(two.events.length, 5);
  assert.equal((await listAdminAuditEvents(actor.id, { outcome: "FAILURE" })).total, 1);
});

test("G/H: invalid filters are rejected without leaking events", async () => {
  const actor = await admin();
  for (const path of [
    "/api/admin/audit?page=-1", "/api/admin/audit?page=2&page=3",
    "/api/admin/audit?action=CLINICAL_REVISION", "/api/admin/audit?resourceType=PATIENT",
    "/api/admin/audit?organizationId=abc", "/api/admin/audit?from=invalid",
    "/api/admin/audit?unrecognized=true", `/api/admin/audit?resourceId=${"x".repeat(4500)}`,
  ]) {
    const response = await auditGET(await request(actor.id, path));
    assert.equal(response.status, 400, path);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("G/H: legacy audit JSON is sanitized on read", async () => {
  const actor = await admin();
  await db.auditEvent.create({ data: { action: "ROLE_ASSIGNED", resourceType: "ROLE_ASSIGNMENT", actorUserId: actor.id,
    before: { password: "SECRET", targetUserId: "safe" }, after: { tokenHash: "SECRET", roleKey: "PROFESSIONAL" }, metadata: { key: "SECRET" }, userAgent: "SECRET",
  } });
  const response = await auditGET(await request(actor.id));
  assert.equal(response.status, 200);
  const text = JSON.stringify(await response.json());
  assert.equal(text.includes("SECRET"), false);
  assert.equal(text.includes("PROFESSIONAL"), true);
});

test("H: PAP admin audit permission does not imply clinical access in either UBS", async () => {
  const actor = await admin();
  const { unitA, unitB } = await tree();
  const { requirePermission } = await import("../../src/server/iam/authorization.service");
  const { PERMISSIONS } = await import("../../src/server/iam/permissions");
  for (const organizationId of [unitA.id, unitB.id]) {
    await assert.rejects(requirePermission({ userId: actor.id, permission: PERMISSIONS.PATIENT_READ, organizationId }));
  }
});
