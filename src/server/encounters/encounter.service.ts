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
) {
  const encounter =
    await db.encounter.findUnique({
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

export async function createEncounter(
  input: CreateEncounterInput,
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
  );

  await validateEncounterPregnancy(
    input.patientId,
    input.pregnancyId ?? null,
    occurredAt,
  );

  return db.encounter.create({
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
) {
  return requireEncounter(
    encounterId,
  );
}

export async function updateEncounter(
  encounterId: string,
  input: UpdateEncounterInput,
) {
  const encounter =
    await requireEncounter(
      encounterId,
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
  );

  return db.encounter.update({
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

export async function startEncounter(
  encounterId: string,
) {
  const encounter =
    await requireEncounter(
      encounterId,
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

  return db.encounter.update({
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

export async function completeEncounter(
  encounterId: string,
) {
  const encounter =
    await requireEncounter(
      encounterId,
    );

  if (
    encounter.status !==
    EncounterStatus.IN_PROGRESS
  ) {
    throw new InvalidEncounterTransitionError();
  }

  const completedAt =
    new Date();

  if (
    completedAt.getTime() <
    encounter.occurredAt.getTime()
  ) {
    throw new InvalidEncounterTransitionError();
  }

  return db.encounter.update({
    where: {
      id: encounterId,
    },
    data: {
      status:
        EncounterStatus.COMPLETED,
      completedAt,
    },
  });
}

export async function cancelEncounter(
  input: CancelEncounterInput,
) {
  const encounter =
    await requireEncounter(
      input.encounterId,
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

  return db.encounter.update({
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
