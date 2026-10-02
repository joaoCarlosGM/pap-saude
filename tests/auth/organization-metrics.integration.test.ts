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
} from "@prisma/client"

import { db } from "../../src/server/db/client"

import {
  PRODUCT_ACTIVITY_EVENTS,
} from "../../src/server/activity/activity-events"

import {
  recordProductActivity,
} from "../../src/server/activity/activity.service"

import {
  InvalidOrganizationMetricsPeriodError,
  OrganizationMetricsOrganizationNotFoundError,
  OrganizationMetricsPeriodTooLargeError,
} from "../../src/server/analytics/organization-metrics.errors"

import {
  calculateOrganizationMetrics,
  generateOrganizationMetricSnapshot,
  listOrganizationMetricSnapshots,
} from "../../src/server/analytics/organization-metrics.service"

import {
  utcDayPeriod,
} from "../../src/server/analytics/snapshot-period"

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
  "calculates organization metrics for a period",
  async () => {
    const organization =
      await createOrganization()

    const userA =
      await createUser(
        "metrics-a@example.test",
      )

    const userB =
      await createUser(
        "metrics-b@example.test",
      )

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    await recordProductActivity({
      eventKey:
        PRODUCT_ACTIVITY_EVENTS
          .DASHBOARD_VIEWED,

      actorUserId:
        userA.id,

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T01:00:00.000Z",
        ),
    })

    await recordProductActivity({
      eventKey:
        PRODUCT_ACTIVITY_EVENTS
          .DASHBOARD_VIEWED,

      actorUserId:
        userA.id,

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T02:00:00.000Z",
        ),
    })

    await recordProductActivity({
      eventKey:
        PRODUCT_ACTIVITY_EVENTS
          .PATIENT_SEARCH_USED,

      actorUserId:
        userB.id,

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T03:00:00.000Z",
        ),
    })

    const metrics =
      await calculateOrganizationMetrics({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      metrics.eventCount,
      3,
    )

    assert.equal(
      metrics.activeUsers,
      2,
    )

    assert.equal(
      metrics.dashboardViews,
      2,
    )

    assert.equal(
      metrics.patientSearches,
      1,
    )
  },
)

test(
  "uses half-open time interval",
  async () => {
    const organization =
      await createOrganization()

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organization.id,

      occurredAt:
        periodStart,
    })

    await recordProductActivity({
      eventKey:
        "feedback.opened",

      organizationId:
        organization.id,

      occurredAt:
        periodEnd,
    })

    const metrics =
      await calculateOrganizationMetrics({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      metrics.eventCount,
      1,
    )

    assert.equal(
      metrics.dashboardViews,
      1,
    )

    assert.equal(
      metrics.feedbackOpened,
      0,
    )
  },
)

test(
  "counts distinct active users",
  async () => {
    const organization =
      await createOrganization()

    const user =
      await createUser(
        "distinct-user@example.test",
      )

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    for (let index = 0; index < 5; index++) {
      await recordProductActivity({
        eventKey:
          "dashboard.viewed",

        actorUserId:
          user.id,

        organizationId:
          organization.id,

        occurredAt:
          new Date(
            periodStart.getTime() +
              index * 1000,
          ),
      })
    }

    const metrics =
      await calculateOrganizationMetrics({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      metrics.eventCount,
      5,
    )

    assert.equal(
      metrics.activeUsers,
      1,
    )
  },
)

test(
  "does not mix metrics from another organization",
  async () => {
    const organizationA =
      await createOrganization(
        "Organization A",
      )

    const organizationB =
      await createOrganization(
        "Organization B",
      )

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organizationA.id,

      occurredAt:
        new Date(
          "2026-10-01T10:00:00.000Z",
        ),
    })

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organizationB.id,

      occurredAt:
        new Date(
          "2026-10-01T11:00:00.000Z",
        ),
    })

    const metrics =
      await calculateOrganizationMetrics({
        organizationId:
          organizationA.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      metrics.eventCount,
      1,
    )
  },
)

