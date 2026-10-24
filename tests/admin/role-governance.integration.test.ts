import { verifiedSessionToken } from "../helpers/verified-admin-session"
import assert from "node:assert/strict"
import { after, before, beforeEach, test } from "node:test"

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import { db } from "../../src/server/db/client"
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service"
import { assignSystemRole } from "../../src/server/iam/role-assignment.service"
import { SYSTEM_ROLE_KEYS } from "../../src/server/iam/system-role-catalog"
import { PERMISSIONS } from "../../src/server/iam/permissions"
import { requirePermission } from "../../src/server/iam/authorization.service"
import {
  createAdminRoleAssignment as createRoleService,
  revokeAdminRoleAssignment as revokeRoleService,
} from "../../src/server/admin/admin-roles.service"

async function createAdminRoleAssignment(input: Parameters<typeof createRoleService>[0]) {
  return createRoleService({ ...input, actorSessionToken: await verifiedSessionToken(input.actorUserId) });
}
async function revokeAdminRoleAssignment(input: Parameters<typeof revokeRoleService>[0]) {
  return revokeRoleService({ ...input, actorSessionToken: await verifiedSessionToken(input.actorUserId) });
}

const TEST_DATABASE = "pap_saude_f04_role_governance_test"

async function cleanup() {
  await db.auditEvent.deleteMany()
  await db.roleAssignment.deleteMany()
  await db.membership.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()
  await db.organization.deleteMany({
    where: { type: OrganizationType.HEALTH_UNIT },
  })
  await db.organization.deleteMany({
    where: { type: OrganizationType.MUNICIPALITY },
  })
  await db.organization.deleteMany({
    where: { type: OrganizationType.PAP },
  })
  await db.user.deleteMany()
}

async function user(email: string) {
  return db.user.create({
    data: { email, displayName: email, isActive: true },
  })
}

async function papAdmin(email: string) {
  const actor = await user(email)
  await assignSystemRole({
    userId: actor.id,
    roleKey: SYSTEM_ROLE_KEYS.PAP_ADMIN,
  })
  return actor
}

async function unit() {
  const pap = await db.organization.create({
    data: {
      type: OrganizationType.PAP,
      status: OrganizationStatus.ACTIVE,
      isActive: true,
      name: "PAP",
      code: "PAP-G",
    },
  })
  const municipality = await db.organization.create({
    data: {
      type: OrganizationType.MUNICIPALITY,
      status: OrganizationStatus.ACTIVE,
      isActive: true,
      name: "Municipality",
      code: "M-G",
      parentId: pap.id,
    },
  })
  return db.organization.create({
    data: {
      type: OrganizationType.HEALTH_UNIT,
      status: OrganizationStatus.ACTIVE,
      isActive: true,
      name: "Health Unit",
      code: "HU-G",
      parentId: municipality.id,
    },
  })
}

async function activeMember(userId: string, organizationId: string) {
  return db.membership.create({
    data: { userId, organizationId, status: MembershipStatus.ACTIVE },
  })
}

before(async () => {
  const database = await db.$queryRaw<Array<{ database: string }>>`
    SELECT current_database() AS database
  `
  assert.equal(database[0]?.database, TEST_DATABASE)
  await cleanup()
})

beforeEach(async () => {
  await cleanup()
  await bootstrapSystemIam()
})

after(async () => {
  await cleanup()
})

test("role assignment and revoke produce transactional audit records", async () => {
  const actor = await papAdmin("actor-a@example.test")
  const target = await user("target-a@example.test")
  const org = await unit()
  await activeMember(target.id, org.id)

  const input = {
    actorUserId: actor.id,
    targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL,
    organizationId: org.id,
  }
  const assignment = await createAdminRoleAssignment(input)
  const repeated = await createAdminRoleAssignment(input)
  assert.equal(repeated.id, assignment.id)

  const created = await db.auditEvent.findMany({
    where: { action: "ROLE_ASSIGNED" },
  })
  assert.equal(created.length, 1)
  assert.equal(created[0]?.actorUserId, actor.id)
  assert.equal(created[0]?.organizationId, org.id)
  assert.equal(created[0]?.resourceId, assignment.id)
  assert.equal(created[0]?.resourceType, "ROLE_ASSIGNMENT")

  await revokeAdminRoleAssignment({
    actorUserId: actor.id,
    assignmentId: assignment.id,
  })
  assert.equal(
    await db.roleAssignment.count({ where: { id: assignment.id } }),
    0,
  )
  const revoked = await db.auditEvent.findMany({
    where: { action: "ROLE_REVOKED" },
  })
  assert.equal(revoked.length, 1)
  assert.equal(revoked[0]?.actorUserId, actor.id)
  assert.equal(revoked[0]?.organizationId, org.id)
  assert.equal(revoked[0]?.resourceId, assignment.id)
  await assert.rejects(
    revokeAdminRoleAssignment({
      actorUserId: actor.id, assignmentId: assignment.id,
    }),
  )
  assert.equal(await db.auditEvent.count(), 2)
})

