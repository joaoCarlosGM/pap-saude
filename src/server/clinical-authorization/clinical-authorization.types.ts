import type {
  PermissionKey,
} from "../iam/permissions";

export type ClinicalResourceType =
  | "PATIENT"
  | "PREGNANCY"
  | "ENCOUNTER"
  | "VITAL_SIGNS"
  | "OBSTETRIC_DATA"
  | "ALLERGY"
  | "CLINICAL_FLAG"
  | "MEOWS_EVALUATION";

export type ClinicalAuthorizationContext = {
  userId: string;
  organizationId: string;

  permission:
    PermissionKey;

  resourceType:
    ClinicalResourceType;

  resourceId: string;
};

export type ResolvedClinicalResource = {
  patientId: string;
  organizationId:
    string | null;
};
