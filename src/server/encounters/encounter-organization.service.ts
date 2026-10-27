import type { Prisma } from "@prisma/client";
import {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  hasActivePatientOrganizationLink,
} from "../patients/patient-organization.service";

import {
  EncounterPatientNotLinkedError,
  InactivePatientEncounterError,
  InvalidEncounterOrganizationError,
} from "./encounter.errors";

export async function requireEncounterOrganizationContext(
  patientId: string,
  organizationId: string,
  client: Prisma.TransactionClient = db,
) {
  const [
    patient,
    organization,
  ] =
    await Promise.all([
      client.patient.findUnique({
        where: {
          id: patientId,
        },
        select: {
          id: true,
          isActive: true,
        },
      }),
      client.organization.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          type: true,
          status: true,
          isActive: true,
        },
      }),
    ]);

  if (
    !patient ||
    !patient.isActive
  ) {
    throw new InactivePatientEncounterError();
  }

  if (
    !organization ||
    organization.type !==
      OrganizationType.HEALTH_UNIT ||
    organization.status !==
      OrganizationStatus.ACTIVE ||
    !organization.isActive
  ) {
    throw new InvalidEncounterOrganizationError();
  }

  const linked =
    await hasActivePatientOrganizationLink(
      patientId,
      organizationId,
      client,
    );

  if (!linked) {
    throw new EncounterPatientNotLinkedError();
  }

  return {
    patient,
    organization,
  };
}
