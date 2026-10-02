import assert from "node:assert/strict"

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test"

import {
  OrganizationStatus,
  OrganizationType,
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
} from "@prisma/client"

import { db } from "../../src/server/db/client"

import {
  InvalidProductFeedbackScoreError,
  InvalidProductFeedbackTransitionError,
  ProductFeedbackActorNotFoundError,
  ProductFeedbackOrganizationNotFoundError,
  ProductFeedbackResolverNotFoundError,
} from "../../src/server/feedback/feedback.errors"

import {
  dismissProductFeedback,
  getProductFeedbackSummary,
  listProductFeedback,
  resolveProductFeedback,
  startProductFeedback,
  submitProductFeedback,
  triageProductFeedback,
} from "../../src/server/feedback/feedback.service"

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
  await db.productFeedback.deleteMany()
  await db.organizationMetricSnapshot.deleteMany()
  await db.productActivityEvent.deleteMany()
  await db.organization.deleteMany()
  await db.user.deleteMany()
}

async function createOrganization(
  name = "PAP Saúde",
) {
  return db.organization.create({
    data: {
      type:
        OrganizationType.PAP,
      status:
        OrganizationStatus.ACTIVE,
      name,
      isActive:
        true,
    },
  })
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
  "submits product feedback",
  async () => {
    const organization =
      await createOrganization()

    const user =
      await createUser(
        "feedback@example.test",
      )

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        actorUserId:
          user.id,

        category:
          ProductFeedbackCategory.USABILITY,

        source:
          ProductFeedbackSource.WEB,

        satisfactionScore:
          4,

        message:
          "Fluxo simples e claro.",
      })

    assert.equal(
      feedback.status,
      ProductFeedbackStatus.OPEN,
    )

    assert.equal(
      feedback.satisfactionScore,
      4,
    )

    assert.equal(
      feedback.actorUserId,
      user.id,
    )
  },
)

test(
  "allows anonymous feedback",
  async () => {
    const organization =
      await createOrganization()

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.OTHER,

        source:
          ProductFeedbackSource.MOBILE,

        satisfactionScore:
          5,
      })

    assert.equal(
      feedback.actorUserId,
      null,
    )
  },
)

test(
  "rejects score outside 1 to 5",
  async () => {
    const organization =
      await createOrganization()

    await assert.rejects(
      () =>
        submitProductFeedback({
          organizationId:
            organization.id,

          category:
            ProductFeedbackCategory.BUG,

          source:
            ProductFeedbackSource.WEB,

          satisfactionScore:
            6,
        }),

      InvalidProductFeedbackScoreError,
    )
  },
)

test(
  "rejects unknown organization",
  async () => {
    await assert.rejects(
      () =>
        submitProductFeedback({
          organizationId:
            "00000000-0000-0000-0000-000000000001",

          category:
            ProductFeedbackCategory.SUPPORT,

          source:
            ProductFeedbackSource.WEB,
        }),

      ProductFeedbackOrganizationNotFoundError,
    )
  },
)

test(
  "rejects unknown actor",
  async () => {
    const organization =
      await createOrganization()

    await assert.rejects(
      () =>
        submitProductFeedback({
          organizationId:
            organization.id,

          actorUserId:
            "00000000-0000-0000-0000-000000000001",

          category:
            ProductFeedbackCategory.SUPPORT,

          source:
            ProductFeedbackSource.WEB,
        }),

      ProductFeedbackActorNotFoundError,
    )
  },
)

test(
  "triages open feedback",
  async () => {
    const organization =
      await createOrganization()

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.BUG,

        source:
          ProductFeedbackSource.WEB,
      })

    const triaged =
      await triageProductFeedback(
        feedback.id,
      )

    assert.equal(
      triaged.status,
      ProductFeedbackStatus.TRIAGED,
    )

    assert.ok(
      triaged.triagedAt,
    )
  },
)

test(
  "starts triaged feedback",
  async () => {
    const organization =
      await createOrganization()

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.BUG,

        source:
          ProductFeedbackSource.WEB,
      })

    await triageProductFeedback(
      feedback.id,
    )

    const started =
      await startProductFeedback(
        feedback.id,
      )

    assert.equal(
      started.status,
      ProductFeedbackStatus.IN_PROGRESS,
    )

    assert.ok(
      started.startedAt,
    )
  },
)

