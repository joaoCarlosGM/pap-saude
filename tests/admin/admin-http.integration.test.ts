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

import {
  NextRequest,
} from "next/server"

import {
  GET as organizationsGET,
  POST as organizationsPOST,
} from "../../src/app/api/admin/organizations/route"

import {
  PATCH as organizationPATCH,
} from "../../src/app/api/admin/organizations/[organizationId]/route"

import {
  GET as usersGET,
} from "../../src/app/api/admin/users/route"

import {
  createSession,
} from "../../src/server/auth/session.service"

import {
  db,
} from "../../src/server/db/client"

import {
  bootstrapSystemIam,
} from "../../src/server/iam/bootstrap.service"

import {
  assignSystemRole,
} from "../../src/server/iam/role-assignment.service"

import {
  SYSTEM_ROLE_KEYS,
} from "../../src/server/iam/system-role-catalog"

import {
  SESSION_COOKIE_NAME,
} from "../../src/server/security/constants"

const EXPECTED_DATABASE =
  "pap_saude_f04_admin_core_test"

const BASE_URL =
  "http://localhost:3000"

const previousAllowedOrigins =
  process.env.AUTH_ALLOWED_ORIGINS

type OrganizationRouteContext = {
  params: Promise<{
    organizationId: string
  }>
}

async function assertSafeDatabase() {
  const rows =
    await db.$queryRaw<
      Array<{
        database: string
      }>
    >`SELECT current_database() AS database`

  assert.equal(
    rows[0]?.database,
    EXPECTED_DATABASE,
  )
}

async function clearFixtures() {
  await db.auditEvent.deleteMany()
  await db.productActivityEvent.deleteMany()
  await db.session.deleteMany()

  await db.roleAssignment.deleteMany()
  await db.membership.deleteMany()

  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()

  await db.organization.deleteMany({
    where: {
      type:
        OrganizationType.HEALTH_UNIT,
    },
  })

  await db.organization.deleteMany({
    where: {
      type:
        OrganizationType.MUNICIPALITY,
    },
  })

  await db.organization.deleteMany({
    where: {
      type:
        OrganizationType.PAP,
    },
  })

  await db.user.deleteMany()
}

async function createUser(
  email: string,
  displayName = email,
) {
  return db.user.create({
    data: {
      email,
      displayName,
      isActive: true,
    },
  })
}

async function createOrganizationTree() {
  const pap =
    await db.organization.create({
      data: {
        type:
          OrganizationType.PAP,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "PAP Saúde",

        code:
          "PAP",

        isActive:
          true,
      },
    })

  const municipalityA =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "Município A",

        code:
          "MUN-A",

        parentId:
          pap.id,

        city:
          "Belém",

        state:
          "PA",

        isActive:
          true,
      },
    })

  const municipalityB =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "Município B",

        code:
          "MUN-B",

        parentId:
          pap.id,

        city:
          "Município B",

        state:
          "PA",

        isActive:
          true,
      },
    })

  const unitA =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "UBS A",

        code:
          "UBS-A",

        cnes:
          "7000001",

        parentId:
          municipalityA.id,

        city:
          "Belém",

        state:
          "PA",

        isActive:
          true,
      },
    })

  const unitB =
    await db.organization.create({
      data: {
        type:
          OrganizationType.HEALTH_UNIT,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "UBS B",

        code:
          "UBS-B",

        cnes:
          "7000002",

        parentId:
          municipalityB.id,

        city:
          "Município B",

        state:
          "PA",

        isActive:
          true,
      },
    })

  return {
    pap,
    municipalityA,
    municipalityB,
    unitA,
    unitB,
  }
}

async function makePapAdmin(
  userId: string,
) {
  await assignSystemRole({
    userId,
    roleKey:
      SYSTEM_ROLE_KEYS.PAP_ADMIN,
  })
}

async function makeMunicipalAdmin(
  userId: string,
  organizationId: string,
) {
  await db.membership.create({
    data: {
      userId,
      organizationId,

      status:
        MembershipStatus.ACTIVE,
    },
  })

  await assignSystemRole({
    userId,

    roleKey:
      SYSTEM_ROLE_KEYS.MUNICIPAL_ADMIN,

    organizationId,
  })
}

