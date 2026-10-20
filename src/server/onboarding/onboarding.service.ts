import {
  OnboardingStatus,
} from "@prisma/client"

import {
  db,
} from "@/server/db/client"

const TOUR_KEY_PATTERN =
  /^[a-z0-9][a-z0-9-]{1,79}$/

export function validateTourKey(
  tourKey: string,
) {
  if (
    tourKey === "security-first-access" || !TOUR_KEY_PATTERN.test(
      tourKey,
    )
  ) {
    throw new Error(
      "INVALID_ONBOARDING",
    )
  }

  return tourKey
}

export function validateTourVersion(
  version: number,
) {
  if (
    !Number.isInteger(
      version,
    ) ||
    version < 1 ||
    version > 10000
  ) {
    throw new Error(
      "INVALID_ONBOARDING",
    )
  }

  return version
}

export function validateCurrentStep(
  step: number,
) {
  if (
    !Number.isInteger(
      step,
    ) ||
    step < 0 ||
    step > 1000
  ) {
    throw new Error(
      "INVALID_ONBOARDING",
    )
  }

  return step
}

export async function getOnboardingProgress(
  userId: string,
  tourKey: string,
  tourVersion: number,
) {
  validateTourKey(
    tourKey,
  )

  validateTourVersion(
    tourVersion,
  )

  return db.userOnboardingProgress.findUnique({
    where: {
      userId_tourKey_tourVersion: {
        userId,
        tourKey,
        tourVersion,
      },
    },
  })
}

export async function setOnboardingProgress(
  input: {
    userId: string
    tourKey: string
    tourVersion: number
    status: OnboardingStatus
    currentStep: number
    now?: Date
  },
) {
  const tourKey =
    validateTourKey(
      input.tourKey,
    )

  const tourVersion =
    validateTourVersion(
      input.tourVersion,
    )

  const currentStep =
    validateCurrentStep(
      input.currentStep,
    )

  const now =
    input.now ??
    new Date()

  const existing =
    await db.userOnboardingProgress.findUnique({
      where: {
        userId_tourKey_tourVersion: {
          userId:
            input.userId,
          tourKey,
          tourVersion,
        },
      },
    })

  const stateDates =
    input.status ===
      OnboardingStatus.COMPLETED
      ? {
          completedAt:
            now,
          skippedAt:
            null,
        }
      : input.status ===
          OnboardingStatus.SKIPPED
        ? {
            completedAt:
              null,
            skippedAt:
              now,
          }
        : {
            completedAt:
              null,
            skippedAt:
              null,
          }

  return db.userOnboardingProgress.upsert({
    where: {
      userId_tourKey_tourVersion: {
        userId:
          input.userId,
        tourKey,
        tourVersion,
      },
    },

    create: {
      userId:
        input.userId,
      tourKey,
      tourVersion,
      status:
        input.status,
      currentStep,
      startedAt:
        now,
      ...stateDates,
    },

    update: {
      status:
        input.status,
      currentStep,
      startedAt:
        existing?.startedAt ??
        now,
      ...stateDates,
    },
  })
}
