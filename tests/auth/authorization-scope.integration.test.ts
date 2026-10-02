import assert from "node:assert/strict"

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test"

import {
  MembershipStatus,
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client"

import { db } from "../../src/server/db/client"

import {
  bootstrapSystemIam,
} from "../../src/server/iam/bootstrap.service"

import {
  authorize,
  requirePermission,
} from "../../src/server/iam/authorization.service"

import {
  AccessDeniedError,
} from "../../src/server/iam/authorization.errors"

import {
  PERMISSIONS,
} from "../../src/server/iam/permissions"

import {
  assignSystemRole,
} from "../../src/server/iam/role-assignment.service"

import {
  SYSTEM_ROLE_KEYS,
} from "../../src/server/iam/system-role-catalog"

const EXPECTED_DATABASE =
  "pap_saude_f02b_test"

async function assertSafeDatabase() {
  const rows =
    await db.$queryRaw<
      Array<{ database: string }>
    >`SELECT current_database() AS database`

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  )
}

async function clearFixtures() {
  await db.roleAssignment.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()
  await db.membership.deleteMany()
  await db.organization.deleteMany()
  await db.user.deleteMany()
}

async function createUser(
  email: string,
) {
  return db.user.create({
    data: {
      email,
      displayName: email,
    },
  })
}

async function createTree() {
  const pap =
    await db.organization.create({
      data: {
        type: OrganizationType.PAP,
        status: OrganizationStatus.ACTIVE,
        name: "PAP Saúde",
        isActive: true,
      },
    })

  const municipalityA =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,
        status:
          OrganizationStatus.ACTIVE,
        name: "Município A",
        parentId: pap.id,
        isActive: true,
      },
    })

  const municipalityB =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,
        status:
          OrganizationStatus.ACTIVE,
        name: "Município B",
        parentId: pap.id,
        isActive: true,
      },
    })

  const unitA =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name: "UBS A",
        cnes: "1000001",
        parentId:
          municipalityA.id,
        isActive: true,
      },
    })

  const unitA2 =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name: "UBS A2",
        cnes: "1000002",
        parentId:
          municipalityA.id,
        isActive: true,
      },
    })

  const unitB =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name: "UBS B",
        cnes: "2000001",
        parentId:
          municipalityB.id,
        isActive: true,
      },
    })

  return {
    pap,
    municipalityA,
    municipalityB,
    unitA,
    unitA2,
    unitB,
  }
}

async function activateMembership(
  userId: string,
  organizationId: string,
) {
  return db.membership.create({
    data: {
      userId,
      organizationId,
      status:
        MembershipStatus.ACTIVE,
    },
  })
}

before(async () => {
  await assertSafeDatabase()
  await clearFixtures()
})

beforeEach(async () => {
  await clearFixtures()
  await bootstrapSystemIam()
})

after(async () => {
  await clearFixtures()
})

test(
  "PAP admin can manage organizations globally",
  async () => {
    const user =
      await createUser(
        "pap-scope@example.test",
      )

    const { unitB } =
      await createTree()

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.ORGANIZATION_MANAGE,
        organizationId:
          unitB.id,
      })

    assert.equal(
      decision.allowed,
      true,
    )
  },
)

test(
  "PAP admin does not gain clinical access",
  async () => {
    const user =
      await createUser(
        "pap-no-clinical@example.test",
      )

    const { unitA } =
      await createTree()

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.PATIENT_READ,
        organizationId:
          unitA.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )
  },
)

test(
  "municipal admin can access own municipality",
  async () => {
    const user =
      await createUser(
        "municipal-own@example.test",
      )

    const { municipalityA } =
      await createTree()

    await activateMembership(
      user.id,
      municipalityA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
      organizationId:
        municipalityA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.ORGANIZATION_READ,
        organizationId:
          municipalityA.id,
      })

    assert.equal(
      decision.allowed,
      true,
    )
  },
)

test(
  "municipal admin can access child health unit",
  async () => {
    const user =
      await createUser(
        "municipal-child@example.test",
      )

    const {
      municipalityA,
      unitA2,
    } = await createTree()

    await activateMembership(
      user.id,
      municipalityA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
      organizationId:
        municipalityA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.ORGANIZATION_READ,
        organizationId:
          unitA2.id,
      })

    assert.equal(
      decision.allowed,
      true,
    )
  },
)

test(
  "municipal admin cannot access another municipality",
  async () => {
    const user =
      await createUser(
        "municipal-cross@example.test",
      )

    const {
      municipalityA,
      municipalityB,
    } = await createTree()

    await activateMembership(
      user.id,
      municipalityA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
      organizationId:
        municipalityA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.ORGANIZATION_READ,
        organizationId:
          municipalityB.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )
  },
)

test(
  "municipal admin cannot access health unit from another municipality",
  async () => {
    const user =
      await createUser(
        "municipal-unit-cross@example.test",
      )

    const {
      municipalityA,
      unitB,
    } = await createTree()

    await activateMembership(
      user.id,
      municipalityA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
      organizationId:
        municipalityA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.ORGANIZATION_READ,
        organizationId:
          unitB.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )
  },
)

test(
  "professional can access own health unit",
  async () => {
    const user =
      await createUser(
        "professional-own@example.test",
      )

    const { unitA } =
      await createTree()

    await activateMembership(
      user.id,
      unitA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unitA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.PATIENT_READ,
        organizationId:
          unitA.id,
      })

    assert.equal(
      decision.allowed,
      true,
    )
  },
)

test(
  "professional cannot access sibling health unit",
  async () => {
    const user =
      await createUser(
        "professional-sibling@example.test",
      )

    const {
      unitA,
      unitA2,
    } = await createTree()

    await activateMembership(
      user.id,
      unitA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unitA.id,
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.PATIENT_READ,
        organizationId:
          unitA2.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )
  },
)

test(
  "suspended membership immediately revokes scoped access",
  async () => {
    const user =
      await createUser(
        "suspended-membership@example.test",
      )

    const { unitA } =
      await createTree()

    const membership =
      await activateMembership(
        user.id,
        unitA.id,
      )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unitA.id,
    })

    await db.membership.update({
      where: {
        id: membership.id,
      },
      data: {
        status:
          MembershipStatus.SUSPENDED,
      },
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.PATIENT_READ,
        organizationId:
          unitA.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )
  },
)

test(
  "inactive user is denied even with valid role assignment",
  async () => {
    const user =
      await createUser(
        "inactive-user@example.test",
      )

    const { unitA } =
      await createTree()

    await activateMembership(
      user.id,
      unitA.id,
    )

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        unitA.id,
    })

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        isActive: false,
      },
    })

    const decision =
      await authorize({
        userId: user.id,
        permission:
          PERMISSIONS.PATIENT_READ,
        organizationId:
          unitA.id,
      })

    assert.equal(
      decision.allowed,
      false,
    )

    assert.equal(
      decision.reason,
      "USER_INACTIVE",
    )
  },
)

test(
  "requirePermission throws generic access denied",
  async () => {
    const user =
      await createUser(
        "require-denied@example.test",
      )

    const { unitA } =
      await createTree()

    await assert.rejects(
      () =>
        requirePermission({
          userId: user.id,
          permission:
            PERMISSIONS.PATIENT_READ,
          organizationId:
            unitA.id,
        }),
      AccessDeniedError,
    )
  },
)