async function makeProfessional(
  userId: string,
  organizationId: string,
) {
  await db.membership.create({
    data: {
      userId,
      organizationId,

      status:
        MembershipStatus.ACTIVE,
    },
  })

  await assignSystemRole({
    userId,

    roleKey:
      SYSTEM_ROLE_KEYS.PROFESSIONAL,

    organizationId,
  })
}

async function sessionFor(
  userId: string,
) {
  const session =
    await createSession({
      userId,

      userAgent:
        "PAP-F04-Admin-Test",
    })

  return session.token
}

function requestFor(
  method: string,
  pathname: string,
  options: {
    token?: string
    body?: unknown
    origin?: string
  } = {},
) {
  const headers =
    new Headers()

  if (options.token) {
    headers.set(
      "cookie",
      `${SESSION_COOKIE_NAME}=${options.token}`,
    )
  }

  if (
    method === "POST" ||
    method === "PATCH"
  ) {
    headers.set(
      "origin",
      options.origin ??
        BASE_URL,
    )
  }

  if (
    options.body !==
    undefined
  ) {
    headers.set(
      "content-type",
      "application/json",
    )
  }

  return new NextRequest(
    `${BASE_URL}${pathname}`,
    {
      method,
      headers,

      ...(options.body !==
      undefined
        ? {
            body:
              JSON.stringify(
                options.body,
              ),
          }
        : {}),
    },
  )
}

function organizationContext(
  organizationId: string,
): OrganizationRouteContext {
  return {
    params:
      Promise.resolve({
        organizationId,
      }),
  }
}

before(async () => {
  process.env.AUTH_ALLOWED_ORIGINS =
    BASE_URL

  await assertSafeDatabase()
  await clearFixtures()
})

beforeEach(async () => {
  await clearFixtures()
  await bootstrapSystemIam()
})

after(async () => {
  await clearFixtures()

  if (
    previousAllowedOrigins ===
    undefined
  ) {
    delete process.env.AUTH_ALLOWED_ORIGINS
  } else {
    process.env.AUTH_ALLOWED_ORIGINS =
      previousAllowedOrigins
  }
})

test(
  "admin API rejects unauthenticated access",
  async () => {
    const response =
      await organizationsGET(
        requestFor(
          "GET",
          "/api/admin/organizations",
        ),
      )

    assert.equal(
      response.status,
      401,
    )
  },
)

test(
  "PAP admin can create a municipality under PAP",
  async () => {
    const {
      pap,
    } =
      await createOrganizationTree()

    const admin =
      await createUser(
        "pap-admin@example.test",
        "PAP Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await organizationsPOST(
        requestFor(
          "POST",
          "/api/admin/organizations",
          {
            token,

            body: {
              type:
                "MUNICIPALITY",

              name:
                "Município Novo",

              parentId:
                pap.id,

              city:
                "Novo Município",

              state:
                "PA",
            },
          },
        ),
      )

    assert.equal(
      response.status,
      201,
    )

    const body =
      await response.json()

    assert.equal(
      body.organization.type,
      "MUNICIPALITY",
    )

    assert.equal(
      body.organization.status,
      "PENDING_VERIFICATION",
    )

    assert.equal(
      body.organization.parentId,
      pap.id,
    )
  },
)

test(
  "municipal admin lists only its municipality and direct health units",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "municipal-a@example.test",
        "Admin Município A",
      )

    await makeMunicipalAdmin(
      admin.id,
      tree.municipalityA.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await organizationsGET(
        requestFor(
          "GET",
          "/api/admin/organizations",
          {
            token,
          },
        ),
      )

    assert.equal(
      response.status,
      200,
    )

    const body =
      await response.json()

    const ids =
      new Set(
        body.organizations.map(
          (
            organization: {
              id: string
            },
          ) =>
            organization.id,
        ),
      )

    assert.equal(
      ids.has(
        tree.municipalityA.id,
      ),
      true,
    )

    assert.equal(
      ids.has(
        tree.unitA.id,
      ),
      true,
    )

    assert.equal(
      ids.has(
        tree.municipalityB.id,
      ),
      false,
    )

    assert.equal(
      ids.has(
        tree.unitB.id,
      ),
      false,
    )

    assert.equal(
      ids.has(
        tree.pap.id,
      ),
      false,
    )
  },
)

