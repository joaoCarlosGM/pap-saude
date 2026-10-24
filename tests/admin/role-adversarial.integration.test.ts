import { verifiedSessionToken } from "../helpers/verified-admin-session"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, test } from "node:test"

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import { db } from "../../src/server/db/client"
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service"
import { authorize } from "../../src/server/iam/authorization.service"
import { getEffectiveAccessProfile } from "../../src/server/iam/effective-access-profile.service"
import { PERMISSIONS } from "../../src/server/iam/permissions"
import { assignSystemRole } from "../../src/server/iam/role-assignment.service"
import { SYSTEM_ROLE_KEYS } from "../../src/server/iam/system-role-catalog"
import {
  createAdminRoleAssignment as createRoleService,
  getAdminRoleOverview,
  revokeAdminRoleAssignment as revokeRoleService,
} from "../../src/server/admin/admin-roles.service"
import { AdminRoleAssignmentNotFoundError } from "../../src/server/admin/admin-role.errors"
import { readAdminJson } from "../../src/server/admin/admin-http"

async function createAdminRoleAssignment(input: Parameters<typeof createRoleService>[0]) {
  return createRoleService({ ...input, actorSessionToken: await verifiedSessionToken(input.actorUserId) });
}
async function revokeAdminRoleAssignment(input: Parameters<typeof revokeRoleService>[0]) {
  return revokeRoleService({ ...input, actorSessionToken: await verifiedSessionToken(input.actorUserId) });
}

const TEST_DATABASE = "pap_saude_f04_role_adversarial_test"

async function cleanup() {
  await db.auditEvent.deleteMany()
  await db.roleAssignment.deleteMany()
  await db.membership.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()
  await db.organization.deleteMany({ where: { type: OrganizationType.HEALTH_UNIT } })
  await db.organization.deleteMany({ where: { type: OrganizationType.MUNICIPALITY } })
  await db.organization.deleteMany({ where: { type: OrganizationType.PAP } })
  await db.user.deleteMany()
}

async function user(email: string) {
  return db.user.create({
    data: { email, displayName: email, isActive: true },
  })
}

async function papAdmin(email: string) {
  const actor = await user(email)
  await assignSystemRole({ userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.PAP_ADMIN })
  return actor
}

async function organizations() {
  const pap = await db.organization.create({
    data: {
      name: "PAP Test H", code: "PAP-H",
      type: OrganizationType.PAP, status: OrganizationStatus.ACTIVE, isActive: true,
    },
  })
  const muniA = await db.organization.create({
    data: {
      name: "Municipality A", code: "MA-H", parentId: pap.id,
      type: OrganizationType.MUNICIPALITY, status: OrganizationStatus.ACTIVE, isActive: true,
    },
  })
  const muniB = await db.organization.create({
    data: {
      name: "Municipality B", code: "MB-H", parentId: pap.id,
      type: OrganizationType.MUNICIPALITY, status: OrganizationStatus.ACTIVE, isActive: true,
    },
  })
  const unitA = await db.organization.create({
    data: {
      name: "Unit A", code: "UA-H", parentId: muniA.id,
      type: OrganizationType.HEALTH_UNIT, status: OrganizationStatus.ACTIVE, isActive: true,
    },
  })
  const unitB = await db.organization.create({
    data: {
      name: "Unit B", code: "UB-H", parentId: muniB.id,
      type: OrganizationType.HEALTH_UNIT, status: OrganizationStatus.ACTIVE, isActive: true,
    },
  })
  return { pap, muniA, muniB, unitA, unitB }
}

async function member(userId: string, organizationId: string) {
  return db.membership.create({
    data: { userId, organizationId, status: MembershipStatus.ACTIVE },
  })
}

before(async () => {
  const rows = await db.$queryRaw<Array<{ database: string }>>`
    SELECT current_database() AS database
  `
  assert.equal(rows[0]?.database, TEST_DATABASE)
  await cleanup()
})

beforeEach(async () => {
  await cleanup()
  await bootstrapSystemIam()
})

after(async () => {
  await cleanup()
})

test("H2: municipality administrator cannot assign global PAP_ADMIN or COMMERCIAL", async () => {
  const { muniA } = await organizations()
  const actor = await user("muni-actor@example.test")
  const target = await user("muni-target@example.test")
  await member(actor.id, muniA.id)
  await assignSystemRole({
    userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
    organizationId: muniA.id,
  })

  for (const roleKey of [SYSTEM_ROLE_KEYS.PAP_ADMIN, SYSTEM_ROLE_KEYS.COMMERCIAL]) {
    await assert.rejects(createAdminRoleAssignment({
      actorUserId: actor.id, targetUserId: target.id, roleKey,
    }))
  }
  assert.equal(await db.auditEvent.count(), 0)
  assert.equal(await db.roleAssignment.count({ where: { userId: target.id } }), 0)
})

