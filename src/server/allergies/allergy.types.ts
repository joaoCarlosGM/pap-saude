import type {
  AllergyStatus,
} from "@prisma/client";

export type CreateAllergyInput = {
  patientId: string;
  substance: string;
  reaction?: string | null;
  severity?: string | null;
  notedAt?: Date | string;
};

export type UpdateAllergyInput = {
  substance?: string;
  reaction?: string | null;
  severity?: string | null;
  notedAt?: Date | string;
};

export type EndAllergyInput = {
  allergyId: string;
  status: Exclude<
    AllergyStatus,
    "ACTIVE"
  >;
};
