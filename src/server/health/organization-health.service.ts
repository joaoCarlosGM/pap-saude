import {
  OrganizationHealthAlertSeverity,
  OrganizationHealthAlertStatus,
  OrganizationHealthAlertType,
  Prisma,
} from "@prisma/client"

import { db } from "@/server/db/client"

import {
  calculateOrganizationMetrics,
} from "@/server/analytics/organization-metrics.service"

import {
  getProductFeedbackSummary,
} from "@/server/feedback/feedback.service"

import {
  InvalidOrganizationHealthAlertTransitionError,
  InvalidOrganizationHealthPeriodError,
  OrganizationHealthAlertNotFoundError,
} from "./organization-health.errors"

import {
  DEFAULT_ORGANIZATION_HEALTH_THRESHOLDS,
  type OrganizationHealthThresholds,
} from "./organization-health.types"

type AlertCandidate = {
  type: OrganizationHealthAlertType
  severity: OrganizationHealthAlertSeverity
  title: string
  message: string
  observedValue: number
  thresholdValue: number
  details?: Prisma.InputJsonValue
}

function validatePeriod(
  periodStart: Date,
  periodEnd: Date,
) {
  if (
    Number.isNaN(periodStart.getTime()) ||
    Number.isNaN(periodEnd.getTime()) ||
    periodEnd <= periodStart
  ) {
    throw new InvalidOrganizationHealthPeriodError()
  }
}

