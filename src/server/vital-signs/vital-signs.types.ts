import {
  ConsciousnessState,
  ProteinuriaResult,
} from "@prisma/client";

export type CreateVitalSignsInput = {
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
