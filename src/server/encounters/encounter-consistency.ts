import {
  PregnancyStatus,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  EncounterPregnancyMismatchError,
  EncounterPregnancyNotActiveError,
  EncounterPregnancyNotFoundError,
  InvalidEncounterPregnancyDateError,
} from "./encounter.errors";

export async function validateEncounterPregnancy(
  patientId: string,
  pregnancyId: string | null,
  occurredAt: Date,
) {
  if (!pregnancyId) {
    return null;
  }

  const pregnancy =
    await db.pregnancy.findUnique({
      where: {
        id: pregnancyId,
      },
      select: {
        id: true,
        patientId: true,
        status: true,
        lastMenstrualDate: true,
        endedAt: true,
      },
    });

  if (!pregnancy) {
    throw new EncounterPregnancyNotFoundError();
  }

  if (
    pregnancy.patientId !==
    patientId
  ) {
    throw new EncounterPregnancyMismatchError();
  }

  if (
    pregnancy.status !==
    PregnancyStatus.ACTIVE
  ) {
    throw new EncounterPregnancyNotActiveError();
  }

  if (
    pregnancy.lastMenstrualDate &&
    occurredAt.getTime() <
      pregnancy.lastMenstrualDate.getTime()
  ) {
    throw new InvalidEncounterPregnancyDateError();
  }

  if (
    pregnancy.endedAt &&
    occurredAt.getTime() >
      pregnancy.endedAt.getTime()
  ) {
    throw new InvalidEncounterPregnancyDateError();
  }

  return pregnancy;
}
