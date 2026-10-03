import {
  Prisma,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  PatientCnsConflictError,
  PatientCpfConflictError,
  PatientNotFoundError,
} from "./patient.errors";

import {
  type CreatePatientInput,
  type SearchPatientsInput,
  type UpdatePatientDemographicsInput,
} from "./patient.types";

import {
  normalizeOptionalText,
  normalizePatientBirthDate,
  normalizePatientCns,
  normalizePatientCpf,
  normalizePatientName,
  normalizePatientState,
} from "./patient.validation";

const DEFAULT_SEARCH_LIMIT =
  25;

const MAX_SEARCH_LIMIT =
  100;

function normalizeSearchLimit(
  take?: number,
): number {
  if (
    take == null ||
    !Number.isInteger(take) ||
    take < 1
  ) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(
    take,
    MAX_SEARCH_LIMIT,
  );
}

function mapPatientUniqueConflict(
  error: unknown,
): never {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target =
      Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(
            error.meta?.target ?? "",
          );

    if (target.includes("cpf")) {
      throw new PatientCpfConflictError();
    }

    if (target.includes("cns")) {
      throw new PatientCnsConflictError();
    }
  }

  throw error;
}

async function requirePatient(
  patientId: string,
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id: patientId,
      },
    });

  if (!patient) {
    throw new PatientNotFoundError();
  }

  return patient;
}

async function assertCpfAvailable(
  cpf: string | null,
  excludePatientId?: string,
): Promise<void> {
  if (!cpf) {
    return;
  }

  const existing =
    await db.patient.findUnique({
      where: {
        cpf,
      },
      select: {
        id: true,
      },
    });

  if (
    existing &&
    existing.id !== excludePatientId
  ) {
    throw new PatientCpfConflictError();
  }
}

async function assertCnsAvailable(
  cns: string | null,
  excludePatientId?: string,
): Promise<void> {
  if (!cns) {
    return;
  }

  const existing =
    await db.patient.findUnique({
      where: {
        cns,
      },
      select: {
        id: true,
      },
    });

  if (
    existing &&
    existing.id !== excludePatientId
  ) {
    throw new PatientCnsConflictError();
  }
}

export async function createPatient(
  input: CreatePatientInput,
) {
  const fullName =
    normalizePatientName(
      input.fullName,
    );

  const cpf =
    normalizePatientCpf(
      input.cpf,
    );

  const cns =
    normalizePatientCns(
      input.cns,
    );

  const birthDate =
    normalizePatientBirthDate(
      input.birthDate,
    );

  const state =
    normalizePatientState(
      input.state,
    );

  await Promise.all([
    assertCpfAvailable(cpf),
    assertCnsAvailable(cns),
  ]);

  try {
    return await db.patient.create({
      data: {
        fullName,
        socialName:
          normalizeOptionalText(
            input.socialName,
            200,
          ),
        cpf,
        cns,
        birthDate,
        phone:
          normalizeOptionalText(
            input.phone,
            40,
          ),
        email:
          normalizeOptionalText(
            input.email,
            320,
          ),
        address:
          normalizeOptionalText(
            input.address,
            500,
          ),
        city:
          normalizeOptionalText(
            input.city,
            150,
          ),
        state,
      },
    });
  } catch (error) {
    return mapPatientUniqueConflict(
      error,
    );
  }
}

export async function getPatientById(
  patientId: string,
) {
  return requirePatient(
    patientId,
  );
}

export async function findPatientByCpf(
  cpfInput: string,
) {
  const cpf =
    normalizePatientCpf(
      cpfInput,
    );

  if (!cpf) {
    return null;
  }

  return db.patient.findUnique({
    where: {
      cpf,
    },
  });
}

export async function findPatientByCns(
  cnsInput: string,
) {
  const cns =
    normalizePatientCns(
      cnsInput,
    );

  if (!cns) {
    return null;
  }

  return db.patient.findUnique({
    where: {
      cns,
    },
  });
}

export async function searchPatients(
  input: SearchPatientsInput = {},
) {
  const query =
    input.query?.trim();

  const take =
    normalizeSearchLimit(
      input.take,
    );

  const where:
    Prisma.PatientWhereInput = {};

  if (
    typeof input.isActive ===
    "boolean"
  ) {
    where.isActive =
      input.isActive;
  }

  if (query) {
    const digits =
      query.replace(/\D/g, "");

    where.OR = [
      {
        fullName: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        socialName: {
          contains: query,
          mode: "insensitive",
        },
      },
      ...(digits.length > 0
        ? [
            {
              cpf: {
                contains: digits,
              },
            },
            {
              cns: {
                contains: digits,
              },
            },
          ]
        : []),
    ];
  }

  return db.patient.findMany({
    where,
    orderBy: [
      {
        isActive: "desc",
      },
      {
        fullName: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    take,
  });
}

export async function updatePatientDemographics(
  patientId: string,
  input: UpdatePatientDemographicsInput,
) {
  const current =
    await requirePatient(
      patientId,
    );

  const cpf =
    input.cpf === undefined
      ? current.cpf
      : normalizePatientCpf(
          input.cpf,
        );

  const cns =
    input.cns === undefined
      ? current.cns
      : normalizePatientCns(
          input.cns,
        );

  await Promise.all([
    assertCpfAvailable(
      cpf,
      patientId,
    ),
    assertCnsAvailable(
      cns,
      patientId,
    ),
  ]);

  const data:
    Prisma.PatientUpdateInput = {};

  if (
    input.fullName !== undefined
  ) {
    data.fullName =
      normalizePatientName(
        input.fullName,
      );
  }

  if (
    input.socialName !== undefined
  ) {
    data.socialName =
      normalizeOptionalText(
        input.socialName,
        200,
      );
  }

  if (input.cpf !== undefined) {
    data.cpf =
      cpf;
  }

  if (input.cns !== undefined) {
    data.cns =
      cns;
  }

  if (
    input.birthDate !== undefined
  ) {
    data.birthDate =
      normalizePatientBirthDate(
        input.birthDate,
      );
  }

  if (input.phone !== undefined) {
    data.phone =
      normalizeOptionalText(
        input.phone,
        40,
      );
  }

  if (input.email !== undefined) {
    data.email =
      normalizeOptionalText(
        input.email,
        320,
      );
  }

  if (
    input.address !== undefined
  ) {
    data.address =
      normalizeOptionalText(
        input.address,
        500,
      );
  }

  if (input.city !== undefined) {
    data.city =
      normalizeOptionalText(
        input.city,
        150,
      );
  }

  if (input.state !== undefined) {
    data.state =
      normalizePatientState(
        input.state,
      );
  }

  try {
    return await db.patient.update({
      where: {
        id: patientId,
      },
      data,
    });
  } catch (error) {
    return mapPatientUniqueConflict(
      error,
    );
  }
}

export async function disablePatient(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.patient.update({
    where: {
      id: patientId,
    },
    data: {
      isActive: false,
    },
  });
}

export async function reactivatePatient(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.patient.update({
    where: {
      id: patientId,
    },
    data: {
      isActive: true,
    },
  });
}
