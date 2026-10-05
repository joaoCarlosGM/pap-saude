import {
  db,
} from "../db/client";

import {
  ClinicalResourceNotFoundError,
} from "./clinical-authorization.errors";

import type {
  ClinicalResourceType,
  ResolvedClinicalResource,
} from "./clinical-authorization.types";

export async function resolveClinicalResource(
  resourceType:
    ClinicalResourceType,
  resourceId: string,
): Promise<ResolvedClinicalResource> {
  switch (resourceType) {
    case "PATIENT": {
      const patient =
        await db.patient.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            id: true,
          },
        });

      if (!patient) {
        throw new ClinicalResourceNotFoundError();
      }

      return {
        patientId:
          patient.id,

        organizationId:
          null,
      };
    }

    case "PREGNANCY": {
      const pregnancy =
        await db.pregnancy.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            patientId: true,
          },
        });

      if (!pregnancy) {
        throw new ClinicalResourceNotFoundError();
      }

      return {
        patientId:
          pregnancy.patientId,

        organizationId:
          null,
      };
    }

    case "ENCOUNTER": {
      const encounter =
        await db.encounter.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            patientId: true,
            organizationId: true,
          },
        });

      if (!encounter) {
        throw new ClinicalResourceNotFoundError();
      }

      return encounter;
    }

    case "VITAL_SIGNS": {
      const record =
        await db.vitalSigns.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            encounter: {
              select: {
                patientId: true,
                organizationId: true,
              },
            },
          },
        });

      if (!record) {
        throw new ClinicalResourceNotFoundError();
      }

      return record.encounter;
    }

    case "OBSTETRIC_DATA": {
      const record =
        await db.obstetricData.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            encounter: {
              select: {
                patientId: true,
                organizationId: true,
              },
            },
          },
        });

      if (!record) {
        throw new ClinicalResourceNotFoundError();
      }

      return record.encounter;
    }

    case "ALLERGY": {
      const record =
        await db.allergy.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            patientId: true,
          },
        });

      if (!record) {
        throw new ClinicalResourceNotFoundError();
      }

      return {
        patientId:
          record.patientId,

        organizationId:
          null,
      };
    }

    case "CLINICAL_FLAG": {
      const record =
        await db.clinicalFlag.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            patientId: true,
          },
        });

      if (!record) {
        throw new ClinicalResourceNotFoundError();
      }

      return {
        patientId:
          record.patientId,

        organizationId:
          null,
      };
    }

    case "MEOWS_EVALUATION": {
      const record =
        await db.clinicalEvaluation.findUnique({
          where: {
            id:
              resourceId,
          },

          select: {
            patientId: true,

            encounter: {
              select: {
                organizationId:
                  true,
              },
            },
          },
        });

      if (!record) {
        throw new ClinicalResourceNotFoundError();
      }

      return {
        patientId:
          record.patientId,

        organizationId:
          record.encounter
            ?.organizationId ??
          null,
      };
    }
  }
}
