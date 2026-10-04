import {
  ClinicalFlagStatus,
} from "@prisma/client";

import {
  Prisma,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  ClinicalFlagAlreadyActiveError,
  ClinicalFlagFinalizedError,
  ClinicalFlagNotFoundError,
  ClinicalFlagPatientInactiveError,
  ClinicalFlagPatientNotFoundError,
  InvalidClinicalFlagTransitionError,
} from "./clinical-flag.errors";

import {
  type CreateClinicalFlagInput,
  type EndClinicalFlagInput,
  type UpdateClinicalFlagInput,
} from "./clinical-flag.types";

import {
  normalizeClinicalFlagCode,
  normalizeClinicalFlagDetails,
  normalizeClinicalFlagLabel,
  normalizeClinicalFlagNotedAt,
} from "./clinical-flag.validation";

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
    throw new ClinicalFlagPatientNotFoundError();
  }

  return patient;
}

async function requireFlag(
  flagId: string,
) {
  const flag =
    await db.clinicalFlag.findUnique({
      where: {
        id: flagId,
      },
    });

  if (!flag) {
    throw new ClinicalFlagNotFoundError();
  }

  return flag;
}

export async function createClinicalFlag(
  input: CreateClinicalFlagInput,
) {
  const patient =
    await requirePatient(
      input.patientId,
    );

  if (!patient.isActive) {
    throw new ClinicalFlagPatientInactiveError();
  }

  const code =
    normalizeClinicalFlagCode(
      input.code,
    );

  try {
    return await db.clinicalFlag.create({
      data: {
        patientId:
          patient.id,

        code,

        label:
          normalizeClinicalFlagLabel(
            input.label,
          ),

        details:
          normalizeClinicalFlagDetails(
            input.details,
          ),

        status:
          ClinicalFlagStatus.ACTIVE,

        activeSlot:
          1,

        notedAt:
          normalizeClinicalFlagNotedAt(
            input.notedAt,
          ),
      },
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ClinicalFlagAlreadyActiveError();
    }

    throw error;
  }
}

export async function getClinicalFlagById(
  flagId: string,
) {
  return requireFlag(
    flagId,
  );
}

export async function listPatientClinicalFlags(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.clinicalFlag.findMany({
    where: {
      patientId,
    },
    orderBy: {
      notedAt:
        "desc",
    },
  });
}

export async function listActivePatientClinicalFlags(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.clinicalFlag.findMany({
    where: {
      patientId,
      status:
        ClinicalFlagStatus.ACTIVE,
    },
    orderBy: {
      notedAt:
        "desc",
    },
  });
}

export async function updateClinicalFlag(
  flagId: string,
  input: UpdateClinicalFlagInput,
) {
  const flag =
    await requireFlag(
      flagId,
    );

  if (
    flag.status !==
    ClinicalFlagStatus.ACTIVE
  ) {
    throw new ClinicalFlagFinalizedError();
  }

  return db.clinicalFlag.update({
    where: {
      id: flagId,
    },
    data: {
      ...(input.label !==
      undefined
        ? {
            label:
              normalizeClinicalFlagLabel(
                input.label,
              ),
          }
        : {}),

      ...(input.details !==
      undefined
        ? {
            details:
              normalizeClinicalFlagDetails(
                input.details,
              ),
          }
        : {}),

      ...(input.notedAt !==
      undefined
        ? {
            notedAt:
              normalizeClinicalFlagNotedAt(
                input.notedAt,
              ),
          }
        : {}),
    },
  });
}

export async function endClinicalFlag(
  input: EndClinicalFlagInput,
) {
  const flag =
    await requireFlag(
      input.flagId,
    );

  if (
    flag.status !==
    ClinicalFlagStatus.ACTIVE
  ) {
    throw new InvalidClinicalFlagTransitionError();
  }

  return db.clinicalFlag.update({
    where: {
      id:
        input.flagId,
    },
    data: {
      status:
        input.status,

      activeSlot:
        null,

      endedAt:
        new Date(),
    },
  });
}
