import {
  createHash,
} from "node:crypto";

import {
  OrganizationCandidateStatus,
  OrganizationLeadTemperature,
  OrganizationRequestStatus,
  OrganizationStatus,
  OrganizationType,
  type OrganizationCandidate,
  type OrganizationRequest,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  ExistingOrganizationFoundError,
  InvalidCandidateTransitionError,
  InvalidOrganizationCandidateError,
  OrganizationCandidateUnavailableError,
} from "./discovery.errors";

export interface RequestOrganizationRegistrationInput {
  requestedByUserId: string;
  type: OrganizationType;
  name: string;
  cnes?: string | null;
  cnpj?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
}

export interface OrganizationRegistrationRequestResult {
  candidate: OrganizationCandidate;
  request: OrganizationRequest;
  requestCount: number;
  isNewCandidate: boolean;
}

export interface ConvertOrganizationCandidateInput {
  candidateId: string;
  parentId: string;
}

function text(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value
      .trim()
      .replace(/\s+/g, " ");

  return normalized
    ? normalized.slice(
        0,
        maxLength,
      )
    : null;
}

function digits(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized =
    value.replace(
      /\D/g,
      "",
    );

  return normalized || null;
}

function normalizeCnes(
  value: string | null | undefined,
): string | null {
  const normalized =
    digits(value);

  if (
    normalized !== null &&
    !/^\d{7}$/.test(
      normalized,
    )
  ) {
    throw new InvalidOrganizationCandidateError();
  }

  return normalized;
}

function normalizeCnpj(
  value: string | null | undefined,
): string | null {
  const normalized =
    digits(value);

  if (
    normalized !== null &&
    !/^\d{14}$/.test(
      normalized,
    )
  ) {
    throw new InvalidOrganizationCandidateError();
  }

  return normalized;
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .normalize("NFKD")
    .replace(
      /\p{Diacritic}/gu,
      "",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    )
    .toLowerCase();
}

function buildDedupeKey(
  type: OrganizationType,
  normalizedName: string,
  cnes: string | null,
  city: string | null,
  state: string | null,
): string {
  const identity =
    cnes
      ? `cnes:${cnes}`
      : [
          "identity",
          type,
          normalizedName,
          normalizeSearchText(
            city ?? "",
          ),
          state ?? "",
        ].join("|");

  return createHash("sha256")
    .update(
      identity,
      "utf8",
    )
    .digest("hex");
}

export function deriveLeadTemperature(
  requestCount: number,
): OrganizationLeadTemperature {
  if (requestCount >= 15) {
    return OrganizationLeadTemperature.HOT;
  }

  if (requestCount >= 5) {
    return OrganizationLeadTemperature.WARM;
  }

  return OrganizationLeadTemperature.COLD;
}

async function requireRequestingUser(
  userId: string,
): Promise<void> {
  const user =
    await db.user.findUnique({
      where: {
        id:
          userId,
      },
      select: {
        isActive:
          true,
      },
    });

  if (!user?.isActive) {
    throw new InvalidOrganizationCandidateError();
  }
}

async function findExistingOrganization(
  type: OrganizationType,
  name: string,
  cnes: string | null,
  city: string | null,
  state: string | null,
) {
  if (cnes !== null) {
    const byCnes =
      await db.organization.findUnique({
        where: {
          cnes,
        },
      });

    if (byCnes) {
      return byCnes;
    }
  }

  return db.organization.findFirst({
    where: {
      type,
      name: {
        equals:
          name,
        mode:
          "insensitive",
      },
      city:
        city
          ? {
              equals:
                city,
              mode:
                "insensitive",
            }
          : null,
      state:
        state ?? null,
    },
  });
}

