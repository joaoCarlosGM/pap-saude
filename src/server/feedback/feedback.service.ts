import {
  ProductFeedbackCategory,
  ProductFeedbackStatus,
} from "@prisma/client"

import { db } from "@/server/db/client"

import {
  InvalidProductFeedbackMessageError,
  InvalidProductFeedbackScoreError,
  InvalidProductFeedbackTransitionError,
  ProductFeedbackActorNotFoundError,
  ProductFeedbackNotFoundError,
  ProductFeedbackOrganizationNotFoundError,
  ProductFeedbackResolverNotFoundError,
} from "./feedback.errors"

import {
  type ProductFeedbackListQuery,
  type ProductFeedbackSummary,
  type SubmitProductFeedbackInput,
} from "./feedback.types"

const MAX_MESSAGE_LENGTH = 2000
const MAX_RESOLUTION_NOTE_LENGTH = 2000

function normalizeOptionalText(
  value:
    | string
    | null
    | undefined,
  maxLength: number,
  fieldName: string,
) {
  const normalized =
    value?.trim()

  if (!normalized) {
    return null
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw new InvalidProductFeedbackMessageError(
      `${fieldName} exceeds ${maxLength} characters.`,
    )
  }

  return normalized
}

function validateScore(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value == null
  ) {
    return null
  }

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new InvalidProductFeedbackScoreError()
  }

  return value
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
    throw new ProductFeedbackOrganizationNotFoundError()
  }
}

async function assertUserExists(
  userId: string,
  type:
    | "actor"
    | "resolver",
) {
  const user =
    await db.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    })

  if (user) {
    return
  }

  if (type === "actor") {
    throw new ProductFeedbackActorNotFoundError()
  }

  throw new ProductFeedbackResolverNotFoundError()
}

async function getFeedbackOrThrow(
  feedbackId: string,
) {
  const feedback =
    await db.productFeedback.findUnique({
      where: {
        id: feedbackId,
      },
    })

  if (!feedback) {
    throw new ProductFeedbackNotFoundError()
  }

  return feedback
}

export async function submitProductFeedback(
  input: SubmitProductFeedbackInput,
) {
  await assertOrganizationExists(
    input.organizationId,
  )

  if (input.actorUserId) {
    await assertUserExists(
      input.actorUserId,
      "actor",
    )
  }

  return db.productFeedback.create({
    data: {
      organizationId:
        input.organizationId,

      actorUserId:
        input.actorUserId ?? null,

      category:
        input.category,

      source:
        input.source,

      satisfactionScore:
        validateScore(
          input.satisfactionScore,
        ),

      message:
        normalizeOptionalText(
          input.message,
          MAX_MESSAGE_LENGTH,
          "Feedback message",
        ),
    },
  })
}

export async function triageProductFeedback(
  feedbackId: string,
) {
  const feedback =
    await getFeedbackOrThrow(
      feedbackId,
    )

  if (
    feedback.status !==
    ProductFeedbackStatus.OPEN
  ) {
    throw new InvalidProductFeedbackTransitionError(
      feedback.status,
      ProductFeedbackStatus.TRIAGED,
    )
  }

  return db.productFeedback.update({
    where: {
      id: feedback.id,
    },

    data: {
      status:
        ProductFeedbackStatus.TRIAGED,

      triagedAt:
        new Date(),
    },
  })
}

export async function startProductFeedback(
  feedbackId: string,
) {
  const feedback =
    await getFeedbackOrThrow(
      feedbackId,
    )

  if (
    feedback.status !==
    ProductFeedbackStatus.TRIAGED
  ) {
    throw new InvalidProductFeedbackTransitionError(
      feedback.status,
      ProductFeedbackStatus.IN_PROGRESS,
    )
  }

  return db.productFeedback.update({
    where: {
      id: feedback.id,
    },

    data: {
      status:
        ProductFeedbackStatus.IN_PROGRESS,

      startedAt:
        new Date(),
    },
  })
}

export async function resolveProductFeedback(
  input: {
    feedbackId: string
    resolvedByUserId: string
    resolutionNote?: string | null
  },
) {
  const feedback =
    await getFeedbackOrThrow(
      input.feedbackId,
    )

  if (
    feedback.status !==
      ProductFeedbackStatus.TRIAGED &&
    feedback.status !==
      ProductFeedbackStatus.IN_PROGRESS
  ) {
    throw new InvalidProductFeedbackTransitionError(
      feedback.status,
      ProductFeedbackStatus.RESOLVED,
    )
  }

  await assertUserExists(
    input.resolvedByUserId,
    "resolver",
  )

  return db.productFeedback.update({
    where: {
      id: feedback.id,
    },

    data: {
      status:
        ProductFeedbackStatus.RESOLVED,

      resolvedByUserId:
        input.resolvedByUserId,

      resolutionNote:
        normalizeOptionalText(
          input.resolutionNote,
          MAX_RESOLUTION_NOTE_LENGTH,
          "Resolution note",
        ),

      resolvedAt:
        new Date(),

      dismissedAt:
        null,
    },
  })
}

