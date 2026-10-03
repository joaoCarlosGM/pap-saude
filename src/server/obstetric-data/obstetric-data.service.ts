import {
  EdemaGrade,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  assertEncounterAllowsObstetricData,
  assertObstetricTimeline,
  requireObstetricEncounter,
} from "./obstetric-data-consistency";

import {
  ObstetricDataAlreadyRecordedError,
  ObstetricDataNotFoundError,
} from "./obstetric-data.errors";

import {
  type CreateObstetricDataInput,
  type UpdateObstetricDataInput,
} from "./obstetric-data.types";

import {
  normalizeComplaints,
  normalizeEdema,
  normalizeNonNegativeDecimal,
  normalizeNotes,
  normalizeObstetricRecordedAt,
  normalizePositiveDecimal,
  normalizePositiveInteger,
} from "./obstetric-data.validation";

async function requireObstetricData(
  encounterId: string,
) {
  const data =
    await db.obstetricData.findUnique({
      where: {
        encounterId,
      },
    });

  if (!data) {
    throw new ObstetricDataNotFoundError();
  }

  return data;
}

export async function createObstetricData(
  input: CreateObstetricDataInput,
) {
  const encounter =
    await requireObstetricEncounter(
      input.encounterId,
    );

  assertEncounterAllowsObstetricData(
    encounter.status,
  );

  const existing =
    await db.obstetricData.findUnique({
      where: {
        encounterId:
          input.encounterId,
      },
      select: {
        id: true,
      },
    });

  if (existing) {
    throw new ObstetricDataAlreadyRecordedError();
  }

  const recordedAt =
    normalizeObstetricRecordedAt(
      input.recordedAt,
    );

  assertObstetricTimeline(
    encounter.occurredAt,
    recordedAt,
  );

  return db.obstetricData.create({
    data: {
      encounterId:
        input.encounterId,

      uterineHeightCm:
        normalizeNonNegativeDecimal(
          "uterineHeightCm",
          input.uterineHeightCm,
          2,
        ),

      fetalHeartRate:
        normalizePositiveInteger(
          "fetalHeartRate",
          input.fetalHeartRate,
        ),

      fetalMovement:
        input.fetalMovement ??
        null,

      edema:
        normalizeEdema(
          input.edema ??
            EdemaGrade.NONE,
        ),

      bleeding:
        input.bleeding ??
        null,

      weightKg:
        normalizePositiveDecimal(
          "weightKg",
          input.weightKg,
          2,
        ),

      complaints:
        normalizeComplaints(
          input.complaints,
        ),

      notes:
        normalizeNotes(
          input.notes,
        ),

      recordedAt,
    },
  });
}

export async function getObstetricDataByEncounter(
  encounterId: string,
) {
  return requireObstetricData(
    encounterId,
  );
}

export async function updateObstetricData(
  encounterId: string,
  input: UpdateObstetricDataInput,
) {
  const current =
    await requireObstetricData(
      encounterId,
    );

  const encounter =
    await requireObstetricEncounter(
      encounterId,
    );

  assertEncounterAllowsObstetricData(
    encounter.status,
  );

  const recordedAt =
    input.recordedAt !== undefined
      ? normalizeObstetricRecordedAt(
          input.recordedAt,
        )
      : current.recordedAt;

  assertObstetricTimeline(
    encounter.occurredAt,
    recordedAt,
  );

  return db.obstetricData.update({
    where: {
      encounterId,
    },

    data: {
      ...(input.uterineHeightCm !==
      undefined
        ? {
            uterineHeightCm:
              normalizeNonNegativeDecimal(
                "uterineHeightCm",
                input.uterineHeightCm,
                2,
              ),
          }
        : {}),

      ...(input.fetalHeartRate !==
      undefined
        ? {
            fetalHeartRate:
              normalizePositiveInteger(
                "fetalHeartRate",
                input.fetalHeartRate,
              ),
          }
        : {}),

      ...(input.fetalMovement !==
      undefined
        ? {
            fetalMovement:
              input.fetalMovement,
          }
        : {}),

      ...(input.edema !==
      undefined
        ? {
            edema:
              normalizeEdema(
                input.edema,
              ),
          }
        : {}),

      ...(input.bleeding !==
      undefined
        ? {
            bleeding:
              input.bleeding,
          }
        : {}),

      ...(input.weightKg !==
      undefined
        ? {
            weightKg:
              normalizePositiveDecimal(
                "weightKg",
                input.weightKg,
                2,
              ),
          }
        : {}),

      ...(input.complaints !==
      undefined
        ? {
            complaints:
              normalizeComplaints(
                input.complaints,
              ),
          }
        : {}),

      ...(input.notes !==
      undefined
        ? {
            notes:
              normalizeNotes(
                input.notes,
              ),
          }
        : {}),

      ...(input.recordedAt !==
      undefined
        ? {
            recordedAt,
          }
        : {}),
    },
  });
}
