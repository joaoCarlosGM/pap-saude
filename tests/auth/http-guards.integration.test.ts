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
  SessionRevocationReason,
} from "@prisma/client"

import {
  NextRequest,
} from "next/server"

import { db } from "../../src/server/db/client"

import {
  createSession,
  revokeSessionById,
} from "../../src/server/auth/session.service"

import {
  SESSION_COOKIE_NAME,
} from "../../src/server/security/constants"

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
  PERMISSIONS,
} from "../../src/server/iam/permissions"

import {
  HttpAccessDeniedError,
  HttpAuthenticationRequiredError,
  InvalidHttpOrganizationContextError,
} from "../../src/server/http/http-auth.errors"

import {
  requireHttpGlobalPermission,
  requireHttpOrganizationPermission,
  requireHttpPermission,
  requireHttpSession,
} from "../../src/server/http/http-auth.guard"

import {
  httpAuthErrorResponse,
} from "../../src/server/http/http-auth-response"

import {
  ORGANIZATION_HEADER,
  readOrganizationIdFromRequest,
} from "../../src/server/http/organization-context"

const EXPECTED_DATABASE =
  "pap_saude_f02b_test"

const BASE_URL =
  "http://localhost:3000"

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
  await db.organizationHealthAlert.deleteMany()
  await db.productFeedback.deleteMany()
  await db.organizationMetricSnapshot.deleteMany()
  await db.productActivityEvent.deleteMany()

  await db.roleAssignment.deleteMany()
  await db.rolePermission.deleteMany()
  await db.permission.deleteMany()
  await db.role.deleteMany()

  await db.membership.deleteMany()
  await db.session.deleteMany()
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

        isActive:
          true,
      },
    })

  const municipality =
    await db.organization.create({
      data: {
        type:
          OrganizationType.MUNICIPALITY,

        status:
          OrganizationStatus.ACTIVE,

        name:
          "Município HTTP",

        parentId:
          pap.id,

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
          "UBS HTTP A",

        cnes:
          "9100001",

        parentId:
          municipality.id,

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
          "UBS HTTP B",

        cnes:
          "9100002",

        parentId:
          municipality.id,

        isActive:
          true,
      },
    })

  return {
    pap,
    municipality,
    unitA,
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

async function authenticatedRequest(
  userId: string,
) {
  const created =
    await createSession({
      userId,
      userAgent:
        "PAP-F02.4I-Test",
    })

  const request =
    new NextRequest(
      `${BASE_URL}/api/test`,
      {
        headers: {
          cookie:
            `${SESSION_COOKIE_NAME}=${created.token}`,
        },
      },
    )

  return {
    request,
    token:
      created.token,

    session:
      created.session,
  }
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
  "requireHttpSession rejects request without session cookie",
  async () => {
    const request =
      new NextRequest(
        `${BASE_URL}/api/test`,
      )

    await assert.rejects(
      () =>
        requireHttpSession(
          request,
        ),

      HttpAuthenticationRequiredError,
    )
  },
)

test(
  "requireHttpSession authenticates valid session",
  async () => {
    const user =
      await createUser(
        "http-session@example.test",
      )

    const {
      request,
      session,
    } =
      await authenticatedRequest(
        user.id,
      )

    const auth =
      await requireHttpSession(
        request,
      )

    assert.equal(
      auth.user.id,
      user.id,
    )

    assert.equal(
      auth.user.email,
      user.email,
    )

    assert.equal(
      auth.session.id,
      session.id,
    )
  },
)

test(
  "requireHttpSession rejects invalid session token",
  async () => {
    const request =
      new NextRequest(
        `${BASE_URL}/api/test`,
        {
          headers: {
            cookie:
              `${SESSION_COOKIE_NAME}=invalid-session-token`,
          },
        },
      )

    await assert.rejects(
      () =>
        requireHttpSession(
          request,
        ),

      HttpAuthenticationRequiredError,
    )
  },
)

test(
  "requireHttpSession rejects revoked session",
  async () => {
    const user =
      await createUser(
        "revoked-http@example.test",
      )

    const {
      request,
      session,
    } =
      await authenticatedRequest(
        user.id,
      )

    await revokeSessionById(
      session.id,
      SessionRevocationReason.LOGOUT,
    )

    await assert.rejects(
      () =>
        requireHttpSession(
          request,
        ),

      HttpAuthenticationRequiredError,
    )
  },
)

test(
  "global HTTP permission allows PAP administrator",
  async () => {
    const user =
      await createUser(
        "http-pap-admin@example.test",
      )

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    })

    const {
      request,
    } =
      await authenticatedRequest(
        user.id,
      )

    const context =
      await requireHttpGlobalPermission(
        request,
        PERMISSIONS.ORGANIZATION_MANAGE,
      )

    assert.equal(
      context.auth.user.id,
      user.id,
    )

    assert.equal(
      context.organizationId,
      null,
    )
  },
)

