import {
  Prisma,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  evaluateMeowsDraft,
} from "./meows-engine";

export class LRJx62kAYSNxChe9ftum37i5zmgM8WG9qd
  extends Error {
  constructor() {
    super("Encounter not found.");
    this.name =
      "LRJx62kAYSNxChe9ftum37i5zmgM8WG9qd";
  }
}

export class MeowsVitalSignsNotFoundError
  extends Error {
  constructor() {
    super(
      "Vital signs not found for encounter.",
    );

    this.name =
      "MeowsVitalSignsNotFoundError";
  }
}

export async function evaluateEncounterMeows(
  encounterId: string,
) {
  const encounter =
    await db.encounter.findUnique({
      where: {
        id:
          encounterId,
      },

      select: {
        id: true,
        patientId: true,

        vitalSigns: {
          select: {
            systolicBp: true,
            diastolicBp: true,
            heartRate: true,
            respiratoryRate: true,
            temperature: true,
            oxygenSaturation:
              true,
            consciousness:
              true,
          },
        },
      },
    });

  if (!encounter) {
    throw new LRJx62kAYSNxChe9ftum37i5zmgM8WG9qd();
  }

  if (!encounter.vitalSigns) {
    throw new MeowsVitalSignsNotFoundError();
  }

  const result =
    evaluateMeowsDraft({
      systolicBp:
        encounter.vitalSigns
          .systolicBp,

      diastolicBp:
        encounter.vitalSigns
          .diastolicBp,

      heartRate:
        encounter.vitalSigns
          .heartRate,

      respiratoryRate:
        encounter.vitalSigns
          .respiratoryRate,

      temperature:
        encounter.vitalSigns
          .temperature === null
          ? null
          : Number(
              encounter.vitalSigns
                .temperature,
            ),

      oxygenSaturation:
        encounter.vitalSigns
          .oxygenSaturation,

      consciousness:
        encounter.vitalSigns
          .consciousness,
    });

  return {
    encounter,
    result,
  };
}

export async function persistEncounterMeowsEvaluation(
  encounterId: string,
  clinicalNotes?:
    string | null,
) {
  const {
    encounter,
    result,
  } =
    await evaluateEncounterMeows(
      encounterId,
    );

  return db.clinicalEvaluation.create({
    data: {
      patientId:
        encounter.patientId,

      encounterId:
        encounter.id,

      status:
        result.status,

      meowsScore:
        result.totalScore,

      alertLevel:
        result.alertLevel,

      protocolId:
        result.protocolId,

      protocolVersion:
        result.protocolVersion,

      protocolStatus:
        result.protocolStatus,

      clinicallyValidated:
        result.clinicallyValidated,

      componentScores:
        result.componentScores as
          Prisma.InputJsonValue,

      missingParameters:
        result.missingParameters,

      unresolvedParameters:
        result.unresolvedParameters,

      clinicalNotes:
        clinicalNotes?.trim() ||
        null,
    },
  });
}

export async function listEncounterMeowsEvaluations(
  encounterId: string,
) {
  return db.clinicalEvaluation.findMany({
    where: {
      encounterId,
    },

    orderBy: {
      evaluatedAt:
        "desc",
    },
  });
}