test("denied assignment creates neither role nor audit", async () => {
  const other = await user("no-access@example.test")
  const target = await user("target-b@example.test")
  const org = await unit()
  await activeMember(target.id, org.id)
  await assert.rejects(
    createAdminRoleAssignment({
      actorUserId: other.id,
      targetUserId: target.id,
      roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId: org.id,
    }),
  )
  assert.equal(await db.roleAssignment.count(), 0)
  assert.equal(await db.auditEvent.count(), 0)
})

test("inactive member and inactive target fail closed with no audit", async () => {
  const actor = await papAdmin("actor-c@example.test")
  const target = await user("target-c@example.test")
  const org = await unit()
  const membership = await activeMember(target.id, org.id)
  await db.membership.update({
    where: { id: membership.id },
    data: { status: MembershipStatus.SUSPENDED },
  })
  const input = {
    actorUserId: actor.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: org.id,
  }
  await assert.rejects(createAdminRoleAssignment(input))
  await db.membership.update({
    where: { id: membership.id },
    data: { status: MembershipStatus.ACTIVE },
  })
  await db.user.update({
    where: { id: target.id }, data: { isActive: false },
  })
  await assert.rejects(createAdminRoleAssignment(input))
  assert.equal(await db.auditEvent.count(), 0)
})

test("suspended membership cannot exercise an existing scoped role", async () => {
  const actor = await papAdmin("actor-d@example.test")
  const target = await user("target-d@example.test")
  const org = await unit()
  const membership = await activeMember(target.id, org.id)
  await createAdminRoleAssignment({
    actorUserId: actor.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: org.id,
  })
  await db.membership.update({
    where: { id: membership.id },
    data: { status: MembershipStatus.SUSPENDED },
  })
  await assert.rejects(
    requirePermission({
      userId: target.id, permission: PERMISSIONS.PATIENT_READ,
      organizationId: org.id,
    }),
  )
  // Existing assignment remains persisted. Reactivation semantics require
  // a separate product/security decision before closing lifecycle G.
  assert.equal(
    await db.roleAssignment.count({ where: { userId: target.id } }),
    1,
  )
})

test("last active PAP admin retains role and emits no revocation audit", async () => {
  const actor = await papAdmin("sole-admin@example.test")
  const assignment = await db.roleAssignment.findFirstOrThrow({
    where: { userId: actor.id, role: { key: "PAP_ADMIN" } },
  })
  await assert.rejects(
    revokeAdminRoleAssignment({
      actorUserId: actor.id, assignmentId: assignment.id,
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "LAST_PAP_ADMIN",
  )
  assert.equal(
    await db.roleAssignment.count({ where: { id: assignment.id } }), 1,
  )
  assert.equal(await db.auditEvent.count(), 0)
})

test("two simultaneous self-revocations cannot remove all PAP admins", async () => {
  const adminA = await papAdmin("race-a@example.test")
  const adminB = await papAdmin("race-b@example.test")
  const roles = await db.roleAssignment.findMany({
    where: { role: { key: "PAP_ADMIN" } },
  })
  assert.equal(roles.length, 2)
  const assignmentA = roles.find((entry) => entry.userId === adminA.id)
  const assignmentB = roles.find((entry) => entry.userId === adminB.id)
  assert.ok(assignmentA)
  assert.ok(assignmentB)
  const outcomes = await Promise.allSettled([
    revokeAdminRoleAssignment({
      actorUserId: adminA.id, assignmentId: assignmentA.id,
    }),
    revokeAdminRoleAssignment({
      actorUserId: adminB.id, assignmentId: assignmentB.id,
    }),
  ])
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1)
  assert.equal(
    await db.roleAssignment.count({
      where: { role: { key: "PAP_ADMIN" }, user: { isActive: true } },
    }),
    1,
  )
  assert.equal(
    await db.auditEvent.count({ where: { action: "ROLE_REVOKED" } }),
    1,
  )
})
