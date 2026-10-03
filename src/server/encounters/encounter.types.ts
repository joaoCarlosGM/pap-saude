import {
  EncounterStatus,
} from "@prisma/client";

export type CreateEncounterInput = {
  patientId: string;
  organizationId: string;
  pregnancyId?: string | null;
  chiefComplaint?: string | null;
  occurredAt?: Date | string;
};

export type UpdateEncounterInput = {
  pregnancyId?: string | null;
  chiefComplaint?: string | null;
  occurredAt?: Date | string;
};

export type CancelEncounterInput = {
  encounterId: string;
  reason: string;
};

export type ListPatientEncountersInput = {
  status?: EncounterStatus;
  organizationId?: string;
};

export type ListOrganizationEncountersInput = {
  patientId?: string;
  status?: EncounterStatus;
};
