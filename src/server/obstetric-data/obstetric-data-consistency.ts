import {
  EncounterStatus,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  InvalidObstetricDataRecordedAtError,
  ObstetricDataEncounterNotEditableError,
  ObstetricDataEncounterNotFoundError,
} from "./obstetric-data.errors";

export async function requireObstetricEncounter(
  encounterId: string,
) {
  const encounter =
    await db.encounter.findUnique({
      where: {
        id: encounterId,
      },
      select: {
        id: true,
        patientId: true,
        pregnancyId: true,
        organizationId: true,
        status: true,
        occurredAt: true,
      },
    });

  if (!encounter) {
    throw new ObstetricDataEncounterNotFoundError();
  }

  return encounter;
}

export function assertEncounterAllowsObstetricData(
  status: EncounterStatus,
): void {
  if (
    status ===
      EncounterStatus.COMPLETED ||
    status ===
      EncounterStatus.CANCELLED
  ) {
    throw new ObstetricDataEncounterNotEditableError();
  }
}

export function assertObstetricTimeline(
  encounterOccurredAt: Date,
  recordedAt: Date,
): void {
  if (
    recordedAt.getTime() <
    encounterOccurredAt.getTime()
  ) {
    throw new InvalidObstetricDataRecordedAtError();
  }
}
