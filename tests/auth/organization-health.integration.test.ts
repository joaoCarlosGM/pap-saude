import assert from "node:assert/strict"

import {
  after,
  before,
  beforeEach,
  test,
} from "node:test"

import {
  OrganizationHealthAlertSeverity,
  OrganizationHealthAlertStatus,
  OrganizationHealthAlertType,
  OrganizationStatus,
  OrganizationType,
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
} from "@prisma/client"

import { db } from "../../src/server/db/client"

import {
  recordProductActivity,
} from "../../src/server/activity/activity.service"

import {
  submitProductFeedback,
} from "../../src/server/feedback/feedback.service"

import {
  acknowledgeOrganizationHealthAlert,
  evaluateOrganizationHealth,
  resolveOrganizationHealthAlert,
} from "../../src/server/health/organization-health.service"

import {
  InvalidOrganizationHealthAlertTransitionError,
  InvalidOrganizationHealthPeriodError,
} from "../../src/server/health/organization-health.errors"

const EXPECTED_DATABASE =
  "pap_saude_f02b_test"

const periodStart =
  new Date(
    "2026-10-01T00:00:00.000Z",
  )

const periodEnd =
  new Date(
    "2026-10-02T00:00:00.000Z",
  )

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
  await db.organization.deleteMany()
  await db.user.deleteMany()
}

async function createOrganization(
  name = "Health Test Organization",
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

async function submitRating(
  organizationId: string,
  score: number,
) {
  const feedback =
    await submitProductFeedback({
      organizationId,

      category:
        ProductFeedbackCategory.USABILITY,

      source:
        ProductFeedbackSource.WEB,

      satisfactionScore:
        score,
    })

  return db.productFeedback.update({
    where: {
      id: feedback.id,
    },

    data: {
      createdAt:
        new Date(
          "2026-10-01T12:00:00.000Z",
        ),
    },
  })
}

async function createOpenFeedback(
  organizationId: string,
  count: number,
) {
  for (
    let index = 0;
    index < count;
    index++
  ) {
    const feedback =
      await submitProductFeedback({
        organizationId,

        category:
          ProductFeedbackCategory.SUPPORT,

        source:
          ProductFeedbackSource.WEB,
      })

    await db.productFeedback.update({
      where: {
        id: feedback.id,
      },

      data: {
        createdAt:
          new Date(
            periodStart.getTime() +
              60_000 +
              index * 1000,
          ),
      },
    })
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
  "creates low activity warning",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,

            status:
              OrganizationHealthAlertStatus
                .OPEN,
          },
        })

    assert.equal(
      alert.severity,
      OrganizationHealthAlertSeverity
        .WARNING,
    )

    assert.equal(
      alert.observedValue,
      0,
    )

    assert.equal(
      alert.thresholdValue,
      1,
    )
  },
)

test(
  "does not create low activity alert when activity is healthy",
  async () => {
    const organization =
      await createOrganization()

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T12:00:00.000Z",
        ),
    })

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const count =
      await db.organizationHealthAlert.count({
        where: {
          organizationId:
            organization.id,

          type:
            OrganizationHealthAlertType
              .LOW_ACTIVITY,
        },
      })

    assert.equal(
      count,
      0,
    )
  },
)

test(
  "creates low satisfaction warning",
  async () => {
    const organization =
      await createOrganization()

    await submitRating(
      organization.id,
      2,
    )

    await submitRating(
      organization.id,
      2,
    )

    await submitRating(
      organization.id,
      2,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
      },
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_SATISFACTION,

            status:
              OrganizationHealthAlertStatus
                .OPEN,
          },
        })

    assert.equal(
      alert.severity,
      OrganizationHealthAlertSeverity
        .WARNING,
    )

    assert.equal(
      alert.observedValue,
      2,
    )
  },
)

test(
  "creates critical low satisfaction alert",
  async () => {
    const organization =
      await createOrganization()

    await submitRating(
      organization.id,
      1,
    )

    await submitRating(
      organization.id,
      1,
    )

    await submitRating(
      organization.id,
      1,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
      },
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_SATISFACTION,
          },
        })

    assert.equal(
      alert.severity,
      OrganizationHealthAlertSeverity
        .CRITICAL,
    )
  },
)

test(
  "creates feedback backlog warning",
  async () => {
    const organization =
      await createOrganization()

    await createOpenFeedback(
      organization.id,
      5,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
        minimumRatings: 100,
      },
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .FEEDBACK_BACKLOG,
          },
        })

    assert.equal(
      alert.severity,
      OrganizationHealthAlertSeverity
        .WARNING,
    )

    assert.equal(
      alert.observedValue,
      5,
    )
  },
)

