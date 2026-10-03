import {
  PregnancyStatus,
} from "@prisma/client";

export type CreatePregnancyInput = {
  patientId: string;
  lastMenstrualDate?: Date | string | null;
  estimatedDueDate?: Date | string | null;
  firstPrenatalAt?: Date | string | null;
  gravida?: number | null;
  parity?: number | null;
};

export type UpdatePregnancyInput = {
  lastMenstrualDate?: Date | string | null;
  estimatedDueDate?: Date | string | null;
  firstPrenatalAt?: Date | string | null;
  gravida?: number | null;
  parity?: number | null;
};

export type EndPregnancyInput = {
  pregnancyId: string;
  endedAt?: Date | string;
};

export type ListPatientPregnanciesInput = {
  status?: PregnancyStatus;
};