test("H2/H5: wrong scope and unsupported roles never persist", async () => {
  const actor = await papAdmin("scope-actor@example.test")
  const target = await user("scope-target@example.test")
  const { muniA, unitA } = await organizations()
  await member(target.id, muniA.id)
  await member(target.id, unitA.id)

  const invalid = [
    { roleKey: SYSTEM_ROLE_KEYS.PAP_ADMIN, organizationId: unitA.id },
    { roleKey: SYSTEM_ROLE_KEYS.COMMERCIAL, organizationId: unitA.id },
    { roleKey: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN, organizationId: unitA.id },
    { roleKey: SYSTEM_ROLE_KEYS.HEALTH_UNIT_ADMIN, organizationId: muniA.id },
    { roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: null },
    { roleKey: "UNKNOWN_ROLE", organizationId: unitA.id },
  ]
  for (const item of invalid) {
    await assert.rejects(createAdminRoleAssignment({
      actorUserId: actor.id, targetUserId: target.id,
      roleKey: item.roleKey, organizationId: item.organizationId,
    }))
  }
  assert.equal(await db.roleAssignment.count({ where: { userId: target.id } }), 0)
  assert.equal(await db.auditEvent.count(), 0)
})

test("H3: foreign role assignment is indistinguishable from missing for scoped actor", async () => {
  const admin = await papAdmin("idor-global@example.test")
  const actor = await user("idor-muni@example.test")
  const target = await user("idor-target@example.test")
  const { muniA, unitB } = await organizations()
  await member(actor.id, muniA.id)
  await member(target.id, unitB.id)
  await assignSystemRole({
    userId: actor.id, roleKey: SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
    organizationId: muniA.id,
  })
  const foreign = await createAdminRoleAssignment({
    actorUserId: admin.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: unitB.id,
  })

  for (const assignmentId of [foreign.id, randomUUID()]) {
    await assert.rejects(
      revokeAdminRoleAssignment({ actorUserId: actor.id, assignmentId }),
      (error: unknown) => error instanceof AdminRoleAssignmentNotFoundError,
    )
  }
  const overview = await getAdminRoleOverview(actor.id)
  assert.equal(overview.assignments.some((item) => item.id === foreign.id), false)
  assert.equal(await db.roleAssignment.count({ where: { id: foreign.id } }), 1)
  assert.equal(await db.auditEvent.count({ where: { action: "ROLE_REVOKED" } }), 0)
})

test("H4: inactive organization membership target and actor block role assignment", async () => {
  const actor = await papAdmin("inactive-actor@example.test")
  const target = await user("inactive-target@example.test")
  const { unitA } = await organizations()
  const membership = await member(target.id, unitA.id)
  const input = {
    actorUserId: actor.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: unitA.id,
  }
  await db.membership.update({
    where: { id: membership.id }, data: { status: MembershipStatus.SUSPENDED },
  })
  await assert.rejects(createAdminRoleAssignment(input))
  await db.membership.update({
    where: { id: membership.id }, data: { status: MembershipStatus.ACTIVE },
  })
  await db.organization.update({
    where: { id: unitA.id }, data: { status: OrganizationStatus.SUSPENDED },
  })
  await assert.rejects(createAdminRoleAssignment(input))
  await db.organization.update({
    where: { id: unitA.id }, data: { status: OrganizationStatus.ACTIVE },
  })
  await db.user.update({ where: { id: target.id }, data: { isActive: false } })
  await assert.rejects(createAdminRoleAssignment(input))
  await db.user.update({ where: { id: target.id }, data: { isActive: true } })
  await db.user.update({ where: { id: actor.id }, data: { isActive: false } })
  await assert.rejects(createAdminRoleAssignment(input))
  assert.equal(await db.roleAssignment.count({ where: { userId: target.id } }), 0)
  assert.equal(await db.auditEvent.count(), 0)
})

test("H7: suspended memberships and units cannot exercise persisted scoped roles", async () => {
  const admin = await papAdmin("lifecycle-admin@example.test")
  const target = await user("lifecycle-target@example.test")
  const { unitA } = await organizations()
  const membership = await member(target.id, unitA.id)
  await createAdminRoleAssignment({
    actorUserId: admin.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: unitA.id,
  })
  const input = {
    userId: target.id, permission: PERMISSIONS.PATIENT_READ,
    organizationId: unitA.id,
  }
  assert.equal((await authorize(input)).allowed, true)
  await db.membership.update({
    where: { id: membership.id }, data: { status: MembershipStatus.SUSPENDED },
  })
  assert.equal((await authorize(input)).allowed, false)
  await db.membership.update({
    where: { id: membership.id }, data: { status: MembershipStatus.ACTIVE },
  })
  await db.organization.update({
    where: { id: unitA.id }, data: { status: OrganizationStatus.SUSPENDED },
  })
  assert.equal((await authorize(input)).allowed, false)
  await db.organization.update({
    where: { id: unitA.id }, data: { status: OrganizationStatus.ACTIVE },
  })
  assert.equal((await authorize(input)).allowed, true)
  // Existing semantics restore persisted assignments on reactivation.
  // Whether reactivation should require new approval remains a policy decision.
})