export async function dismissProductFeedback(
  input: {
    feedbackId: string
    resolvedByUserId: string
    resolutionNote?: string | null
  },
) {
  const feedback =
    await getFeedbackOrThrow(
      input.feedbackId,
    )

  if (
    feedback.status ===
      ProductFeedbackStatus.RESOLVED ||
    feedback.status ===
      ProductFeedbackStatus.DISMISSED
  ) {
    throw new InvalidProductFeedbackTransitionError(
      feedback.status,
      ProductFeedbackStatus.DISMISSED,
    )
  }

  await assertUserExists(
    input.resolvedByUserId,
    "resolver",
  )

  return db.productFeedback.update({
    where: {
      id: feedback.id,
    },

    data: {
      status:
        ProductFeedbackStatus.DISMISSED,

      resolvedByUserId:
        input.resolvedByUserId,

      resolutionNote:
        normalizeOptionalText(
          input.resolutionNote,
          MAX_RESOLUTION_NOTE_LENGTH,
          "Resolution note",
        ),

      dismissedAt:
        new Date(),

      resolvedAt:
        null,
    },
  })
}

export async function listProductFeedback(
  query: ProductFeedbackListQuery,
) {
  await assertOrganizationExists(
    query.organizationId,
  )

  const take =
    Math.min(
      Math.max(
        query.take ?? 100,
        1,
      ),
      500,
    )

  return db.productFeedback.findMany({
    where: {
      organizationId:
        query.organizationId,

      status:
        query.status,

      category:
        query.category,

      createdAt:
        query.from || query.to
          ? {
              gte:
                query.from,
              lt:
                query.to,
            }
          : undefined,
    },

    orderBy: {
      createdAt:
        "desc",
    },

    take,
  })
}

export async function getProductFeedbackSummary(
  input: {
    organizationId: string
    from?: Date
    to?: Date
  },
): Promise<ProductFeedbackSummary> {
  await assertOrganizationExists(
    input.organizationId,
  )

  const feedback =
    await db.productFeedback.findMany({
      where: {
        organizationId:
          input.organizationId,

        createdAt:
          input.from || input.to
            ? {
                gte:
                  input.from,
                lt:
                  input.to,
              }
            : undefined,
      },

      select: {
        status: true,
        category: true,
        satisfactionScore: true,
      },
    })

  const scoreDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }

  const categoryDistribution:
    Record<ProductFeedbackCategory, number> = {
      [ProductFeedbackCategory.BUG]:
        0,

      [ProductFeedbackCategory.USABILITY]:
        0,

      [ProductFeedbackCategory.FEATURE_REQUEST]:
        0,

      [ProductFeedbackCategory.PERFORMANCE]:
        0,

      [ProductFeedbackCategory.SUPPORT]:
        0,

      [ProductFeedbackCategory.OTHER]:
        0,
    }

  let ratedCount = 0
  let scoreSum = 0

  let open = 0
  let triaged = 0
  let inProgress = 0
  let resolved = 0
  let dismissed = 0

  for (const item of feedback) {
    categoryDistribution[
      item.category
    ]++

    switch (item.status) {
      case ProductFeedbackStatus.OPEN:
        open++
        break

      case ProductFeedbackStatus.TRIAGED:
        triaged++
        break

      case ProductFeedbackStatus.IN_PROGRESS:
        inProgress++
        break

      case ProductFeedbackStatus.RESOLVED:
        resolved++
        break

      case ProductFeedbackStatus.DISMISSED:
        dismissed++
        break
    }

    if (
      item.satisfactionScore != null
    ) {
      ratedCount++
      scoreSum +=
        item.satisfactionScore

      const score =
        item.satisfactionScore as
          | 1
          | 2
          | 3
          | 4
          | 5

      scoreDistribution[
        score
      ]++
    }
  }

  return {
    organizationId:
      input.organizationId,

    total:
      feedback.length,

    open,
    triaged,
    inProgress,
    resolved,
    dismissed,

    ratedCount,

    averageSatisfaction:
      ratedCount > 0
        ? scoreSum /
          ratedCount
        : null,

    scoreDistribution,
    categoryDistribution,
  }
}
