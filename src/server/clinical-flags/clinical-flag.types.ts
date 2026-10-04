import type {
  ClinicalFlagStatus,
} from "@prisma/client";

export type CreateClinicalFlagInput = {
  patientId: string;
  code: string;
  label: string;
  details?: string | null;
  notedAt?: Date | string;
};

export type UpdateClinicalFlagInput = {
  label?: string;
  details?: string | null;
  notedAt?: Date | string;
};

export type EndClinicalFlagInput = {
  flagId: string;
  status: Exclude<
    ClinicalFlagStatus,
    "ACTIVE"
  >;
};
