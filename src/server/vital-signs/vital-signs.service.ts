import { AccessDeniedError } from "../iam/authorization.errors";
import { PERMISSIONS } from "../iam/permissions";
import { requireClinicalProvenanceScope, recordClinicalMeasurementProvenance } from "../clinical-revision/clinical-provenance.service";
import type { Prisma } from "@prisma/client";
import { inClinicalWriteTransaction, lockEditableEncounter } from "../encounters/clinical-write-transaction";
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
  client: Prisma.TransactionClient = db,
) {
  const vitalSigns =
    await client.vitalSigns.findUnique({
      where: {
        encounterId,
      },
    });

  if (!vitalSigns) {
    throw new VitalSignsNotFoundError();
  }

  return vitalSigns;
}

export function createVitalSigns(
  input: CreateVitalSignsInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => createVitalSignsInTransaction(input, tx), client);
}

async function createVitalSignsInTransaction(
  input: CreateVitalSignsInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, input.encounterId);
  const encounter =
    await requireVitalSignsEncounter(
      input.encounterId,
      client,
    );

  assertEncounterAllowsVitalSigns(
    encounter.status,
  );

  await requireClinicalProvenanceScope(client, input.actorContext, encounter.patientId, PERMISSIONS.VITAL_SIGNS_CREATE);
  if (input.actorContext.organizationId !== encounter.organizationId) throw new AccessDeniedError();

  const existing =
    await client.vitalSigns.findUnique({
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

  const result = await client.vitalSigns.create({
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
  await recordClinicalMeasurementProvenance(client, { actorContext: input.actorContext, resourceType: "VITAL_SIGNS", resourceId: result.id, before: null });
  return result;
}

export async function getVitalSignsByEncounter(
  encounterId: string,
) {
  return requireVitalSigns(
    encounterId,
  );
}

export function updateVitalSigns(
  encounterId: string,
  input: UpdateVitalSignsInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => updateVitalSignsInTransaction(encounterId, input, tx), client);
}

async function updateVitalSignsInTransaction(
  encounterId: string,
  input: UpdateVitalSignsInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, encounterId);
  const current =
    await requireVitalSigns(
      encounterId,
      client,
    );

  const encounter =
    await requireVitalSignsEncounter(
      encounterId,
      client,
    );

  assertEncounterAllowsVitalSigns(
    encounter.status,
  );

  await requireClinicalProvenanceScope(client, input.actorContext, encounter.patientId, PERMISSIONS.VITAL_SIGNS_UPDATE);
  if (input.actorContext.organizationId !== encounter.organizationId) throw new AccessDeniedError();

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

  const result = await client.vitalSigns.update({
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
  await recordClinicalMeasurementProvenance(client, { actorContext: input.actorContext, resourceType: "VITAL_SIGNS", resourceId: result.id, before: current });
  return result;
}
