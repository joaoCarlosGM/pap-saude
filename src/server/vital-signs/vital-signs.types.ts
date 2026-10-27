import type { ClinicalMeasurementActorContext } from "../clinical-revision/clinical-provenance.service";
import {
  ConsciousnessState,
  ProteinuriaResult,
} from "@prisma/client";

export type CreateVitalSignsInput = {
  actorContext: ClinicalMeasurementActorContext;
  encounterId: string;

  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  respiratoryRate: number;

  temperature?: number | null;

  oxygenSaturation?:
    number | null;

  consciousness?:
    ConsciousnessState;

  urineOutputMl?:
    number | null;

  proteinuria?:
    ProteinuriaResult;

  recordedAt?:
    Date | string;
};

export type UpdateVitalSignsInput = {
  actorContext: ClinicalMeasurementActorContext;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;

  temperature?:
    number | null;

  oxygenSaturation?:
    number | null;

  consciousness?:
    ConsciousnessState;

  urineOutputMl?:
    number | null;

  proteinuria?:
    ProteinuriaResult;

  recordedAt?:
    Date | string;
};
