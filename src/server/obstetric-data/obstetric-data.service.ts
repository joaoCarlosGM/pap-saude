import { AccessDeniedError } from "../iam/authorization.errors";
import { PERMISSIONS } from "../iam/permissions";
import { requireClinicalProvenanceScope, recordClinicalMeasurementProvenance } from "../clinical-revision/clinical-provenance.service";
import type { Prisma } from "@prisma/client";
import { inClinicalWriteTransaction, lockEditableEncounter } from "../encounters/clinical-write-transaction";
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
  client: Prisma.TransactionClient = db,
) {
  const data =
    await client.obstetricData.findUnique({
      where: {
        encounterId,
      },
    });

  if (!data) {
    throw new ObstetricDataNotFoundError();
  }

  return data;
}

export function createObstetricData(
  input: CreateObstetricDataInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => createObstetricDataInTransaction(input, tx), client);
}

async function createObstetricDataInTransaction(
  input: CreateObstetricDataInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, input.encounterId);
  const encounter =
    await requireObstetricEncounter(
      input.encounterId,
      client,
    );

  assertEncounterAllowsObstetricData(
    encounter.status,
  );

  await requireClinicalProvenanceScope(client, input.actorContext, encounter.patientId, PERMISSIONS.OBSTETRIC_DATA_CREATE);
  if (input.actorContext.organizationId !== encounter.organizationId) throw new AccessDeniedError();

  const existing =
    await client.obstetricData.findUnique({
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

  const result = await client.obstetricData.create({
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
  await recordClinicalMeasurementProvenance(client, { actorContext: input.actorContext, resourceType: "OBSTETRIC_DATA", resourceId: result.id, before: null });
  return result;
}

export async function getObstetricDataByEncounter(
  encounterId: string,
) {
  return requireObstetricData(
    encounterId,
  );
}

export function updateObstetricData(
  encounterId: string,
  input: UpdateObstetricDataInput,
  client?: Prisma.TransactionClient,
) {
  return inClinicalWriteTransaction(tx => updateObstetricDataInTransaction(encounterId, input, tx), client);
}

async function updateObstetricDataInTransaction(
  encounterId: string,
  input: UpdateObstetricDataInput,
  client: Prisma.TransactionClient,
) {
  await lockEditableEncounter(client, encounterId);
  const current =
    await requireObstetricData(
      encounterId,
      client,
    );

  const encounter =
    await requireObstetricEncounter(
      encounterId,
      client,
    );

  assertEncounterAllowsObstetricData(
    encounter.status,
  );

  await requireClinicalProvenanceScope(client, input.actorContext, encounter.patientId, PERMISSIONS.OBSTETRIC_DATA_UPDATE);
  if (input.actorContext.organizationId !== encounter.organizationId) throw new AccessDeniedError();

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

  const result = await client.obstetricData.update({
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
  await recordClinicalMeasurementProvenance(client, { actorContext: input.actorContext, resourceType: "OBSTETRIC_DATA", resourceId: result.id, before: current });
  return result;
}