test(
  "builds feature usage map",
  async () => {
    const organization =
      await createOrganization()

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    await recordProductActivity({
      eventKey:
        "custom.feature.used",

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T12:00:00.000Z",
        ),
    })

    await recordProductActivity({
      eventKey:
        "custom.feature.used",

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T13:00:00.000Z",
        ),
    })

    const metrics =
      await calculateOrganizationMetrics({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      metrics.featureUsage[
        "custom.feature.used"
      ],
      2,
    )
  },
)

test(
  "rejects invalid period",
  async () => {
    const organization =
      await createOrganization()

    await assert.rejects(
      () =>
        calculateOrganizationMetrics({
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

      InvalidOrganizationMetricsPeriodError,
    )
  },
)

test(
  "rejects excessively large period",
  async () => {
    const organization =
      await createOrganization()

    await assert.rejects(
      () =>
        calculateOrganizationMetrics({
          organizationId:
            organization.id,

          periodStart:
            new Date(
              "2025-01-01T00:00:00.000Z",
            ),

          periodEnd:
            new Date(
              "2026-10-01T00:00:00.000Z",
            ),
        }),

      OrganizationMetricsPeriodTooLargeError,
    )
  },
)

test(
  "rejects unknown organization",
  async () => {
    await assert.rejects(
      () =>
        calculateOrganizationMetrics({
          organizationId:
            "00000000-0000-0000-0000-000000000001",

          periodStart:
            new Date(
              "2026-10-01T00:00:00.000Z",
            ),

          periodEnd:
            new Date(
              "2026-10-02T00:00:00.000Z",
            ),
        }),

      OrganizationMetricsOrganizationNotFoundError,
    )
  },
)

test(
  "creates organization metric snapshot",
  async () => {
    const organization =
      await createOrganization()

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organization.id,

      occurredAt:
        new Date(
          "2026-10-01T05:00:00.000Z",
        ),
    })

    const snapshot =
      await generateOrganizationMetricSnapshot({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      snapshot.eventCount,
      1,
    )

    assert.equal(
      snapshot.dashboardViews,
      1,
    )
  },
)

test(
  "snapshot generation is idempotent for the same period",
  async () => {
    const organization =
      await createOrganization()

    const periodStart =
      new Date(
        "2026-10-01T00:00:00.000Z",
      )

    const periodEnd =
      new Date(
        "2026-10-02T00:00:00.000Z",
      )

    const first =
      await generateOrganizationMetricSnapshot({
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
          "2026-10-01T06:00:00.000Z",
        ),
    })

    const second =
      await generateOrganizationMetricSnapshot({
        organizationId:
          organization.id,

        periodStart,
        periodEnd,
      })

    assert.equal(
      first.id,
      second.id,
    )

    assert.equal(
      second.eventCount,
      1,
    )

    assert.equal(
      await db.organizationMetricSnapshot.count(),
      1,
    )
  },
)

test(
  "lists snapshots newest first",
  async () => {
    const organization =
      await createOrganization()

    await generateOrganizationMetricSnapshot({
      organizationId:
        organization.id,

      periodStart:
        new Date(
          "2026-10-01T00:00:00.000Z",
        ),

      periodEnd:
        new Date(
          "2026-10-02T00:00:00.000Z",
        ),
    })

    await generateOrganizationMetricSnapshot({
      organizationId:
        organization.id,

      periodStart:
        new Date(
          "2026-10-02T00:00:00.000Z",
        ),

      periodEnd:
        new Date(
          "2026-10-03T00:00:00.000Z",
        ),
    })

    const snapshots =
      await listOrganizationMetricSnapshots({
        organizationId:
          organization.id,
      })

    assert.equal(
      snapshots.length,
      2,
    )

    assert.equal(
      snapshots[0]?.periodStart.toISOString(),
      "2026-10-02T00:00:00.000Z",
    )
  },
)

test(
  "utcDayPeriod creates exact UTC day boundaries",
  () => {
    const period =
      utcDayPeriod(
        new Date(
          "2026-10-02T18:30:45.000Z",
        ),
      )

    assert.equal(
      period.periodStart.toISOString(),
      "2026-10-02T00:00:00.000Z",
    )

    assert.equal(
      period.periodEnd.toISOString(),
      "2026-10-03T00:00:00.000Z",
    )
  },
)
