import type { Prisma } from "@prisma/client";
import { inClinicalWriteTransaction, lockEditableEncounter } from "./clinical-write-transaction";
import {
  EncounterStatus,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  EncounterFinalizedError,
  EncounterNotFoundError,
  InvalidEncounterTransitionError,
} from "./encounter.errors";

import {
  validateEncounterPregnancy,
} from "./encounter-consistency";

import {
  requireEncounterOrganizationContext,
} from "./encounter-organization.service";

import {
  type CancelEncounterInput,
  type CreateEncounterInput,
  type ListOrganizationEncountersInput,
  type ListPatientEncountersInput,
  type UpdateEncounterInput,
} from "./encounter.types";

import {
  normalizeCancellationReason,
  normalizeChiefComplaint,
  normalizeEncounterDate,
} from "./encounter.validation";

async function requireEncounter(
  encounterId: string,
  client: Prisma.TransactionClient = db,
) {
  const encounter =
    await client.encounter.findUnique({
      where: {
        id: encounterId,
      },
    });

  if (!encounter) {
    throw new EncounterNotFoundError();
  }

  return encounter;
}

function assertEncounterEditable(
  status: EncounterStatus,
) {
  if (
    status ===
      EncounterStatus.COMPLETED ||
    status ===
      EncounterStatus.CANCELLED
  ) {
    throw new EncounterFinalizedError();
  }
}

export function createEncounter(
  input: CreateEncounterInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => createEncounterInTransaction(input, tx), client);
}

async function createEncounterInTransaction(
  input: CreateEncounterInput,
  client: Prisma.TransactionClient,
) {
  const occurredAt =
    normalizeEncounterDate(
      input.occurredAt,
    );

  const chiefComplaint =
    normalizeChiefComplaint(
      input.chiefComplaint,
    );

  await requireEncounterOrganizationContext(
    input.patientId,
    input.organizationId,
    client,
  );

  await validateEncounterPregnancy(
    input.patientId,
    input.pregnancyId ?? null,
    occurredAt,
    client,
  );

  return client.encounter.create({
    data: {
      patientId:
        input.patientId,
      organizationId:
        input.organizationId,
      pregnancyId:
        input.pregnancyId ??
        null,
      chiefComplaint,
      occurredAt,
      status:
        EncounterStatus.DRAFT,
    },
  });
}

export async function getEncounterById(
  encounterId: string,
  client: Prisma.TransactionClient = db,
) {
  return requireEncounter(
    encounterId,
    client,
  );
}

export function updateEncounter(
  encounterId: string,
  input: UpdateEncounterInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => updateEncounterInTransaction(encounterId, input, tx), client);
}

async function updateEncounterInTransaction(
  encounterId: string,
  input: UpdateEncounterInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, encounterId);
  const encounter =
    await requireEncounter(
      encounterId,
      client,
    );

  assertEncounterEditable(
    encounter.status,
  );

  if (
    encounter.status ===
      EncounterStatus.IN_PROGRESS &&
    (
      input.pregnancyId !==
        undefined ||
      input.occurredAt !==
        undefined
    )
  ) {
    throw new InvalidEncounterTransitionError();
  }

  const nextOccurredAt =
    input.occurredAt !==
    undefined
      ? normalizeEncounterDate(
          input.occurredAt,
        )
      : encounter.occurredAt;

  const nextPregnancyId =
    input.pregnancyId !==
    undefined
      ? input.pregnancyId
      : encounter.pregnancyId;

  await validateEncounterPregnancy(
    encounter.patientId,
    nextPregnancyId,
    nextOccurredAt,
    client,
  );

  return client.encounter.update({
    where: {
      id: encounterId,
    },
    data: {
      ...(input.pregnancyId !==
      undefined
        ? {
            pregnancyId:
              input.pregnancyId,
          }
        : {}),
      ...(input.occurredAt !==
      undefined
        ? {
            occurredAt:
              nextOccurredAt,
          }
        : {}),
      ...(input.chiefComplaint !==
      undefined
        ? {
            chiefComplaint:
              normalizeChiefComplaint(
                input.chiefComplaint,
              ),
          }
        : {}),
    },
  });
}

