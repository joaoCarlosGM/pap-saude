import {
  AllergyStatus,
} from "@prisma/client";

import {
  db,
} from "../db/client";

import {
  AllergyFinalizedError,
  AllergyNotFoundError,
  AllergyPatientInactiveError,
  AllergyPatientNotFoundError,
  InvalidAllergyTransitionError,
} from "./allergy.errors";

import {
  type CreateAllergyInput,
  type EndAllergyInput,
  type UpdateAllergyInput,
} from "./allergy.types";

import {
  normalizeAllergyNotedAt,
  normalizeAllergyReaction,
  normalizeAllergySeverity,
  normalizeAllergySubstance,
} from "./allergy.validation";

async function requirePatient(
  patientId: string,
) {
  const patient =
    await db.patient.findUnique({
      where: {
        id: patientId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!patient) {
    throw new AllergyPatientNotFoundError();
  }

  return patient;
}

async function requireAllergy(
  allergyId: string,
) {
  const allergy =
    await db.allergy.findUnique({
      where: {
        id: allergyId,
      },
    });

  if (!allergy) {
    throw new AllergyNotFoundError();
  }

  return allergy;
}

function assertAllergyEditable(
  status: AllergyStatus,
): void {
  if (
    status !==
    AllergyStatus.ACTIVE
  ) {
    throw new AllergyFinalizedError();
  }
}

export async function createAllergy(
  input: CreateAllergyInput,
) {
  const patient =
    await requirePatient(
      input.patientId,
    );

  if (!patient.isActive) {
    throw new AllergyPatientInactiveError();
  }

  return db.allergy.create({
    data: {
      patientId:
        patient.id,

      substance:
        normalizeAllergySubstance(
          input.substance,
        ),

      reaction:
        normalizeAllergyReaction(
          input.reaction,
        ),

      severity:
        normalizeAllergySeverity(
          input.severity,
        ),

      status:
        AllergyStatus.ACTIVE,

      notedAt:
        normalizeAllergyNotedAt(
          input.notedAt,
        ),
    },
  });
}

export async function getAllergyById(
  allergyId: string,
) {
  return requireAllergy(
    allergyId,
  );
}

export async function listPatientAllergies(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.allergy.findMany({
    where: {
      patientId,
    },
    orderBy: {
      notedAt:
        "desc",
    },
  });
}

export async function listActivePatientAllergies(
  patientId: string,
) {
  await requirePatient(
    patientId,
  );

  return db.allergy.findMany({
    where: {
      patientId,
      status:
        AllergyStatus.ACTIVE,
    },
    orderBy: {
      notedAt:
        "desc",
    },
  });
}

export async function updateAllergy(
  allergyId: string,
  input: UpdateAllergyInput,
) {
  const allergy =
    await requireAllergy(
      allergyId,
    );

  assertAllergyEditable(
    allergy.status,
  );

  return db.allergy.update({
    where: {
      id: allergyId,
    },
    data: {
      ...(input.substance !==
      undefined
        ? {
            substance:
              normalizeAllergySubstance(
                input.substance,
              ),
          }
        : {}),

      ...(input.reaction !==
      undefined
        ? {
            reaction:
              normalizeAllergyReaction(
                input.reaction,
              ),
          }
        : {}),

      ...(input.severity !==
      undefined
        ? {
            severity:
              normalizeAllergySeverity(
                input.severity,
              ),
          }
        : {}),

      ...(input.notedAt !==
      undefined
        ? {
            notedAt:
              normalizeAllergyNotedAt(
                input.notedAt,
              ),
          }
        : {}),
    },
  });
}

export async function endAllergy(
  input: EndAllergyInput,
) {
  const allergy =
    await requireAllergy(
      input.allergyId,
    );

  if (
    allergy.status !==
    AllergyStatus.ACTIVE
  ) {
    throw new InvalidAllergyTransitionError();
  }

  return db.allergy.update({
    where: {
      id:
        input.allergyId,
    },
    data: {
      status:
        input.status,
      endedAt:
        new Date(),
    },
  });
}