test(
  "HTTP permission converts RBAC denial to HttpAccessDeniedError",
  async () => {
    const user =
      await createUser(
        "http-no-clinical@example.test",
      )

    const {
      unitA,
    } =
      await createOrganizationTree()

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PAP_ADMIN,
    })

    const {
      request,
    } =
      await authenticatedRequest(
        user.id,
      )

    await assert.rejects(
      () =>
        requireHttpPermission({
          request,

          permission:
            PERMISSIONS.PATIENT_READ,

          organizationId:
            unitA.id,
        }),

      HttpAccessDeniedError,
    )
  },
)

test(
  "organization HTTP permission allows professional in own unit",
  async () => {
    const user =
      await createUser(
        "http-professional@example.test",
      )

    const {
      unitA,
    } =
      await createOrganizationTree()

    await activateMembership(
      user.id,
      unitA.id,
    )

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,

      organizationId:
        unitA.id,
    })

    const {
      request,
    } =
      await authenticatedRequest(
        user.id,
      )

    const context =
      await requireHttpOrganizationPermission(
        request,
        PERMISSIONS.PATIENT_READ,
        unitA.id,
      )

    assert.equal(
      context.organizationId,
      unitA.id,
    )

    assert.equal(
      context.auth.user.id,
      user.id,
    )
  },
)

test(
  "organization HTTP permission denies professional in sibling unit",
  async () => {
    const user =
      await createUser(
        "http-scope-denied@example.test",
      )

    const {
      unitA,
      unitB,
    } =
      await createOrganizationTree()

    await activateMembership(
      user.id,
      unitA.id,
    )

    await assignSystemRole({
      userId:
        user.id,

      roleKey:
        SYSTEM_ROLE_KEYS.PROFESSIONAL,

      organizationId:
        unitA.id,
    })

    const {
      request,
    } =
      await authenticatedRequest(
        user.id,
      )

    await assert.rejects(
      () =>
        requireHttpOrganizationPermission(
          request,
          PERMISSIONS.PATIENT_READ,
          unitB.id,
        ),

      HttpAccessDeniedError,
    )
  },
)

test(
  "organization HTTP permission requires organization context",
  async () => {
    const user =
      await createUser(
        "http-org-required@example.test",
      )

    const {
      request,
    } =
      await authenticatedRequest(
        user.id,
      )

    await assert.rejects(
      () =>
        requireHttpOrganizationPermission(
          request,
          PERMISSIONS.PATIENT_READ,
          null,
        ),

      InvalidHttpOrganizationContextError,
    )
  },
)

test(
  "organization header reader trims identifier",
  () => {
    const request =
      new NextRequest(
        `${BASE_URL}/api/test`,
        {
          headers: {
            [ORGANIZATION_HEADER]:
              "  organization-test-id  ",
          },
        },
      )

    assert.equal(
      readOrganizationIdFromRequest(
        request,
      ),
      "organization-test-id",
    )
  },
)

test(
  "organization header reader returns null when absent",
  () => {
    const request =
      new NextRequest(
        `${BASE_URL}/api/test`,
      )

    assert.equal(
      readOrganizationIdFromRequest(
        request,
      ),
      null,
    )
  },
)

test(
  "HTTP auth errors map to standardized no-store responses",
  async () => {
    const cases = [
      {
        error:
          new HttpAuthenticationRequiredError(),

        status:
          401,

        code:
          "AUTHENTICATION_REQUIRED",
      },
      {
        error:
          new HttpAccessDeniedError(),

        status:
          403,

        code:
          "ACCESS_DENIED",
      },
      {
        error:
          new InvalidHttpOrganizationContextError(),

        status:
          400,

        code:
          "INVALID_ORGANIZATION_CONTEXT",
      },
    ]

    for (const item of cases) {
      const response =
        httpAuthErrorResponse(
          item.error,
        )

      assert.ok(
        response,
      )

      assert.equal(
        response.status,
        item.status,
      )

      assert.equal(
        response.headers.get(
          "cache-control",
        ),
        "no-store, max-age=0",
      )

      const body =
        await response.json()

      assert.equal(
        body.error,
        item.code,
      )
    }

    assert.equal(
      httpAuthErrorResponse(
        new Error(
          "unexpected",
        ),
      ),
      null,
    )
  },
)
