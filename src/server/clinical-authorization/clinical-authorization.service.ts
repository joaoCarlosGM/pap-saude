import {
  AccessDeniedError,
} from "../iam/authorization.errors";

import {
  requirePermission,
} from "../iam/authorization.service";

import {
  hasActivePatientOrganizationLink,
} from "../patients/patient-organization.service";

import {
  resolveClinicalResource,
} from "./clinical-resource-resolver";

import type {
  ClinicalAuthorizationContext,
} from "./clinical-authorization.types";

export async function requireClinicalPatientScope(
  input: {
    userId: string;
    organizationId: string;
    patientId: string;
    permission:
      ClinicalAuthorizationContext["permission"];
  },
) {
  await requirePermission({
    userId:
      input.userId,

    organizationId:
      input.organizationId,

    permission:
      input.permission,
  });

  const linked =
    await hasActivePatientOrganizationLink(
      input.patientId,
      input.organizationId,
    );

  if (!linked) {
    throw new AccessDeniedError();
  }

  return {
    allowed:
      true as const,

    patientId:
      input.patientId,

    organizationId:
      input.organizationId,
  };
}

export async function requireClinicalResourceAccess(
  input:
    ClinicalAuthorizationContext,
) {
  await requirePermission({
    userId:
      input.userId,

    organizationId:
      input.organizationId,

    permission:
      input.permission,
  });

  const resource =
    await resolveClinicalResource(
      input.resourceType,
      input.resourceId,
    );

  if (
    resource.organizationId &&
    resource.organizationId !==
      input.organizationId
  ) {
    throw new AccessDeniedError();
  }

  const linked =
    await hasActivePatientOrganizationLink(
      resource.patientId,
      input.organizationId,
    );

  if (!linked) {
    throw new AccessDeniedError();
  }

  return {
    allowed:
      true as const,

    patientId:
      resource.patientId,

    organizationId:
      input.organizationId,

    resourceType:
      input.resourceType,

    resourceId:
      input.resourceId,
  };
}
