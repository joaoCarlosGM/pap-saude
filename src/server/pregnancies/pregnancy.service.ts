import {
  PregnancyStatus,
  Prisma,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  PatientNotFoundError,
} from "../patients/patient.errors";

import {
  ActivePregnancyConflictError,
  InactivePatientPregnancyError,
  PregnancyAlreadyEndedError,
  PregnancyNotFoundError,
} from "./pregnancy.errors";

import {
  type CreatePregnancyInput,
  type EndPregnancyInput,
  type ListPatientPregnanciesInput,
  type UpdatePregnancyInput,
} from "./pregnancy.types";

import {
  normalizeHistoricalPregnancyDate,
  normalizePregnancyCount,
  normalizePregnancyDate,
} from "./pregnancy.validation";

const ACTIVE_SLOT =
  1;

async function requirePatient(
  patientId: string,
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id: patientId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!patient) {
    throw new PatientNotFoundError();
  }

  return patient;
}

async function requireActivePatient(
  patientId: string,
) {
  const patient =
    await requirePatient(
      patientId,
    );

  if (!patient.isActive) {
    throw new InactivePatientPregnancyError();
  }

  return patient;
}

async function requirePregnancy(
  pregnancyId: string,
) {
  const pregnancy =
    await db.pregnancy.findUnique({
      where: {
        id: pregnancyId,
      },
    });

  if (!pregnancy) {
    throw new PregnancyNotFoundError();
  }

  return pregnancy;
}

function mapPregnancyConflict(
  error: unknown,
): never {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const diagnostic =
      [
        JSON.stringify(
          error.meta ?? {},
        ),
        error.message,
      ].join(" ");

    if (
      diagnostic.includes(
        "pregnancies_patientId_activeSlot_key",
      ) ||
      (
        diagnostic.includes(
          "patientId",
        ) &&
        diagnostic.includes(
          "activeSlot",
        )
      )
    ) {
      throw new ActivePregnancyConflictError();
    }
  }

  throw error;
}

export async function createPregnancy(
  input: CreatePregnancyInput,
) {
  await requireActivePatient(
    input.patientId,
  );

  const existingActive =
    await db.pregnancy.findFirst({
      where: {
        patientId:
          input.patientId,
        status:
          PregnancyStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

  if (existingActive) {
    throw new ActivePregnancyConflictError();
  }

  const lastMenstrualDate =
    normalizeHistoricalPregnancyDate(
      input.lastMenstrualDate,
    );

  const estimatedDueDate =
    normalizePregnancyDate(
      input.estimatedDueDate,
    );

  const firstPrenatalAt =
    normalizeHistoricalPregnancyDate(
      input.firstPrenatalAt,
    );

  const gravida =
    normalizePregnancyCount(
      input.gravida,
    );

  const parity =
    normalizePregnancyCount(
      input.parity,
    );

  try {
    return await db.pregnancy.create({
      data: {
        patientId:
          input.patientId,
        status:
          PregnancyStatus.ACTIVE,
        activeSlot:
          ACTIVE_SLOT,
        lastMenstrualDate,
        estimatedDueDate,
        firstPrenatalAt,
        gravida,
        parity,
      },
    });
  } catch (error) {
    return mapPregnancyConflict(
      error,
    );
  }
}

export async function getPregnancyById(
  pregnancyId: string,
) {
  return requirePregnancy(
    pregnancyId,
  );
}

export async function getActivePregnancyForPatient(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.pregnancy.findFirst({
    where: {
      patientId,
      status:
        PregnancyStatus.ACTIVE,
    },
    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function listPatientPregnancies(
  patientId: string,
  input:
    ListPatientPregnanciesInput = {},
) {
  await requirePatient(
    patientId,
  );

  return db.pregnancy.findMany({
    where: {
      patientId,
      ...(input.status
        ? {
            status:
              input.status,
          }
        : {}),
    },
    orderBy: {
      createdAt:
        "desc",
    },
  });
}

export async function updatePregnancy(
  pregnancyId: string,
  input:
    UpdatePregnancyInput,
) {
  const pregnancy =
    await requirePregnancy(
      pregnancyId,
    );

  if (
    pregnancy.status !==
    PregnancyStatus.ACTIVE
  ) {
    throw new PregnancyAlreadyEndedError();
  }

  const data:
    Prisma.PregnancyUpdateInput = {};

  if (
    input.lastMenstrualDate !==
    undefined
  ) {
    data.lastMenstrualDate =
      normalizeHistoricalPregnancyDate(
        input.lastMenstrualDate,
      );
  }

  if (
    input.estimatedDueDate !==
    undefined
  ) {
    data.estimatedDueDate =
      normalizePregnancyDate(
        input.estimatedDueDate,
      );
  }

  if (
    input.firstPrenatalAt !==
    undefined
  ) {
    data.firstPrenatalAt =
      normalizeHistoricalPregnancyDate(
        input.firstPrenatalAt,
      );
  }

  if (
    input.gravida !==
    undefined
  ) {
    data.gravida =
      normalizePregnancyCount(
        input.gravida,
      );
  }

  if (
    input.parity !==
    undefined
  ) {
    data.parity =
      normalizePregnancyCount(
        input.parity,
      );
  }

  return db.pregnancy.update({
    where: {
      id: pregnancyId,
    },
    data,
  });
}

async function endPregnancy(
  input: EndPregnancyInput,
  status:
    | typeof PregnancyStatus.COMPLETED
    | typeof PregnancyStatus.INTERRUPTED,
) {
  const pregnancy =
    await requirePregnancy(
      input.pregnancyId,
    );

  if (
    pregnancy.status !==
    PregnancyStatus.ACTIVE
  ) {
    throw new PregnancyAlreadyEndedError();
  }

  const endedAt =
    input.endedAt ===
    undefined
      ? new Date()
      : normalizeHistoricalPregnancyDate(
          input.endedAt,
        );

  if (!endedAt) {
    throw new PregnancyAlreadyEndedError();
  }

  return db.pregnancy.update({
    where: {
      id:
        input.pregnancyId,
    },
    data: {
      status,
      endedAt,
      activeSlot:
        null,
    },
  });
}

export async function completePregnancy(
  input: EndPregnancyInput,
) {
  return endPregnancy(
    input,
    PregnancyStatus.COMPLETED,
  );
}

export async function interruptPregnancy(
  input: EndPregnancyInput,
) {
  return endPregnancy(
    input,
    PregnancyStatus.INTERRUPTED,
  );
}
