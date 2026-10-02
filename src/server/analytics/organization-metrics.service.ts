import {
  Prisma,
} from "@prisma/client"

import { db } from "@/server/db/client"

import {
  PRODUCT_ACTIVITY_EVENTS,
} from "@/server/activity/activity-events"

import {
  InvalidOrganizationMetricsPeriodError,
  OrganizationMetricsOrganizationNotFoundError,
  OrganizationMetricsPeriodTooLargeError,
} from "./organization-metrics.errors"

import {
  type OrganizationFeatureUsage,
  type OrganizationMetrics,
} from "./organization-metrics.types"

const MAX_PERIOD_MS =
  366 * 24 * 60 * 60 * 1000

function validatePeriod(
  periodStart: Date,
  periodEnd: Date,
) {
  if (
    Number.isNaN(
      periodStart.getTime(),
    ) ||
    Number.isNaN(
      periodEnd.getTime(),
    ) ||
    periodEnd <= periodStart
  ) {
    throw new InvalidOrganizationMetricsPeriodError()
  }

  if (
    periodEnd.getTime() -
      periodStart.getTime() >
    MAX_PERIOD_MS
  ) {
    throw new OrganizationMetricsPeriodTooLargeError()
  }
}

async function assertOrganizationExists(
  organizationId: string,
) {
  const organization =
    await db.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
      },
    })

  if (!organization) {
    throw new OrganizationMetricsOrganizationNotFoundError()
  }
}

function countEvent(
  featureUsage: OrganizationFeatureUsage,
  eventKey: string,
) {
  return featureUsage[eventKey] ?? 0
}

export async function calculateOrganizationMetrics(
  input: {
    organizationId: string
    periodStart: Date
    periodEnd: Date
  },
): Promise<OrganizationMetrics> {
  validatePeriod(
    input.periodStart,
    input.periodEnd,
  )

  await assertOrganizationExists(
    input.organizationId,
  )

  const where:
    Prisma.ProductActivityEventWhereInput = {
      organizationId:
        input.organizationId,

      occurredAt: {
        gte:
          input.periodStart,
        lt:
          input.periodEnd,
      },
    }

  const [
    eventCount,
    activeActorRows,
    groupedEvents,
  ] = await Promise.all([
    db.productActivityEvent.count({
      where,
    }),

    db.productActivityEvent.findMany({
      where: {
        ...where,
        actorUserId: {
          not: null,
        },
      },

      select: {
        actorUserId: true,
      },

      distinct: [
        "actorUserId",
      ],
    }),

    db.productActivityEvent.groupBy({
      by: [
        "eventKey",
      ],

      where,

      _count: {
        _all: true,
      },
    }),
  ])

  const featureUsage:
    OrganizationFeatureUsage =
      Object.fromEntries(
        groupedEvents.map(
          (group) => [
            group.eventKey,
            group._count._all,
          ],
        ),
      )

  return {
    organizationId:
      input.organizationId,

    periodStart:
      input.periodStart,

    periodEnd:
      input.periodEnd,

    eventCount,

    activeUsers:
      activeActorRows.length,

    dashboardViews:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .DASHBOARD_VIEWED,
      ),

    patientSearches:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .PATIENT_SEARCH_USED,
      ),

    encountersStarted:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .ENCOUNTER_STARTED,
      ),

    encountersCompleted:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .ENCOUNTER_COMPLETED,
      ),

    feedbackOpened:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .FEEDBACK_OPENED,
      ),

    organizationSwitches:
      countEvent(
        featureUsage,
        PRODUCT_ACTIVITY_EVENTS
          .ORGANIZATION_SWITCHED,
      ),

    featureUsage,
  }
}

export async function generateOrganizationMetricSnapshot(
  input: {
    organizationId: string
    periodStart: Date
    periodEnd: Date
  },
) {
  const metrics =
    await calculateOrganizationMetrics(
      input,
    )

  const featureUsage =
    metrics.featureUsage as
      Prisma.InputJsonValue

  return db.organizationMetricSnapshot.upsert({
    where: {
      organizationId_periodStart_periodEnd: {
        organizationId:
          metrics.organizationId,

        periodStart:
          metrics.periodStart,

        periodEnd:
          metrics.periodEnd,
      },
    },

    create: {
      organizationId:
        metrics.organizationId,

      periodStart:
        metrics.periodStart,

      periodEnd:
        metrics.periodEnd,

      eventCount:
        metrics.eventCount,

      activeUsers:
        metrics.activeUsers,

      dashboardViews:
        metrics.dashboardViews,

      patientSearches:
        metrics.patientSearches,

      encountersStarted:
        metrics.encountersStarted,

      encountersCompleted:
        metrics.encountersCompleted,

      feedbackOpened:
        metrics.feedbackOpened,

      organizationSwitches:
        metrics.organizationSwitches,

      featureUsage,

      generatedAt:
        new Date(),
    },

    update: {
      eventCount:
        metrics.eventCount,

      activeUsers:
        metrics.activeUsers,

      dashboardViews:
        metrics.dashboardViews,

      patientSearches:
        metrics.patientSearches,

      encountersStarted:
        metrics.encountersStarted,

      encountersCompleted:
        metrics.encountersCompleted,

      feedbackOpened:
        metrics.feedbackOpened,

      organizationSwitches:
        metrics.organizationSwitches,

      featureUsage,

      generatedAt:
        new Date(),
    },
  })
}

export async function listOrganizationMetricSnapshots(
  input: {
    organizationId: string
    from?: Date
    to?: Date
    take?: number
  },
) {
  await assertOrganizationExists(
    input.organizationId,
  )

  const take =
    Math.min(
      Math.max(
        input.take ?? 90,
        1,
      ),
      366,
    )

  return db.organizationMetricSnapshot.findMany({
    where: {
      organizationId:
        input.organizationId,

      periodStart:
        input.from || input.to
          ? {
              gte:
                input.from,
              lt:
                input.to,
            }
          : undefined,
    },

    orderBy: {
      periodStart:
        "desc",
    },

    take,
  })
}