export async function requestOrganizationRegistration(
  input: RequestOrganizationRegistrationInput,
): Promise<OrganizationRegistrationRequestResult> {
  await requireRequestingUser(
    input.requestedByUserId,
  );

  if (
    input.type ===
    OrganizationType.PAP
  ) {
    throw new InvalidOrganizationCandidateError();
  }

  const name =
    text(
      input.name,
      200,
    );

  if (!name) {
    throw new InvalidOrganizationCandidateError();
  }

  const normalizedName =
    normalizeSearchText(
      name,
    );

  const city =
    text(
      input.city,
      120,
    );

  const state =
    text(
      input.state,
      2,
    )?.toUpperCase() ?? null;

  const cnes =
    normalizeCnes(
      input.cnes,
    );

  const cnpj =
    normalizeCnpj(
      input.cnpj,
    );

  if (
    input.type !==
      OrganizationType.HEALTH_UNIT &&
    cnes !== null
  ) {
    throw new InvalidOrganizationCandidateError();
  }

  const existingOrganization =
    await findExistingOrganization(
      input.type,
      name,
      cnes,
      city,
      state,
    );

  if (existingOrganization) {
    throw new ExistingOrganizationFoundError(
      existingOrganization.id,
    );
  }

  const dedupeKey =
    buildDedupeKey(
      input.type,
      normalizedName,
      cnes,
      city,
      state,
    );

  return db.$transaction(
    async tx => {
      let candidate =
        await tx.organizationCandidate.findUnique({
          where: {
            dedupeKey,
          },
        });

      const isNewCandidate =
        candidate === null;

      if (!candidate) {
        candidate =
          await tx.organizationCandidate.create({
            data: {
              type:
                input.type,
              name,
              normalizedName,
              dedupeKey,
              cnes,
              cnpj,
              city,
              state,
              address:
                text(
                  input.address,
                  500,
                ),
            },
          });
      }

      if (
        candidate.convertedOrganizationId !==
          null ||
        candidate.status ===
          OrganizationCandidateStatus.APPROVED ||
        candidate.status ===
          OrganizationCandidateStatus.REJECTED ||
        candidate.status ===
          OrganizationCandidateStatus.DUPLICATE ||
        candidate.status ===
          OrganizationCandidateStatus.CLOSED
      ) {
        throw new OrganizationCandidateUnavailableError();
      }

      const request =
        await tx.organizationRequest.upsert({
          where: {
            candidateId_requestedByUserId: {
              candidateId:
                candidate.id,
              requestedByUserId:
                input.requestedByUserId,
            },
          },
          create: {
            candidateId:
              candidate.id,
            requestedByUserId:
              input.requestedByUserId,
            status:
              OrganizationRequestStatus.REQUESTED,
          },
          update: {
            status:
              OrganizationRequestStatus.REQUESTED,
          },
        });

      const requestCount =
        await tx.organizationRequest.count({
          where: {
            candidateId:
              candidate.id,
            status:
              OrganizationRequestStatus.REQUESTED,
          },
        });

      const leadTemperature =
        deriveLeadTemperature(
          requestCount,
        );

      if (
        candidate.leadTemperature !==
        leadTemperature
      ) {
        candidate =
          await tx.organizationCandidate.update({
            where: {
              id:
                candidate.id,
            },
            data: {
              leadTemperature,
            },
          });
      }

      return {
        candidate,
        request,
        requestCount,
        isNewCandidate,
      };
    },
  );
}

const allowedTransitions:
  Record<
    OrganizationCandidateStatus,
    OrganizationCandidateStatus[]
  > = {
    NEW: [
      OrganizationCandidateStatus.QUALIFYING,
      OrganizationCandidateStatus.REJECTED,
      OrganizationCandidateStatus.DUPLICATE,
      OrganizationCandidateStatus.CLOSED,
    ],

    QUALIFYING: [
      OrganizationCandidateStatus.CONTACTED,
      OrganizationCandidateStatus.REJECTED,
      OrganizationCandidateStatus.DUPLICATE,
      OrganizationCandidateStatus.CLOSED,
    ],

    CONTACTED: [
      OrganizationCandidateStatus.INTERESTED,
      OrganizationCandidateStatus.REJECTED,
      OrganizationCandidateStatus.CLOSED,
    ],

    INTERESTED: [
      OrganizationCandidateStatus.VALIDATING,
      OrganizationCandidateStatus.REJECTED,
      OrganizationCandidateStatus.CLOSED,
    ],

    VALIDATING: [
      OrganizationCandidateStatus.REJECTED,
      OrganizationCandidateStatus.CLOSED,
    ],

    APPROVED: [],
    REJECTED: [],
    DUPLICATE: [],
    CLOSED: [],
  };

export async function transitionOrganizationCandidate(
  candidateId: string,
  nextStatus: OrganizationCandidateStatus,
): Promise<OrganizationCandidate> {
  const candidate =
    await db.organizationCandidate.findUnique({
      where: {
        id:
          candidateId,
      },
    });

  if (!candidate) {
    throw new OrganizationCandidateUnavailableError();
  }

  if (
    !allowedTransitions[
      candidate.status
    ].includes(
      nextStatus,
    )
  ) {
    throw new InvalidCandidateTransitionError();
  }

  return db.organizationCandidate.update({
    where: {
      id:
        candidateId,
    },
    data: {
      status:
        nextStatus,
    },
  });
}

