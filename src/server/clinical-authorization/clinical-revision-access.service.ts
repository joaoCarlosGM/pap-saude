import {
  PERMISSIONS,
} from "../iam/permissions";

import {
  requireClinicalPatientScope,
  requireClinicalResourceAccess,
} from "./clinical-authorization.service";

import type {
  ClinicalResourceType,
} from "./clinical-authorization.types";

export async function requireClinicalRevisionReadAccess(
  input: {
    userId: string;
    organizationId: string;
    patientId: string;
  },
) {
  return requireClinicalPatientScope({
    ...input,

    permission:
      PERMISSIONS.CLINICAL_REVISION_READ,
  });
}

export async function requireClinicalRevisionCreateAccess(
  input: {
    userId: string;
    organizationId: string;
    resourceType:
      ClinicalResourceType;
    resourceId: string;
  },
) {
  return requireClinicalResourceAccess({
    ...input,

    permission:
      PERMISSIONS.CLINICAL_REVISION_CREATE,
  });
}
