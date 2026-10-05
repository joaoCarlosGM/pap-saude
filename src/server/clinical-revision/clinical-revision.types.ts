import type {
  Prisma,
} from "@prisma/client";

export const CLINICAL_REVISION_RESOURCE_TYPES = [
  "PATIENT",
  "PREGNANCY",
  "ENCOUNTER",
  "VITAL_SIGNS",
  "OBSTETRIC_DATA",
  "ALLERGY",
  "CLINICAL_FLAG",
  "MEOWS_EVALUATION",
] as const;

export type ClinicalRevisionResourceType =
  (typeof CLINICAL_REVISION_RESOURCE_TYPES)[number];

export type RecordClinicalRevisionInput = {
  actorUserId: string;
  organizationId: string;
  patientId: string;

  resourceType:
    ClinicalRevisionResourceType;

  resourceId: string;

  reason: string;

  before:
    Prisma.InputJsonValue;

  after:
    Prisma.InputJsonValue;

  requestId?: string | null;
  correlationId?: string | null;
  sessionId?: string | null;

  metadata?:
    Prisma.InputJsonValue;
};

export type ListClinicalRevisionInput = {
  patientId: string;
  resourceType?:
    ClinicalRevisionResourceType;
  resourceId?: string;
};