export function startEncounter(
  encounterId: string,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => startEncounterInTransaction(encounterId, tx), client);
}

async function startEncounterInTransaction(
  encounterId: string,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, encounterId, [EncounterStatus.DRAFT]);
  const encounter =
    await requireEncounter(
      encounterId,
      client,
    );

  if (
    encounter.status !==
    EncounterStatus.DRAFT
  ) {
    throw new InvalidEncounterTransitionError();
  }

  const startedAt =
    new Date();

  if (
    startedAt.getTime() <
    encounter.occurredAt.getTime()
  ) {
    throw new InvalidEncounterTransitionError();
  }

  return client.encounter.update({
    where: {
      id: encounterId,
    },
    data: {
      status:
        EncounterStatus.IN_PROGRESS,
      startedAt,
    },
  });
}

export function completeEncounter(
  encounterId: string,
  actorUserId?: string,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(async tx => {
    await lockEditableEncounter(tx, encounterId, [EncounterStatus.IN_PROGRESS]);
    const encounter = await requireEncounter(encounterId, tx);
    if (encounter.status !== EncounterStatus.IN_PROGRESS) {
      throw new InvalidEncounterTransitionError();
    }
    const completedAt = new Date();
    if (completedAt.getTime() < encounter.occurredAt.getTime()) {
      throw new InvalidEncounterTransitionError();
    }
    const changed = await tx.encounter.updateMany({
      where: { id: encounterId, status: EncounterStatus.IN_PROGRESS },
      data: { status: EncounterStatus.COMPLETED, completedAt },
    });
    if (changed.count !== 1) throw new InvalidEncounterTransitionError();
    if (actorUserId) await tx.productActivityEvent.create({ data: {
      eventKey: "encounter.completed", actorUserId,
      organizationId: encounter.organizationId,
      metadata: { source: "clinical-api", version: "beta1" },
      occurredAt: completedAt,
    } });
    return tx.encounter.findUniqueOrThrow({ where: { id: encounterId } });
  }, client);
}

export function cancelEncounter(
  input: CancelEncounterInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => cancelEncounterInTransaction(input, tx), client);
}

async function cancelEncounterInTransaction(
  input: CancelEncounterInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, input.encounterId);
  const encounter =
    await requireEncounter(
      input.encounterId,
      client,
    );

  assertEncounterEditable(
    encounter.status,
  );

  const cancellationReason =
    normalizeCancellationReason(
      input.reason,
    );

  const cancelledAt =
    new Date();

  if (
    cancelledAt.getTime() <
    encounter.occurredAt.getTime()
  ) {
    throw new InvalidEncounterTransitionError();
  }

  return client.encounter.update({
    where: {
      id:
        input.encounterId,
    },
    data: {
      status:
        EncounterStatus.CANCELLED,
      cancelledAt,
      cancellationReason,
    },
  });
}

export async function listPatientEncounters(
  patientId: string,
  input:
    ListPatientEncountersInput = {},
) {
  return db.encounter.findMany({
    where: {
      patientId,
      ...(input.organizationId
        ? {
            organizationId:
              input.organizationId,
          }
        : {}),
      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),
    },
    orderBy: {
      occurredAt:
        "desc",
    },
  });
}

export async function listOrganizationEncounters(
  organizationId: string,
  input:
    ListOrganizationEncountersInput = {},
) {
  return db.encounter.findMany({
    where: {
      organizationId,
      ...(input.patientId
        ? {
            patientId:
              input.patientId,
          }
        : {}),
      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),
    },
    orderBy: {
      occurredAt:
        "desc",
    },
  });
}