export async function withdrawOrganizationRequest(
  requestId: string,
): Promise<OrganizationRequest> {
  const request =
    await db.organizationRequest.findUnique({
      where: {
        id:
          requestId,
      },
    });

  if (
    !request ||
    request.status !==
      OrganizationRequestStatus.REQUESTED
  ) {
    throw new OrganizationCandidateUnavailableError();
  }

  return db.$transaction(
    async tx => {
      const withdrawn =
        await tx.organizationRequest.update({
          where: {
            id:
              requestId,
          },
          data: {
            status:
              OrganizationRequestStatus.WITHDRAWN,
          },
        });

      const requestCount =
        await tx.organizationRequest.count({
          where: {
            candidateId:
              request.candidateId,
            status:
              OrganizationRequestStatus.REQUESTED,
          },
        });

      await tx.organizationCandidate.update({
        where: {
          id:
            request.candidateId,
        },
        data: {
          leadTemperature:
            deriveLeadTemperature(
              requestCount,
            ),
        },
      });

      return withdrawn;
    },
  );
}

export async function convertOrganizationCandidate(
  input: ConvertOrganizationCandidateInput,
) {
  return db.$transaction(
    async tx => {
      const candidate =
        await tx.organizationCandidate.findUnique({
          where: {
            id:
              input.candidateId,
          },
        });

      if (
        !candidate ||
        candidate.status !==
          OrganizationCandidateStatus.VALIDATING ||
        candidate.convertedOrganizationId !==
          null
      ) {
        throw new OrganizationCandidateUnavailableError();
      }

      const parent =
        await tx.organization.findUnique({
          where: {
            id:
              input.parentId,
          },
          select: {
            id:
              true,
            type:
              true,
            status:
              true,
          },
        });

      if (
        !parent ||
        parent.status ===
          OrganizationStatus.ARCHIVED
      ) {
        throw new InvalidOrganizationCandidateError();
      }

      if (
        candidate.type ===
          OrganizationType.MUNICIPALITY &&
        parent.type !==
          OrganizationType.PAP
      ) {
        throw new InvalidOrganizationCandidateError();
      }

      if (
        candidate.type ===
          OrganizationType.HEALTH_UNIT &&
        parent.type !==
          OrganizationType.MUNICIPALITY
      ) {
        throw new InvalidOrganizationCandidateError();
      }

      if (
        candidate.type ===
        OrganizationType.PAP
      ) {
        throw new InvalidOrganizationCandidateError();
      }

      /*
       * CAS claims conversion. If two workers try to convert
       * the same lead, only one transaction is allowed through.
       */
      const claimed =
        await tx.organizationCandidate.updateMany({
          where: {
            id:
              candidate.id,
            status:
              OrganizationCandidateStatus.VALIDATING,
            convertedOrganizationId:
              null,
          },
          data: {
            status:
              OrganizationCandidateStatus.APPROVED,
          },
        });

      if (claimed.count !== 1) {
        throw new OrganizationCandidateUnavailableError();
      }

      const organization =
        await tx.organization.create({
          data: {
            type:
              candidate.type,
            status:
              OrganizationStatus.PENDING_VERIFICATION,
            name:
              candidate.name,
            cnes:
              candidate.cnes,
            cnpj:
              candidate.cnpj,
            city:
              candidate.city,
            state:
              candidate.state,
            address:
              candidate.address,
            parentId:
              parent.id,
            isActive:
              false,
          },
        });

      await tx.organizationCandidate.update({
        where: {
          id:
            candidate.id,
        },
        data: {
          convertedOrganizationId:
            organization.id,
        },
      });

      await tx.organizationRequest.updateMany({
        where: {
          candidateId:
            candidate.id,
          status:
            OrganizationRequestStatus.REQUESTED,
        },
        data: {
          status:
            OrganizationRequestStatus.RESOLVED,
        },
      });

      return {
        candidate:
          await tx.organizationCandidate.findUniqueOrThrow({
            where: {
              id:
                candidate.id,
            },
          }),
        organization,
      };
    },
  );
}
