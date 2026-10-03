import {
  EncounterStatus,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  InvalidVitalSignsRecordedAtError,
  VitalSignsEncounterNotEditableError,
  VitalSignsEncounterNotFoundError,
} from "./vital-signs.errors";

export async function requireVitalSignsEncounter(
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
        organizationId: true,
        status: true,
        occurredAt: true,
      },
    });

  if (!encounter) {
    throw new VitalSignsEncounterNotFoundError();
  }

  return encounter;
}

export function assertEncounterAllowsVitalSigns(
  status: EncounterStatus,
): void {
  if (
    status ===
      EncounterStatus.COMPLETED ||
    status ===
      EncounterStatus.CANCELLED
  ) {
    throw new VitalSignsEncounterNotEditableError();
  }
}

export function assertVitalSignsTimeline(
  encounterOccurredAt: Date,
  recordedAt: Date,
): void {
  if (
    recordedAt.getTime() <
    encounterOccurredAt.getTime()
  ) {
    throw new InvalidVitalSignsRecordedAtError();
  }
}