test(
  "creates critical feedback backlog alert",
  async () => {
    const organization =
      await createOrganization()

    await createOpenFeedback(
      organization.id,
      10,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
        minimumRatings: 100,
      },
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .FEEDBACK_BACKLOG,
          },
        })

    assert.equal(
      alert.severity,
      OrganizationHealthAlertSeverity
        .CRITICAL,
    )

    assert.equal(
      alert.observedValue,
      10,
    )
  },
)

test(
  "reevaluation updates the active alert instead of duplicating it",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const first =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,
          },
        })

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 5,
      },
    })

    const activeAlerts =
      await db.organizationHealthAlert
        .findMany({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,

            status: {
              in: [
                OrganizationHealthAlertStatus
                  .OPEN,

                OrganizationHealthAlertStatus
                  .ACKNOWLEDGED,
              ],
            },
          },
        })

    assert.equal(
      activeAlerts.length,
      1,
    )

    assert.equal(
      activeAlerts[0]?.id,
      first.id,
    )

    assert.equal(
      activeAlerts[0]?.thresholdValue,
      5,
    )
  },
)

test(
  "automatically resolves alert when condition normalizes",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T08:00:00.000Z",
        ),
    })

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,
          },
        })

    assert.equal(
      alert.status,
      OrganizationHealthAlertStatus
        .RESOLVED,
    )

    assert.ok(
      alert.resolvedAt,
    )
  },
)

test(
  "acknowledges open organization health alert",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,
          },
        })

    const acknowledged =
      await acknowledgeOrganizationHealthAlert(
        alert.id,
      )

    assert.equal(
      acknowledged.status,
      OrganizationHealthAlertStatus
        .ACKNOWLEDGED,
    )

    assert.ok(
      acknowledged.acknowledgedAt,
    )
  },
)

test(
  "rejects acknowledging an alert twice",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,
          },
        })

    await acknowledgeOrganizationHealthAlert(
      alert.id,
    )

    await assert.rejects(
      () =>
        acknowledgeOrganizationHealthAlert(
          alert.id,
        ),

      InvalidOrganizationHealthAlertTransitionError,
    )
  },
)

test(
  "manually resolves active health alert",
  async () => {
    const organization =
      await createOrganization()

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,
    })

    const alert =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .LOW_ACTIVITY,
          },
        })

    const resolved =
      await resolveOrganizationHealthAlert(
        alert.id,
      )

    assert.equal(
      resolved.status,
      OrganizationHealthAlertStatus
        .RESOLVED,
    )

    assert.ok(
      resolved.resolvedAt,
    )
  },
)

test(
  "rejects invalid health evaluation period",
  async () => {
    const organization =
      await createOrganization()

    await assert.rejects(
      () =>
        evaluateOrganizationHealth({
          organizationId:
            organization.id,

          periodStart:
            new Date(
              "2026-10-02T00:00:00.000Z",
            ),

          periodEnd:
            new Date(
              "2026-10-01T00:00:00.000Z",
            ),
        }),

      InvalidOrganizationHealthPeriodError,
    )
  },
)

test(
  "resolved backlog alert can be created again after recurrence",
  async () => {
    const organization =
      await createOrganization()

    await createOpenFeedback(
      organization.id,
      5,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
        minimumRatings: 100,
      },
    })

    const first =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .FEEDBACK_BACKLOG,

            status:
              OrganizationHealthAlertStatus
                .OPEN,
          },
        })

    await db.productFeedback.updateMany({
      where: {
        organizationId:
          organization.id,
      },

      data: {
        status:
          ProductFeedbackStatus.RESOLVED,

        resolvedAt:
          new Date(),
      },
    })

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
        minimumRatings: 100,
      },
    })

    const resolvedFirst =
      await db.organizationHealthAlert
        .findUniqueOrThrow({
          where: {
            id:
              first.id,
          },
        })

    assert.equal(
      resolvedFirst.status,
      OrganizationHealthAlertStatus
        .RESOLVED,
    )

    await createOpenFeedback(
      organization.id,
      5,
    )

    await evaluateOrganizationHealth({
      organizationId:
        organization.id,

      periodStart,
      periodEnd,

      thresholds: {
        minimumEvents: 0,
        minimumRatings: 100,
      },
    })

    const active =
      await db.organizationHealthAlert
        .findFirstOrThrow({
          where: {
            organizationId:
              organization.id,

            type:
              OrganizationHealthAlertType
                .FEEDBACK_BACKLOG,

            status:
              OrganizationHealthAlertStatus
                .OPEN,
          },
        })

    assert.notEqual(
      active.id,
      first.id,
    )
  },
)