async function findActiveAlert(
  organizationId: string,
  type: OrganizationHealthAlertType,
) {
  return db.organizationHealthAlert.findFirst({
    where: {
      organizationId,
      type,
      status: {
        in: [
          OrganizationHealthAlertStatus.OPEN,
          OrganizationHealthAlertStatus.ACKNOWLEDGED,
        ],
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  })
}

async function upsertActiveAlert(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  candidate: AlertCandidate,
) {
  const existing =
    await findActiveAlert(
      organizationId,
      candidate.type,
    )

  if (existing) {
    return db.organizationHealthAlert.update({
      where: {
        id: existing.id,
      },

      data: {
        severity:
          candidate.severity,

        title:
          candidate.title,

        message:
          candidate.message,

        observedValue:
          candidate.observedValue,

        thresholdValue:
          candidate.thresholdValue,

        periodStart,
        periodEnd,

        details:
          candidate.details,

        lastDetectedAt:
          new Date(),
      },
    })
  }

  return db.organizationHealthAlert.create({
    data: {
      organizationId,

      type:
        candidate.type,

      severity:
        candidate.severity,

      status:
        OrganizationHealthAlertStatus.OPEN,

      title:
        candidate.title,

      message:
        candidate.message,

      observedValue:
        candidate.observedValue,

      thresholdValue:
        candidate.thresholdValue,

      periodStart,
      periodEnd,

      details:
        candidate.details,

      firstDetectedAt:
        new Date(),

      lastDetectedAt:
        new Date(),
    },
  })
}

async function resolveActiveAlert(
  organizationId: string,
  type: OrganizationHealthAlertType,
) {
  const existing =
    await findActiveAlert(
      organizationId,
      type,
    )

  if (!existing) {
    return null
  }

  return db.organizationHealthAlert.update({
    where: {
      id: existing.id,
    },

    data: {
      status:
        OrganizationHealthAlertStatus.RESOLVED,

      resolvedAt:
        new Date(),
    },
  })
}

export async function evaluateOrganizationHealth(
  input: {
    organizationId: string
    periodStart: Date
    periodEnd: Date
    thresholds?: Partial<OrganizationHealthThresholds>
  },
) {
  validatePeriod(
    input.periodStart,
    input.periodEnd,
  )

  const thresholds = {
    ...DEFAULT_ORGANIZATION_HEALTH_THRESHOLDS,
    ...input.thresholds,
  }

  const [
    metrics,
    feedback,
  ] = await Promise.all([
    calculateOrganizationMetrics({
      organizationId:
        input.organizationId,

      periodStart:
        input.periodStart,

      periodEnd:
        input.periodEnd,
    }),

    getProductFeedbackSummary({
      organizationId:
        input.organizationId,

      from:
        input.periodStart,

      to:
        input.periodEnd,
    }),
  ])

  const candidates =
    new Map<
      OrganizationHealthAlertType,
      AlertCandidate
    >()

  if (
    metrics.eventCount <
    thresholds.minimumEvents
  ) {
    candidates.set(
      OrganizationHealthAlertType.LOW_ACTIVITY,
      {
        type:
          OrganizationHealthAlertType.LOW_ACTIVITY,

        severity:
          OrganizationHealthAlertSeverity.WARNING,

        title:
          "Baixa atividade da organização",

        message:
          "A organização apresentou atividade abaixo do mínimo esperado no período.",

        observedValue:
          metrics.eventCount,

        thresholdValue:
          thresholds.minimumEvents,

        details: {
          activeUsers:
            metrics.activeUsers,
        },
      },
    )
  }

  if (
    feedback.ratedCount >=
      thresholds.minimumRatings &&
    feedback.averageSatisfaction != null &&
    feedback.averageSatisfaction <=
      thresholds.maximumAverageSatisfaction
  ) {
    candidates.set(
      OrganizationHealthAlertType.LOW_SATISFACTION,
      {
        type:
          OrganizationHealthAlertType.LOW_SATISFACTION,

        severity:
          feedback.averageSatisfaction <=
          thresholds.criticalAverageSatisfaction
            ? OrganizationHealthAlertSeverity.CRITICAL
            : OrganizationHealthAlertSeverity.WARNING,

        title:
          "Baixa satisfação dos usuários",

        message:
          "A média de satisfação ficou abaixo do limite configurado.",

        observedValue:
          feedback.averageSatisfaction,

        thresholdValue:
          thresholds.maximumAverageSatisfaction,

        details: {
          ratedCount:
            feedback.ratedCount,
        },
      },
    )
  }

  const backlog =
    feedback.open +
    feedback.triaged +
    feedback.inProgress

  if (
    backlog >=
    thresholds.feedbackBacklogWarning
  ) {
    candidates.set(
      OrganizationHealthAlertType.FEEDBACK_BACKLOG,
      {
        type:
          OrganizationHealthAlertType.FEEDBACK_BACKLOG,

        severity:
          backlog >=
          thresholds.feedbackBacklogCritical
            ? OrganizationHealthAlertSeverity.CRITICAL
            : OrganizationHealthAlertSeverity.WARNING,

        title:
          "Acúmulo de feedback pendente",

        message:
          "A organização possui volume elevado de feedback ainda não encerrado.",

        observedValue:
          backlog,

        thresholdValue:
          thresholds.feedbackBacklogWarning,

        details: {
          open:
            feedback.open,

          triaged:
            feedback.triaged,

          inProgress:
            feedback.inProgress,
        },
      },
    )
  }

  const allTypes = [
    OrganizationHealthAlertType.LOW_ACTIVITY,
    OrganizationHealthAlertType.LOW_SATISFACTION,
    OrganizationHealthAlertType.FEEDBACK_BACKLOG,
  ]

  const results = []

  for (const type of allTypes) {
    const candidate =
      candidates.get(type)

    if (candidate) {
      results.push(
        await upsertActiveAlert(
          input.organizationId,
          input.periodStart,
          input.periodEnd,
          candidate,
        ),
      )

      continue
    }

    const resolved =
      await resolveActiveAlert(
        input.organizationId,
        type,
      )

    if (resolved) {
      results.push(resolved)
    }
  }

  return {
    organizationId:
      input.organizationId,

    periodStart:
      input.periodStart,

    periodEnd:
      input.periodEnd,

    metrics,
    feedback,

    alerts:
      results,
  }
}

export async function acknowledgeOrganizationHealthAlert(
  alertId: string,
) {
  const alert =
    await db.organizationHealthAlert.findUnique({
      where: {
        id: alertId,
      },
    })

  if (!alert) {
    throw new OrganizationHealthAlertNotFoundError()
  }

  if (
    alert.status !==
    OrganizationHealthAlertStatus.OPEN
  ) {
    throw new InvalidOrganizationHealthAlertTransitionError(
      alert.status,
      OrganizationHealthAlertStatus.ACKNOWLEDGED,
    )
  }

  return db.organizationHealthAlert.update({
    where: {
      id: alert.id,
    },

    data: {
      status:
        OrganizationHealthAlertStatus.ACKNOWLEDGED,

      acknowledgedAt:
        new Date(),
    },
  })
}

export async function resolveOrganizationHealthAlert(
  alertId: string,
) {
  const alert =
    await db.organizationHealthAlert.findUnique({
      where: {
        id: alertId,
      },
    })

  if (!alert) {
    throw new OrganizationHealthAlertNotFoundError()
  }

  if (
    alert.status ===
    OrganizationHealthAlertStatus.RESOLVED
  ) {
    throw new InvalidOrganizationHealthAlertTransitionError(
      alert.status,
      OrganizationHealthAlertStatus.RESOLVED,
    )
  }

  return db.organizationHealthAlert.update({
    where: {
      id: alert.id,
    },

    data: {
      status:
        OrganizationHealthAlertStatus.RESOLVED,

      resolvedAt:
        new Date(),
    },
  })
}

export async function listOrganizationHealthAlerts(
  input: {
    organizationId: string
    status?: OrganizationHealthAlertStatus
    take?: number
  },
) {
  const take =
    Math.min(
      Math.max(
        input.take ?? 100,
        1,
      ),
      500,
    )

  return db.organizationHealthAlert.findMany({
    where: {
      organizationId:
        input.organizationId,

      status:
        input.status,
    },

    orderBy: [
      {
        severity:
          "desc",
      },
      {
        lastDetectedAt:
          "desc",
      },
    ],

    take,
  })
}
