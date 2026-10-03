import {
  db,
} from "../db/client";

import {
  normalizePatientBirthDate,
  normalizePatientName,
} from "./patient.validation";

export type FindPossiblePatientDuplicatesInput = {
  fullName: string;
  birthDate: Date | string;
  excludePatientId?: string;
  take?: number;
};

const DEFAULT_DUPLICATE_LIMIT =
  10;

const MAX_DUPLICATE_LIMIT =
  25;

function normalizeDuplicateLimit(
  take?: number,
): number {
  if (
    take == null ||
    !Number.isInteger(take) ||
    take < 1
  ) {
    return DEFAULT_DUPLICATE_LIMIT;
  }

  return Math.min(
    take,
    MAX_DUPLICATE_LIMIT,
  );
}

export async function findPossiblePatientDuplicates(
  input: FindPossiblePatientDuplicatesInput,
) {
  const fullName =
    normalizePatientName(
      input.fullName,
    );

  const birthDate =
    normalizePatientBirthDate(
      input.birthDate,
    );

  return db.patient.findMany({
    where: {
      fullName: {
        equals: fullName,
        mode: "insensitive",
      },
      birthDate,
      ...(input.excludePatientId
        ? {
            id: {
              not:
                input.excludePatientId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      cpf: true,
      cns: true,
      fullName: true,
      socialName: true,
      birthDate: true,
      isActive: true,
    },
    orderBy: [
      {
        isActive: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
    take:
      normalizeDuplicateLimit(
        input.take,
      ),
  });
}

export async function hasPossiblePatientDuplicate(
  input: FindPossiblePatientDuplicatesInput,
): Promise<boolean> {
  const candidates =
    await findPossiblePatientDuplicates({
      ...input,
      take: 1,
    });

  return candidates.length > 0;
}
