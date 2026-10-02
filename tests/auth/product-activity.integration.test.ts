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
  InvalidProductActivityEventError,
  ProductActivityActorNotFoundError,
  ProductActivityOrganizationNotFoundError,
  UnsafeProductActivityMetadataError,
} from "../../src/server/activity/activity.errors"

import {
  listProductActivity,
  recordProductActivity,
} from "../../src/server/activity/activity.service"

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
  await db.productActivityEvent.deleteMany()
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
    },
  })
}

async function createOrganization() {
  return db.organization.create({
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
  "records product activity event",
  async () => {
    const user =
      await createUser(
        "activity@example.test",
      )

    const organization =
      await createOrganization()

    const event =
      await recordProductActivity({
        eventKey:
          PRODUCT_ACTIVITY_EVENTS
            .DASHBOARD_VIEWED,

        actorUserId:
          user.id,

        organizationId:
          organization.id,

        screen:
          "dashboard",

        metadata: {
          source:
            "web",
          route:
            "/dashboard",
        },
      })

    assert.equal(
      event.eventKey,
      PRODUCT_ACTIVITY_EVENTS
        .DASHBOARD_VIEWED,
    )

    assert.equal(
      event.actorUserId,
      user.id,
    )

    assert.equal(
      event.organizationId,
      organization.id,
    )
  },
)

test(
  "product activity may be anonymous",
  async () => {
    const event =
      await recordProductActivity({
        eventKey:
          "application.started",

        metadata: {
          source:
            "web",
        },
      })

    assert.equal(
      event.actorUserId,
      null,
    )

    assert.equal(
      event.organizationId,
      null,
    )
  },
)

test(
  "rejects malformed activity event key",
  async () => {
    await assert.rejects(
      () =>
        recordProductActivity({
          eventKey:
            "Dashboard Viewed",
        }),

      InvalidProductActivityEventError,
    )
  },
)

test(
  "rejects unsafe metadata key",
  async () => {
    await assert.rejects(
      () =>
        recordProductActivity({
          eventKey:
            "dashboard.viewed",

          metadata: {
            patientName:
              "Sensitive Value",
          } as never,
        }),

      UnsafeProductActivityMetadataError,
    )
  },
)

test(
  "rejects unknown actor",
  async () => {
    await assert.rejects(
      () =>
        recordProductActivity({
          eventKey:
            "dashboard.viewed",

          actorUserId:
            "00000000-0000-0000-0000-000000000001",
        }),

      ProductActivityActorNotFoundError,
    )
  },
)

test(
  "rejects unknown organization",
  async () => {
    await assert.rejects(
      () =>
        recordProductActivity({
          eventKey:
            "dashboard.viewed",

          organizationId:
            "00000000-0000-0000-0000-000000000001",
        }),

      ProductActivityOrganizationNotFoundError,
    )
  },
)

test(
  "records request correlation identifiers",
  async () => {
    const event =
      await recordProductActivity({
        eventKey:
          "organization.switched",

        sessionId:
          "session-test",

        requestId:
          "request-test",

        correlationId:
          "correlation-test",
      })

    assert.equal(
      event.sessionId,
      "session-test",
    )

    assert.equal(
      event.requestId,
      "request-test",
    )

    assert.equal(
      event.correlationId,
      "correlation-test",
    )
  },
)

test(
  "lists product activity by organization",
  async () => {
    const organization =
      await createOrganization()

    await recordProductActivity({
      eventKey:
        "dashboard.viewed",

      organizationId:
        organization.id,
    })

    await recordProductActivity({
      eventKey:
        "feedback.opened",
    })

    const events =
      await listProductActivity({
        organizationId:
          organization.id,
      })

    assert.equal(
      events.length,
      1,
    )

    assert.equal(
      events[0]?.eventKey,
      "dashboard.viewed",
    )
  },
)

test(
  "lists product activity by event key",
  async () => {
    await recordProductActivity({
      eventKey:
        "dashboard.viewed",
    })

    await recordProductActivity({
      eventKey:
        "feedback.opened",
    })

    const events =
      await listProductActivity({
        eventKey:
          "feedback.opened",
      })

    assert.equal(
      events.length,
      1,
    )

    assert.equal(
      events[0]?.eventKey,
      "feedback.opened",
    )
  },
)

test(
  "product activity remains after actor deletion",
  async () => {
    const user =
      await createUser(
        "delete-actor@example.test",
      )

    const event =
      await recordProductActivity({
        eventKey:
          "dashboard.viewed",

        actorUserId:
          user.id,
      })

    await db.user.delete({
      where: {
        id:
          user.id,
      },
    })

    const persisted =
      await db.productActivityEvent
        .findUniqueOrThrow({
          where: {
            id:
              event.id,
          },
        })

    assert.equal(
      persisted.actorUserId,
      null,
    )
  },
)

test(
  "product activity remains after organization deletion",
  async () => {
    const organization =
      await createOrganization()

    const event =
      await recordProductActivity({
        eventKey:
          "dashboard.viewed",

        organizationId:
          organization.id,
      })

    await db.organization.delete({
      where: {
        id:
          organization.id,
      },
    })

    const persisted =
      await db.productActivityEvent
        .findUniqueOrThrow({
          where: {
            id:
              event.id,
          },
        })

    assert.equal(
      persisted.organizationId,
      null,
    )
  },
)
