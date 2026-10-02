import { Prisma } from "@prisma/client"

import { db } from "@/server/db/client"

import {
  SAFE_ACTIVITY_METADATA_KEYS,
  type SafeActivityMetadata,
} from "./activity-events"

import {
  InvalidProductActivityEventError,
  ProductActivityActorNotFoundError,
  ProductActivityOrganizationNotFoundError,
  UnsafeProductActivityMetadataError,
} from "./activity.errors"

const EVENT_KEY_PATTERN =
  /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/

const safeMetadataKeys =
  new Set<string>(
    SAFE_ACTIVITY_METADATA_KEYS,
  )

function normalizeOptionalString(
  value: string | null | undefined,
) {
  const normalized = value?.trim()

  return normalized
    ? normalized
    : null
}

function validateEventKey(
  eventKey: string,
) {
  const normalized =
    eventKey.trim()

  if (
    normalized.length < 3 ||
    normalized.length > 100 ||
    !EVENT_KEY_PATTERN.test(normalized)
  ) {
    throw new InvalidProductActivityEventError(
      "Event key must use lowercase dot-separated product activity notation.",
    )
  }

  return normalized
}

function validateMetadata(
  metadata:
    | SafeActivityMetadata
    | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined
  }

  for (
    const [key, value]
    of Object.entries(metadata)
  ) {
    if (!safeMetadataKeys.has(key)) {
      throw new UnsafeProductActivityMetadataError(
        key,
      )
    }

    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new UnsafeProductActivityMetadataError(
        key,
      )
    }

    if (
      typeof value === "string" &&
      value.length > 200
    ) {
      throw new InvalidProductActivityEventError(
        `Metadata value for "${key}" is too long.`,
      )
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      throw new InvalidProductActivityEventError(
        `Metadata value for "${key}" must be finite.`,
      )
    }
  }

  return metadata as Prisma.InputJsonValue
}

export type RecordProductActivityInput = {
  eventKey: string

  actorUserId?: string | null
  organizationId?: string | null

  resourceType?: string | null
  resourceId?: string | null
  screen?: string | null

  sessionId?: string | null
  requestId?: string | null
  correlationId?: string | null

  metadata?: SafeActivityMetadata
  occurredAt?: Date
}

export async function recordProductActivity(
  input: RecordProductActivityInput,
) {
  const eventKey =
    validateEventKey(
      input.eventKey,
    )

  const actorUserId =
    normalizeOptionalString(
      input.actorUserId,
    )

  const organizationId =
    normalizeOptionalString(
      input.organizationId,
    )

  if (actorUserId) {
    const actorExists =
      await db.user.findUnique({
        where: {
          id: actorUserId,
        },
        select: {
          id: true,
        },
      })

    if (!actorExists) {
      throw new ProductActivityActorNotFoundError()
    }
  }

  if (organizationId) {
    const organizationExists =
      await db.organization.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
        },
      })

    if (!organizationExists) {
      throw new ProductActivityOrganizationNotFoundError()
    }
  }

  const metadata =
    validateMetadata(
      input.metadata,
    )

  return db.productActivityEvent.create({
    data: {
      eventKey,

      actorUserId,
      organizationId,

      resourceType:
        normalizeOptionalString(
          input.resourceType,
        ),

      resourceId:
        normalizeOptionalString(
          input.resourceId,
        ),

      screen:
        normalizeOptionalString(
          input.screen,
        ),

      sessionId:
        normalizeOptionalString(
          input.sessionId,
        ),

      requestId:
        normalizeOptionalString(
          input.requestId,
        ),

      correlationId:
        normalizeOptionalString(
          input.correlationId,
        ),

      metadata,

      occurredAt:
        input.occurredAt,
    },
  })
}

export type ProductActivityQuery = {
  actorUserId?: string
  organizationId?: string
  eventKey?: string
  from?: Date
  to?: Date
  take?: number
}

export async function listProductActivity(
  query: ProductActivityQuery = {},
) {
  const take = Math.min(
    Math.max(
      query.take ?? 100,
      1,
    ),
    500,
  )

  return db.productActivityEvent.findMany({
    where: {
      actorUserId:
        query.actorUserId,

      organizationId:
        query.organizationId,

      eventKey:
        query.eventKey,

      occurredAt:
        query.from || query.to
          ? {
              gte:
                query.from,
              lte:
                query.to,
            }
          : undefined,
    },

    orderBy: {
      occurredAt: "desc",
    },

    take,
  })
}
