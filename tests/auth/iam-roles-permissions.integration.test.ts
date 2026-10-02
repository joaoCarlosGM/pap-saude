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
  PERMISSIONS,
} from "../../src/server/iam/permissions"

import {
  assignSystemRole,
  revokeSystemRole,
} from "../../src/server/iam/role-assignment.service"

import {
  ActiveMembershipRequiredError,
  InactiveOrganizationError,
  InvalidRoleScopeError,
} from "../../src/server/iam/role-assignment.errors"

import {
  SYSTEM_ROLE_KEYS,
  SYSTEM_ROLES,
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

async function createOrganizationTree() {
  const pap =
    await db.organization.create({
      data: {
        type: OrganizationType.PAP,
        status: OrganizationStatus.ACTIVE,
        name: "PAP Saúde",
        isActive: true,
      },
    })

  const municipality =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,
        status:
          OrganizationStatus.ACTIVE,
        name: "Belém",
        parentId: pap.id,
        isActive: true,
      },
    })

  const healthUnit =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,
        status:
          OrganizationStatus.ACTIVE,
        name: "UBS Teste",
        cnes: "7654321",
        parentId: municipality.id,
        isActive: true,
      },
    })

  return {
    pap,
    municipality,
    healthUnit,
  }
}

before(async () => {
  await assertSafeDatabase()
  await clearFixtures()
})

beforeEach(async () => {
  await clearFixtures()
})

after(async () => {
  await clearFixtures()
})

test(
  "bootstraps system permissions and roles idempotently",
  async () => {
    const first =
      await bootstrapSystemIam()

    const second =
      await bootstrapSystemIam()

    assert.equal(
      first.roles,
      SYSTEM_ROLES.length,
    )

    assert.equal(
      second.roles,
      SYSTEM_ROLES.length,
    )

    assert.equal(
      await db.role.count({
        where: {
          system: true,
        },
      }),
      SYSTEM_ROLES.length,
    )

    assert.equal(
      await db.permission.count(),
      Object.values(PERMISSIONS).length,
    )
  },
)

test(
  "PAP admin does not receive clinical permissions",
  async () => {
    await bootstrapSystemIam()

    const role =
      await db.role.findUniqueOrThrow({
        where: {
          key:
            SYSTEM_ROLE_KEYS.PAP_ADMIN,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      })

    const keys = new Set(
      role.permissions.map(
        (entry) => entry.permission.key,
      ),
    )

    assert.equal(
      keys.has(PERMISSIONS.PATIENT_READ),
      false,
    )

    assert.equal(
      keys.has(PERMISSIONS.ENCOUNTER_READ),
      false,
    )

    assert.equal(
      keys.has(
        PERMISSIONS.ORGANIZATION_MANAGE,
      ),
      true,
    )
  },
)

test(
  "professional receives clinical permissions only",
  async () => {
    await bootstrapSystemIam()

    const role =
      await db.role.findUniqueOrThrow({
        where: {
          key:
            SYSTEM_ROLE_KEYS.PROFESSIONAL,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      })

    const keys = new Set(
      role.permissions.map(
        (entry) => entry.permission.key,
      ),
    )

    assert.equal(
      keys.has(PERMISSIONS.PATIENT_READ),
      true,
    )

    assert.equal(
      keys.has(PERMISSIONS.ENCOUNTER_CREATE),
      true,
    )

    assert.equal(
      keys.has(
        PERMISSIONS.ORGANIZATION_MANAGE,
      ),
      false,
    )

    assert.equal(
      keys.has(
        PERMISSIONS.COMMERCIAL_MANAGE,
      ),
      false,
    )
  },
)

test(
  "assigns global PAP admin without organization",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "pap-admin@example.test",
      )

    const assignment =
      await assignSystemRole({
        userId: user.id,
        roleKey:
          SYSTEM_ROLE_KEYS.PAP_ADMIN,
      })

    assert.equal(
      assignment.organizationId,
      null,
    )
  },
)

test(
  "global assignment is idempotent",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "global-idempotent@example.test",
      )

    const first =
      await assignSystemRole({
        userId: user.id,
        roleKey:
          SYSTEM_ROLE_KEYS.COMMERCIAL,
      })

    const second =
      await assignSystemRole({
        userId: user.id,
        roleKey:
          SYSTEM_ROLE_KEYS.COMMERCIAL,
      })

    assert.equal(
      first.id,
      second.id,
    )

    assert.equal(
      await db.roleAssignment.count(),
      1,
    )
  },
)

