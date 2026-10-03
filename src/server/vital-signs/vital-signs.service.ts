import {
  ConsciousnessState,
  ProteinuriaResult,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  assertEncounterAllowsVitalSigns,
  assertVitalSignsTimeline,
  requireVitalSignsEncounter,
} from "./vital-signs-consistency";

import {
  VitalSignsAlreadyRecordedError,
  VitalSignsNotFoundError,
} from "./vital-signs.errors";

import {
  type CreateVitalSignsInput,
  type UpdateVitalSignsInput,
} from "./vital-signs.types";

import {
  normalizeConsciousness,
  normalizeOxygenSaturation,
  normalizePositiveInteger,
  normalizeProteinuria,
  normalizeTemperature,
  normalizeUrineOutput,
  normalizeVitalSignsRecordedAt,
} from "./vital-signs.validation";

async function requireVitalSigns(
  encounterId: string,
) {
  const vitalSigns =
    await db.vitalSigns.findUnique({
      where: {
        encounterId,
      },
    });

  if (!vitalSigns) {
    throw new VitalSignsNotFoundError();
  }

  return vitalSigns;
}

export async function createVitalSigns(
  input: CreateVitalSignsInput,
) {
  const encounter =
    await requireVitalSignsEncounter(
      input.encounterId,
    );

  assertEncounterAllowsVitalSigns(
    encounter.status,
  );

  const existing =
    await db.vitalSigns.findUnique({
      where: {
        encounterId:
          input.encounterId,
      },
      select: {
        id: true,
      },
    });

  if (existing) {
    throw new VitalSignsAlreadyRecordedError();
  }

  const recordedAt =
    normalizeVitalSignsRecordedAt(
      input.recordedAt,
    );

  assertVitalSignsTimeline(
    encounter.occurredAt,
    recordedAt,
  );

  return db.vitalSigns.create({
    data: {
      encounterId:
        input.encounterId,

      systolicBp:
        normalizePositiveInteger(
          "systolicBp",
          input.systolicBp,
        ),

      diastolicBp:
        normalizePositiveInteger(
          "diastolicBp",
          input.diastolicBp,
        ),

      heartRate:
        normalizePositiveInteger(
          "heartRate",
          input.heartRate,
        ),

      respiratoryRate:
        normalizePositiveInteger(
          "respiratoryRate",
          input.respiratoryRate,
        ),

      temperature:
        normalizeTemperature(
          input.temperature,
        ),

      oxygenSaturation:
        normalizeOxygenSaturation(
          input.oxygenSaturation,
        ),

      consciousness:
        normalizeConsciousness(
          input.consciousness ??
            ConsciousnessState.ALERT,
        ),

      urineOutputMl:
        normalizeUrineOutput(
          input.urineOutputMl,
        ),

      proteinuria:
        normalizeProteinuria(
          input.proteinuria ??
            ProteinuriaResult.NOT_PERFORMED,
        ),

      recordedAt,
    },
  });
}

export async function getVitalSignsByEncounter(
  encounterId: string,
) {
  return requireVitalSigns(
    encounterId,
  );
}

export async function updateVitalSigns(
  encounterId: string,
  input: UpdateVitalSignsInput,
) {
  const current =
    await requireVitalSigns(
      encounterId,
    );

  const encounter =
    await requireVitalSignsEncounter(
      encounterId,
    );

  assertEncounterAllowsVitalSigns(
    encounter.status,
  );

  const recordedAt =
    input.recordedAt !== undefined
      ? normalizeVitalSignsRecordedAt(
          input.recordedAt,
        )
      : current.recordedAt;

  assertVitalSignsTimeline(
    encounter.occurredAt,
    recordedAt,
  );

  return db.vitalSigns.update({
    where: {
      encounterId,
    },

    data: {
      ...(input.systolicBp !==
      undefined
        ? {
            systolicBp:
              normalizePositiveInteger(
                "systolicBp",
                input.systolicBp,
              ),
          }
        : {}),

      ...(input.diastolicBp !==
      undefined
        ? {
            diastolicBp:
              normalizePositiveInteger(
                "diastolicBp",
                input.diastolicBp,
              ),
          }
        : {}),

      ...(input.heartRate !==
      undefined
        ? {
            heartRate:
              normalizePositiveInteger(
                "heartRate",
                input.heartRate,
              ),
          }
        : {}),

      ...(input.respiratoryRate !==
      undefined
        ? {
            respiratoryRate:
              normalizePositiveInteger(
                "respiratoryRate",
                input.respiratoryRate,
              ),
          }
        : {}),

      ...(input.temperature !==
      undefined
        ? {
            temperature:
              normalizeTemperature(
                input.temperature,
              ),
          }
        : {}),

      ...(input.oxygenSaturation !==
      undefined
        ? {
            oxygenSaturation:
              normalizeOxygenSaturation(
                input.oxygenSaturation,
              ),
          }
        : {}),

      ...(input.consciousness !==
      undefined
        ? {
            consciousness:
              normalizeConsciousness(
                input.consciousness,
              ),
          }
        : {}),

      ...(input.urineOutputMl !==
      undefined
        ? {
            urineOutputMl:
              normalizeUrineOutput(
                input.urineOutputMl,
              ),
          }
        : {}),

      ...(input.proteinuria !==
      undefined
        ? {
            proteinuria:
              normalizeProteinuria(
                input.proteinuria,
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