test(
  "rejects invalid workflow transition",
  async () => {
    const organization =
      await createOrganization()

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.BUG,

        source:
          ProductFeedbackSource.WEB,
      })

    await assert.rejects(
      () =>
        startProductFeedback(
          feedback.id,
        ),

      InvalidProductFeedbackTransitionError,
    )
  },
)

test(
  "resolves triaged feedback",
  async () => {
    const organization =
      await createOrganization()

    const resolver =
      await createUser(
        "resolver@example.test",
      )

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.FEATURE_REQUEST,

        source:
          ProductFeedbackSource.WEB,
      })

    await triageProductFeedback(
      feedback.id,
    )

    const resolved =
      await resolveProductFeedback({
        feedbackId:
          feedback.id,

        resolvedByUserId:
          resolver.id,

        resolutionNote:
          "Solicitação analisada.",
      })

    assert.equal(
      resolved.status,
      ProductFeedbackStatus.RESOLVED,
    )

    assert.equal(
      resolved.resolvedByUserId,
      resolver.id,
    )

    assert.ok(
      resolved.resolvedAt,
    )
  },
)

test(
  "rejects unknown resolver",
  async () => {
    const organization =
      await createOrganization()

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.BUG,

        source:
          ProductFeedbackSource.WEB,
      })

    await triageProductFeedback(
      feedback.id,
    )

    await assert.rejects(
      () =>
        resolveProductFeedback({
          feedbackId:
            feedback.id,

          resolvedByUserId:
            "00000000-0000-0000-0000-000000000001",
        }),

      ProductFeedbackResolverNotFoundError,
    )
  },
)

test(
  "dismisses open feedback",
  async () => {
    const organization =
      await createOrganization()

    const resolver =
      await createUser(
        "dismiss@example.test",
      )

    const feedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.OTHER,

        source:
          ProductFeedbackSource.ADMIN,
      })

    const dismissed =
      await dismissProductFeedback({
        feedbackId:
          feedback.id,

        resolvedByUserId:
          resolver.id,

        resolutionNote:
          "Duplicado.",
      })

    assert.equal(
      dismissed.status,
      ProductFeedbackStatus.DISMISSED,
    )

    assert.ok(
      dismissed.dismissedAt,
    )
  },
)

test(
  "lists feedback by status",
  async () => {
    const organization =
      await createOrganization()

    const openFeedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.BUG,

        source:
          ProductFeedbackSource.WEB,
      })

    const triagedFeedback =
      await submitProductFeedback({
        organizationId:
          organization.id,

        category:
          ProductFeedbackCategory.USABILITY,

        source:
          ProductFeedbackSource.WEB,
      })

    await triageProductFeedback(
      triagedFeedback.id,
    )

    const feedback =
      await listProductFeedback({
        organizationId:
          organization.id,

        status:
          ProductFeedbackStatus.OPEN,
      })

    assert.equal(
      feedback.length,
      1,
    )

    assert.equal(
      feedback[0]?.id,
      openFeedback.id,
    )
  },
)

test(
  "builds satisfaction summary",
  async () => {
    const organization =
      await createOrganization()

    await submitProductFeedback({
      organizationId:
        organization.id,

      category:
        ProductFeedbackCategory.BUG,

      source:
        ProductFeedbackSource.WEB,

      satisfactionScore:
        1,
    })

    await submitProductFeedback({
      organizationId:
        organization.id,

      category:
        ProductFeedbackCategory.USABILITY,

      source:
        ProductFeedbackSource.WEB,

      satisfactionScore:
        5,
    })

    await submitProductFeedback({
      organizationId:
        organization.id,

      category:
        ProductFeedbackCategory.USABILITY,

      source:
        ProductFeedbackSource.WEB,

      satisfactionScore:
        3,
    })

    const summary =
      await getProductFeedbackSummary({
        organizationId:
          organization.id,
      })

    assert.equal(
      summary.total,
      3,
    )

    assert.equal(
      summary.ratedCount,
      3,
    )

    assert.equal(
      summary.averageSatisfaction,
      3,
    )

    assert.equal(
      summary.scoreDistribution[1],
      1,
    )

    assert.equal(
      summary.scoreDistribution[3],
      1,
    )

    assert.equal(
      summary.scoreDistribution[5],
      1,
    )

    assert.equal(
      summary.categoryDistribution[
        ProductFeedbackCategory.USABILITY
      ],
      2,
    )
  },
)