test(
  "municipal admin cannot create health unit under another municipality",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "municipal-cross@example.test",
        "Admin Cross",
      )

    await makeMunicipalAdmin(
      admin.id,
      tree.municipalityA.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await organizationsPOST(
        requestFor(
          "POST",
          "/api/admin/organizations",
          {
            token,

            body: {
              type:
                "HEALTH_UNIT",

              name:
                "UBS Intrusa",

              parentId:
                tree.municipalityB.id,

              cnes:
                "7000099",

              city:
                "Município B",

              state:
                "PA",
            },
          },
        ),
      )

    assert.equal(
      response.status,
      403,
    )

    assert.equal(
      await db.organization.count({
        where: {
          name:
            "UBS Intrusa",
        },
      }),
      0,
    )
  },
)

test(
  "cross-tenant organization mutation and nonexistent organization are externally indistinguishable",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "municipal-idor@example.test",
        "Admin IDOR",
      )

    await makeMunicipalAdmin(
      admin.id,
      tree.municipalityA.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const crossTenant =
      await organizationPATCH(
        requestFor(
          "PATCH",
          `/api/admin/organizations/${tree.unitB.id}`,
          {
            token,

            body: {
              operation:
                "SUSPEND",
            },
          },
        ),

        organizationContext(
          tree.unitB.id,
        ),
      )

    const nonexistentId =
      "00000000-0000-4000-8000-ffffffffffff"

    const nonexistent =
      await organizationPATCH(
        requestFor(
          "PATCH",
          `/api/admin/organizations/${nonexistentId}`,
          {
            token,

            body: {
              operation:
                "SUSPEND",
            },
          },
        ),

        organizationContext(
          nonexistentId,
        ),
      )

    assert.equal(
      crossTenant.status,
      403,
    )

    assert.equal(
      nonexistent.status,
      403,
    )

    assert.deepEqual(
      await crossTenant.json(),
      await nonexistent.json(),
    )
  },
)

test(
  "admin user directory does not expose users from another municipality",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "directory-admin@example.test",
        "Admin Diretório",
      )

    await makeMunicipalAdmin(
      admin.id,
      tree.municipalityA.id,
    )

    const professionalA =
      await createUser(
        "professional-a@example.test",
        "Profissional A",
      )

    const professionalB =
      await createUser(
        "professional-b@example.test",
        "Profissional B",
      )

    await makeProfessional(
      professionalA.id,
      tree.unitA.id,
    )

    await makeProfessional(
      professionalB.id,
      tree.unitB.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await usersGET(
        requestFor(
          "GET",
          "/api/admin/users",
          {
            token,
          },
        ),
      )

    assert.equal(
      response.status,
      200,
    )

    const body =
      await response.json()

    const emails =
      new Set(
        body.users.map(
          (
            user: {
              email: string
            },
          ) =>
            user.email,
        ),
      )

    assert.equal(
      emails.has(
        professionalA.email,
      ),
      true,
    )

    assert.equal(
      emails.has(
        professionalB.email,
      ),
      false,
    )
  },
)

test(
  "admin mutation rejects untrusted Origin",
  async () => {
    const {
      pap,
    } =
      await createOrganizationTree()

    const admin =
      await createUser(
        "csrf-admin@example.test",
        "Admin CSRF",
      )

    await makePapAdmin(
      admin.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await organizationsPOST(
        requestFor(
          "POST",
          "/api/admin/organizations",
          {
            token,

            origin:
              "https://evil.invalid",

            body: {
              type:
                "MUNICIPALITY",

              name:
                "Município CSRF",

              parentId:
                pap.id,
            },
          },
        ),
      )

    assert.equal(
      response.status,
      403,
    )

    const body =
      await response.json()

    assert.equal(
      body.error,
      "INVALID_REQUEST_ORIGIN",
    )

    assert.equal(
      await db.organization.count({
        where: {
          name:
            "Município CSRF",
        },
      }),
      0,
    )
  },
)