test("H6: database permission drift cannot grant PAP_ADMIN clinical access", async () => {
  const actor = await papAdmin("drift-admin@example.test")
  const { unitA } = await organizations()
  const role = await db.role.findUniqueOrThrow({ where: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN } })
  const permission = await db.permission.findUniqueOrThrow({
    where: { key: PERMISSIONS.PATIENT_READ },
  })
  await db.rolePermission.create({
    data: { roleId: role.id, permissionId: permission.id },
  })
  assert.equal((await authorize({
    userId: actor.id, permission: PERMISSIONS.PATIENT_READ, organizationId: unitA.id,
  })).allowed, false)
  assert.equal((await getEffectiveAccessProfile(actor.id))?.permissions.includes(PERMISSIONS.PATIENT_READ), false)
})

test("H6: unknown role with persisted permission remains fail closed", async () => {
  const target = await user("unknown-role@example.test")
  const { unitA } = await organizations()
  const role = await db.role.create({
    data: { key: "ADVERSARIAL_CUSTOM", name: "Custom", system: false },
  })
  const permission = await db.permission.findUniqueOrThrow({
    where: { key: PERMISSIONS.PATIENT_READ },
  })
  await db.rolePermission.create({
    data: { roleId: role.id, permissionId: permission.id },
  })
  await db.roleAssignment.create({ data: { userId: target.id, roleId: role.id, organizationId: null } })
  assert.equal((await authorize({
    userId: target.id, permission: PERMISSIONS.PATIENT_READ, organizationId: unitA.id,
  })).allowed, false)
  assert.equal((await getEffectiveAccessProfile(target.id))?.permissions.length, 0)
})

test("H6: malformed global scope and non-system system-key role never authorize", async () => {
  const target = await user("malformed-scope@example.test")
  const { unitA } = await organizations()
  const role = await db.role.findUniqueOrThrow({ where: { key: SYSTEM_ROLE_KEYS.PAP_ADMIN } })
  await db.roleAssignment.create({
    data: { userId: target.id, roleId: role.id, organizationId: unitA.id },
  })
  const input = {
    userId: target.id, permission: PERMISSIONS.ROLE_MANAGE,
    organizationId: unitA.id,
  }
  assert.equal((await authorize(input)).allowed, false)
  assert.equal((await getEffectiveAccessProfile(target.id))?.permissions.length, 0)

  await db.roleAssignment.deleteMany({ where: { userId: target.id } })
  await db.roleAssignment.create({
    data: { userId: target.id, roleId: role.id, organizationId: null },
  })
  await db.role.update({ where: { id: role.id }, data: { system: false } })
  assert.equal((await authorize(input)).allowed, false)
  assert.equal((await getEffectiveAccessProfile(target.id))?.permissions.length, 0)
})

test("H1/H5/H8: concurrent repeated assignment is unique and emits one audit event", async () => {
  const actor = await papAdmin("concurrent-actor@example.test")
  const target = await user("concurrent-target@example.test")
  const { unitA } = await organizations()
  await member(target.id, unitA.id)
  const input = {
    actorUserId: actor.id, targetUserId: target.id,
    roleKey: SYSTEM_ROLE_KEYS.PROFESSIONAL, organizationId: unitA.id,
  }
  const outcomes = await Promise.allSettled([
    createAdminRoleAssignment(input),
    createAdminRoleAssignment(input),
  ])
  const successes = outcomes.filter((item) => item.status === "fulfilled")
  assert.ok(successes.length >= 1)
  for (const result of outcomes) {
    if (result.status === "rejected") {
      assert.equal((result.reason as Error).message, "ROLE_ASSIGNMENT_CONFLICT")
    }
  }
  assert.equal(await db.roleAssignment.count({
    where: { userId: target.id, organizationId: unitA.id },
  }), 1)
  assert.equal(await db.auditEvent.count({ where: { action: "ROLE_ASSIGNED" } }), 1)
})

test("H5: malformed oversized and array JSON payloads are rejected", async () => {
  const request = (body: string) => new Request("http://localhost:3000/api/admin/role-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  for (const body of ["{invalid", "[]", "x".repeat(32769)]) {
    await assert.rejects(readAdminJson(request(body)), /INVALID_ADMIN_PAYLOAD/)
  }
})