test(
  "rejects global role with organization scope",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "global-scope@example.test",
      )

    const { municipality } =
      await createOrganizationTree()

    await assert.rejects(
      () =>
        assignSystemRole({
          userId: user.id,
          roleKey:
            SYSTEM_ROLE_KEYS.PAP_ADMIN,
          organizationId:
            municipality.id,
        }),
      InvalidRoleScopeError,
    )
  },
)

test(
  "assigns municipal admin only with active municipality membership",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "municipal@example.test",
      )

    const { municipality } =
      await createOrganizationTree()

    await db.membership.create({
      data: {
        userId: user.id,
        organizationId:
          municipality.id,
        status:
          MembershipStatus.ACTIVE,
      },
    })

    const assignment =
      await assignSystemRole({
        userId: user.id,
        roleKey:
          SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
        organizationId:
          municipality.id,
      })

    assert.equal(
      assignment.organizationId,
      municipality.id,
    )
  },
)

test(
  "rejects municipal admin on health unit",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "wrong-municipal-scope@example.test",
      )

    const { healthUnit } =
      await createOrganizationTree()

    await db.membership.create({
      data: {
        userId: user.id,
        organizationId:
          healthUnit.id,
        status:
          MembershipStatus.ACTIVE,
      },
    })

    await assert.rejects(
      () =>
        assignSystemRole({
          userId: user.id,
          roleKey:
            SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,
          organizationId:
            healthUnit.id,
        }),
      InvalidRoleScopeError,
    )
  },
)

test(
  "rejects professional without active membership",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "professional-no-membership@example.test",
      )

    const { healthUnit } =
      await createOrganizationTree()

    await assert.rejects(
      () =>
        assignSystemRole({
          userId: user.id,
          roleKey:
            SYSTEM_ROLE_KEYS.PROFESSIONAL,
          organizationId:
            healthUnit.id,
        }),
      ActiveMembershipRequiredError,
    )
  },
)

test(
  "rejects role assignment on suspended organization",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "suspended@example.test",
      )

    const { healthUnit } =
      await createOrganizationTree()

    await db.membership.create({
      data: {
        userId: user.id,
        organizationId:
          healthUnit.id,
        status:
          MembershipStatus.ACTIVE,
      },
    })

    await db.organization.update({
      where: {
        id: healthUnit.id,
      },
      data: {
        status:
          OrganizationStatus.SUSPENDED,
        isActive: false,
      },
    })

    await assert.rejects(
      () =>
        assignSystemRole({
          userId: user.id,
          roleKey:
            SYSTEM_ROLE_KEYS.PROFESSIONAL,
          organizationId:
            healthUnit.id,
        }),
      InactiveOrganizationError,
    )
  },
)

test(
  "revokes assigned role",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "revoke@example.test",
      )

    const { healthUnit } =
      await createOrganizationTree()

    await db.membership.create({
      data: {
        userId: user.id,
        organizationId:
          healthUnit.id,
        status:
          MembershipStatus.ACTIVE,
      },
    })

    await assignSystemRole({
      userId: user.id,
      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,
      organizationId:
        healthUnit.id,
    })

    const result =
      await revokeSystemRole({
        userId: user.id,
        roleKey:
          SYSTEM_ROLE_KEYS.PROFESSIONAL,
        organizationId:
          healthUnit.id,
      })

    assert.equal(result.count, 1)

    assert.equal(
      await db.roleAssignment.count(),
      0,
    )
  },
)

test(
  "database rejects duplicate global role assignments",
  async () => {
    await bootstrapSystemIam()

    const user =
      await createUser(
        "global-db-constraint@example.test",
      )

    const role =
      await db.role.findUniqueOrThrow({
        where: {
          key:
            SYSTEM_ROLE_KEYS.COMMERCIAL,
        },
      })

    await db.roleAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        organizationId: null,
      },
    })

    await assert.rejects(
      () =>
        db.roleAssignment.create({
          data: {
            userId: user.id,
            roleId: role.id,
            organizationId: null,
          },
        }),
    )

    assert.equal(
      await db.roleAssignment.count(),
      1,
    )
  },
)
