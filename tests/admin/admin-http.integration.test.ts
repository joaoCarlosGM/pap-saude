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
  POST as invitationsPOST,
} from "../../src/app/api/admin/invitations/route"

import {
  GET as rolesGET,
} from "../../src/app/api/admin/roles/route"

import {
  POST as roleAssignmentPOST,
} from "../../src/app/api/admin/role-assignments/route"

import {
  DELETE as roleAssignmentDELETE,
} from "../../src/app/api/admin/role-assignments/[assignmentId]/route"

import {
  GET as invitationGET,
  POST as invitationAcceptPOST,
} from "../../src/app/api/invitations/accept/route"

import {
  verifyPassword,
} from "../../src/server/auth/password"

import {
  GET as onboardingGET,
  PATCH as onboardingPATCH,
} from "../../src/app/api/onboarding/[tourKey]/route"

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
  await db.userOnboardingProgress.deleteMany()
  await db.userInvitation.deleteMany()
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
    method === "PATCH" ||
    method === "PUT" ||
    method === "DELETE"
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

function roleAssignmentContext(
  assignmentId: string,
) {
  return {
    params:
      Promise.resolve({
        assignmentId,
      }),
  }
}

function onboardingContext(
  tourKey: string,
) {
  return {
    params:
      Promise.resolve({
        tourKey,
      }),
  }
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


test(
  "professional invitation creates only an INVITED membership and stores no plaintext token",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "invite-admin@example.test",
        "Invite Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await invitationsPOST(
        requestFor(
          "POST",
          "/api/admin/invitations",
          {
            token,

            body: {
              displayName:
                "Profissional Convite",

              email:
                "PROFISSIONAL.CONVITE@example.test",

              organizationId:
                tree.unitA.id,
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
      body.invitation.email,
      "profissional.convite@example.test",
    )

    assert.equal(
      body.invitation.roleKey,
      "PROFESSIONAL",
    )

    assert.ok(
      body.developmentUrl,
    )

    const invitation =
      await db.userInvitation.findUnique({
        where: {
          id:
            body.invitation.id,
        },
      })

    assert.ok(
      invitation,
    )

    assert.equal(
      invitation.status,
      "PENDING",
    )

    assert.equal(
      invitation.tokenHash.length,
      64,
    )

    assert.equal(
      invitation.tokenHash.includes(
        "token=",
      ),
      false,
    )

    const membership =
      await db.membership.findFirst({
        where: {
          organizationId:
            tree.unitA.id,

          user: {
            email:
              "profissional.convite@example.test",
          },
        },
      })

    assert.equal(
      membership?.status,
      "INVITED",
    )
  },
)

test(
  "municipal admin cannot invite a professional into another municipality",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "invite-cross@example.test",
        "Invite Cross",
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
      await invitationsPOST(
        requestFor(
          "POST",
          "/api/admin/invitations",
          {
            token,

            body: {
              displayName:
                "Profissional B",

              email:
                "professional-cross@example.test",

              organizationId:
                tree.unitB.id,
            },
          },
        ),
      )

    assert.equal(
      response.status,
      403,
    )

    assert.equal(
      await db.userInvitation.count(),
      0,
    )
  },
)

test(
  "invitation activates password membership and professional role exactly once",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "activation-admin@example.test",
        "Activation Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const adminToken =
      await sessionFor(
        admin.id,
      )

    const inviteResponse =
      await invitationsPOST(
        requestFor(
          "POST",
          "/api/admin/invitations",
          {
            token:
              adminToken,

            body: {
              displayName:
                "Profissional Ativação",

              email:
                "activation@example.test",

              organizationId:
                tree.unitA.id,
            },
          },
        ),
      )

    assert.equal(
      inviteResponse.status,
      201,
    )

    const inviteBody =
      await inviteResponse.json()

    const url =
      new URL(
        inviteBody.developmentUrl,
      )

    const invitationToken =
      url.searchParams.get(
        "token",
      )

    assert.ok(
      invitationToken,
    )

    const inspectResponse =
      await invitationGET(
        requestFor(
          "GET",
          `/api/invitations/accept?token=${encodeURIComponent(invitationToken)}`,
        ),
      )

    assert.equal(
      inspectResponse.status,
      200,
    )

    const inspectBody =
      await inspectResponse.json()

    assert.equal(
      inspectBody.invitation.requiresPassword,
      true,
    )

    const password =
      "PAP-Invite-Test-2026!"

    const acceptResponse =
      await invitationAcceptPOST(
        requestFor(
          "POST",
          "/api/invitations/accept",
          {
            body: {
              token:
                invitationToken,

              password,
            },
          },
        ),
      )

    assert.equal(
      acceptResponse.status,
      200,
    )

    const user =
      await db.user.findUniqueOrThrow({
        where: {
          email:
            "activation@example.test",
        },

        include: {
          passwordCredential:
            true,

          memberships:
            true,

          roleAssignments: {
            include: {
              role:
                true,
            },
          },
        },
      })

    assert.ok(
      user.passwordCredential,
    )

    assert.equal(
      await verifyPassword(
        user.passwordCredential!.passwordHash,
        password,
      ),
      true,
    )

    assert.equal(
      user.memberships[0]?.status,
      "ACTIVE",
    )

    assert.equal(
      user.roleAssignments[0]?.role.key,
      "PROFESSIONAL",
    )

    const replay =
      await invitationAcceptPOST(
        requestFor(
          "POST",
          "/api/invitations/accept",
          {
            body: {
              token:
                invitationToken,

              password,
            },
          },
        ),
      )

    assert.equal(
      replay.status,
      410,
    )
  },
)

test(
  "invitation acceptance rejects untrusted Origin",
  async () => {
    const response =
      await invitationAcceptPOST(
        requestFor(
          "POST",
          "/api/invitations/accept",
          {
            origin:
              "https://evil.invalid",

            body: {
              token:
                "not-a-valid-token",

              password:
                "PAP-Test-Password-2026",
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
  },
)


test(
  "onboarding progress is private to the authenticated user",
  async () => {
    const userA =
      await createUser(
        "onboarding-a@example.test",
        "Onboarding A",
      )

    const userB =
      await createUser(
        "onboarding-b@example.test",
        "Onboarding B",
      )

    const tokenA =
      await sessionFor(
        userA.id,
      )

    const tokenB =
      await sessionFor(
        userB.id,
      )

    const start =
      await onboardingPATCH(
        requestFor(
          "PATCH",
          "/api/onboarding/admin-core",
          {
            token:
              tokenA,

            body: {
              version:
                1,

              status:
                "STARTED",

              currentStep:
                2,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    assert.equal(
      start.status,
      200,
    )

    const own =
      await onboardingGET(
        new NextRequest(
          `${BASE_URL}/api/onboarding/admin-core?version=1`,
          {
            headers: {
              cookie:
                `${SESSION_COOKIE_NAME}=${tokenA}`,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    assert.equal(
      own.status,
      200,
    )

    const ownBody =
      await own.json()

    assert.equal(
      ownBody.progress.currentStep,
      2,
    )

    const other =
      await onboardingGET(
        new NextRequest(
          `${BASE_URL}/api/onboarding/admin-core?version=1`,
          {
            headers: {
              cookie:
                `${SESSION_COOKIE_NAME}=${tokenB}`,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    const otherBody =
      await other.json()

    assert.equal(
      otherBody.progress,
      null,
    )
  },
)

test(
  "onboarding completion persists and replay can restart it",
  async () => {
    const user =
      await createUser(
        "onboarding-state@example.test",
        "Onboarding State",
      )

    const token =
      await sessionFor(
        user.id,
      )

    const complete =
      await onboardingPATCH(
        requestFor(
          "PATCH",
          "/api/onboarding/admin-core",
          {
            token,

            body: {
              version:
                1,

              status:
                "COMPLETED",

              currentStep:
                5,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    assert.equal(
      complete.status,
      200,
    )

    let stored =
      await db.userOnboardingProgress.findFirstOrThrow({
        where: {
          userId:
            user.id,

          tourKey:
            "admin-core",

          tourVersion:
            1,
        },
      })

    assert.equal(
      stored.status,
      "COMPLETED",
    )

    assert.ok(
      stored.completedAt,
    )

    const restart =
      await onboardingPATCH(
        requestFor(
          "PATCH",
          "/api/onboarding/admin-core",
          {
            token,

            body: {
              version:
                1,

              status:
                "STARTED",

              currentStep:
                0,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    assert.equal(
      restart.status,
      200,
    )

    stored =
      await db.userOnboardingProgress.findFirstOrThrow({
        where: {
          userId:
            user.id,

          tourKey:
            "admin-core",

          tourVersion:
            1,
        },
      })

    assert.equal(
      stored.status,
      "STARTED",
    )

    assert.equal(
      stored.completedAt,
      null,
    )

    assert.equal(
      stored.skippedAt,
      null,
    )
  },
)

test(
  "onboarding versions are independent",
  async () => {
    const user =
      await createUser(
        "onboarding-version@example.test",
        "Onboarding Version",
      )

    const token =
      await sessionFor(
        user.id,
      )

    await onboardingPATCH(
      requestFor(
        "PATCH",
        "/api/onboarding/admin-core",
        {
          token,

          body: {
            version:
              1,

            status:
              "COMPLETED",

            currentStep:
              5,
          },
        },
      ),

      onboardingContext(
        "admin-core",
      ),
    )

    const versionTwo =
      await onboardingGET(
        new NextRequest(
          `${BASE_URL}/api/onboarding/admin-core?version=2`,
          {
            headers: {
              cookie:
                `${SESSION_COOKIE_NAME}=${token}`,
            },
          },
        ),

        onboardingContext(
          "admin-core",
        ),
      )

    const body =
      await versionTwo.json()

    assert.equal(
      body.progress,
      null,
    )
  },
)

test(
  "onboarding mutation rejects untrusted Origin",
  async () => {
    const user =
      await createUser(
        "onboarding-origin@example.test",
        "Onboarding Origin",
      )

    const token =
      await sessionFor(
        user.id,
      )

    const response =
      await onboardingPATCH(
        requestFor(
          "PATCH",
          "/api/onboarding/admin-core",
          {
            token,

            origin:
              "https://evil.invalid",

            body: {
              version:
                1,

              status:
                "STARTED",

              currentStep:
                0,
            },
          },
        ),

        onboardingContext(
          "admin-core",
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
      await db.userOnboardingProgress.count(),
      0,
    )
  },
)


test(
  "PAP admin can list the system role matrix",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "roles-pap@example.test",
        "Roles PAP",
      )

    await makePapAdmin(
      admin.id,
    )

    const professional =
      await createUser(
        "roles-professional@example.test",
        "Roles Professional",
      )

    await makeProfessional(
      professional.id,
      tree.unitA.id,
    )

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await rolesGET(
        requestFor(
          "GET",
          "/api/admin/roles",
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

    assert.equal(
      body.canManage,
      true,
    )

    assert.equal(
      body.roles.some(
        (
          role: {
            key: string
          },
        ) =>
          role.key ===
          "PAP_ADMIN",
      ),
      true,
    )

    assert.equal(
      body.roles.some(
        (
          role: {
            key: string
          },
        ) =>
          role.key ===
          "PROFESSIONAL",
      ),
      true,
    )

    assert.equal(
      body.assignments.some(
        (
          assignment: {
            user: {
              id: string
            }
          },
        ) =>
          assignment.user.id ===
          professional.id,
      ),
      true,
    )
  },
)

test(
  "municipal admin cannot see global or foreign role assignments",
  async () => {
    const tree =
      await createOrganizationTree()

    const papAdmin =
      await createUser(
        "roles-global@example.test",
        "Global Admin",
      )

    await makePapAdmin(
      papAdmin.id,
    )

    const municipal =
      await createUser(
        "roles-municipal@example.test",
        "Municipal Admin",
      )

    await makeMunicipalAdmin(
      municipal.id,
      tree.municipalityA.id,
    )

    const professionalA =
      await createUser(
        "roles-a@example.test",
        "Professional A",
      )

    const professionalB =
      await createUser(
        "roles-b@example.test",
        "Professional B",
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
        municipal.id,
      )

    const response =
      await rolesGET(
        requestFor(
          "GET",
          "/api/admin/roles",
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

    const visibleUsers =
      new Set(
        body.assignments.map(
          (
            assignment: {
              user: {
                id: string
              }
            },
          ) =>
            assignment.user.id,
        ),
      )

    assert.equal(
      visibleUsers.has(
        professionalA.id,
      ),
      true,
    )

    assert.equal(
      visibleUsers.has(
        professionalB.id,
      ),
      false,
    )

    assert.equal(
      visibleUsers.has(
        papAdmin.id,
      ),
      false,
    )

    assert.equal(
      body.canManage,
      false,
    )
  },
)

test(
  "PAP admin can assign scoped system role to an active member",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "role-assign-admin@example.test",
        "Role Assign Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const target =
      await createUser(
        "role-target@example.test",
        "Role Target",
      )

    await db.membership.create({
      data: {
        userId:
          target.id,

        organizationId:
          tree.unitA.id,

        status:
          MembershipStatus.ACTIVE,
      },
    })

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await roleAssignmentPOST(
        requestFor(
          "POST",
          "/api/admin/role-assignments",
          {
            token,

            body: {
              userId:
                target.id,

              roleKey:
                "HEALTH_UNIT_ADMIN",

              organizationId:
                tree.unitA.id,
            },
          },
        ),
      )

    assert.equal(
      response.status,
      201,
    )

    const persisted =
      await db.roleAssignment.findFirst({
        where: {
          userId:
            target.id,

          organizationId:
            tree.unitA.id,

          role: {
            key:
              "HEALTH_UNIT_ADMIN",
          },
        },
      })

    assert.ok(
      persisted,
    )
  },
)

test(
  "municipal admin cannot escalate privileges through role assignment API",
  async () => {
    const tree =
      await createOrganizationTree()

    const municipal =
      await createUser(
        "role-no-escalation@example.test",
        "No Escalation",
      )

    await makeMunicipalAdmin(
      municipal.id,
      tree.municipalityA.id,
    )

    const target =
      await createUser(
        "role-escalation-target@example.test",
        "Escalation Target",
      )

    await db.membership.create({
      data: {
        userId:
          target.id,

        organizationId:
          tree.unitA.id,

        status:
          MembershipStatus.ACTIVE,
      },
    })

    const token =
      await sessionFor(
        municipal.id,
      )

    const response =
      await roleAssignmentPOST(
        requestFor(
          "POST",
          "/api/admin/role-assignments",
          {
            token,

            body: {
              userId:
                target.id,

              roleKey:
                "HEALTH_UNIT_ADMIN",

              organizationId:
                tree.unitA.id,
            },
          },
        ),
      )

    assert.equal(
      response.status,
      403,
    )

    assert.equal(
      await db.roleAssignment.count({
        where: {
          userId:
            target.id,

          role: {
            key:
              "HEALTH_UNIT_ADMIN",
          },
        },
      }),
      0,
    )
  },
)

test(
  "PAP admin can revoke a non-critical role assignment",
  async () => {
    const tree =
      await createOrganizationTree()

    const admin =
      await createUser(
        "role-revoke-admin@example.test",
        "Revoke Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const target =
      await createUser(
        "role-revoke-target@example.test",
        "Revoke Target",
      )

    await makeProfessional(
      target.id,
      tree.unitA.id,
    )

    const assignment =
      await db.roleAssignment.findFirstOrThrow({
        where: {
          userId:
            target.id,

          organizationId:
            tree.unitA.id,

          role: {
            key:
              "PROFESSIONAL",
          },
        },
      })

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await roleAssignmentDELETE(
        requestFor(
          "DELETE",
          `/api/admin/role-assignments/${assignment.id}`,
          {
            token,
          },
        ),

        roleAssignmentContext(
          assignment.id,
        ),
      )

    assert.equal(
      response.status,
      200,
    )

    assert.equal(
      await db.roleAssignment.count({
        where: {
          id:
            assignment.id,
        },
      }),
      0,
    )
  },
)

test(
  "last active PAP admin cannot be revoked",
  async () => {
    const admin =
      await createUser(
        "last-pap-admin@example.test",
        "Last PAP Admin",
      )

    await makePapAdmin(
      admin.id,
    )

    const assignment =
      await db.roleAssignment.findFirstOrThrow({
        where: {
          userId:
            admin.id,

          organizationId:
            null,

          role: {
            key:
              "PAP_ADMIN",
          },
        },
      })

    const token =
      await sessionFor(
        admin.id,
      )

    const response =
      await roleAssignmentDELETE(
        requestFor(
          "DELETE",
          `/api/admin/role-assignments/${assignment.id}`,
          {
            token,
          },
        ),

        roleAssignmentContext(
          assignment.id,
        ),
      )

    assert.equal(
      response.status,
      409,
    )

    const body =
      await response.json()

    assert.equal(
      body.error,
      "LAST_PAP_ADMIN",
    )

    assert.equal(
      await db.roleAssignment.count({
        where: {
          id:
            assignment.id,
        },
      }),
      1,
    )
  },
)
