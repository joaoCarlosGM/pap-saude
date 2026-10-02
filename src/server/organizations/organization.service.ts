import {
  OrganizationStatus,
  OrganizationType,
  type Organization,
} from "@prisma/client";

import { db } from "@/server/db/client";

import {
  InvalidOrganizationHierarchyError,
  InvalidOrganizationIdentifierError,
  OrganizationAlreadyArchivedError,
  OrganizationNotFoundError,
} from "./organization.errors";

import type {
  CreateOrganizationInput,
  SearchOrganizationsInput,
} from "./types";

function normalizeText(
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

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength,
  );
}

function normalizeState(
  value: string | null | undefined,
): string | null {
  const normalized =
    normalizeText(
      value,
      2,
    );

  return normalized?.toUpperCase() ?? null;
}

function normalizeDigits(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const digits =
    value.replace(/\D/g, "");

  return digits || null;
}

function normalizeCnes(
  value: string | null | undefined,
): string | null {
  const valueNormalized =
    normalizeDigits(value);

  if (valueNormalized === null) {
    return null;
  }

  if (!/^\d{7}$/.test(valueNormalized)) {
    throw new InvalidOrganizationIdentifierError();
  }

  return valueNormalized;
}

function normalizeCnpj(
  value: string | null | undefined,
): string | null {
  const valueNormalized =
    normalizeDigits(value);

  if (valueNormalized === null) {
    return null;
  }

  if (!/^\d{14}$/.test(valueNormalized)) {
    throw new InvalidOrganizationIdentifierError();
  }

  return valueNormalized;
}

async function validateParentHierarchy(
  type: OrganizationType,
  parentId: string | null,
): Promise<void> {
  if (type === OrganizationType.PAP) {
    if (parentId !== null) {
      throw new InvalidOrganizationHierarchyError();
    }

    return;
  }

  if (parentId === null) {
    throw new InvalidOrganizationHierarchyError();
  }

  const parent =
    await db.organization.findUnique({
      where: {
        id:
          parentId,
      },
      select: {
        id: true,
        type: true,
        status: true,
      },
    });

  if (!parent) {
    throw new InvalidOrganizationHierarchyError();
  }

  if (
    parent.status ===
    OrganizationStatus.ARCHIVED
  ) {
    throw new InvalidOrganizationHierarchyError();
  }

  if (
    type === OrganizationType.MUNICIPALITY &&
    parent.type !== OrganizationType.PAP
  ) {
    throw new InvalidOrganizationHierarchyError();
  }

  if (
    type === OrganizationType.HEALTH_UNIT &&
    parent.type !== OrganizationType.MUNICIPALITY
  ) {
    throw new InvalidOrganizationHierarchyError();
  }
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const name =
    normalizeText(
      input.name,
      200,
    );

  if (!name) {
    throw new InvalidOrganizationIdentifierError();
  }

  const parentId =
    normalizeText(
      input.parentId,
      100,
    );

  await validateParentHierarchy(
    input.type,
    parentId,
  );

  const cnes =
    normalizeCnes(
      input.cnes,
    );

  const cnpj =
    normalizeCnpj(
      input.cnpj,
    );

  /*
   * CNES only has institutional meaning for a health establishment.
   */
  if (
    input.type !== OrganizationType.HEALTH_UNIT &&
    cnes !== null
  ) {
    throw new InvalidOrganizationIdentifierError();
  }

  return db.organization.create({
    data: {
      type:
        input.type,
      status:
        input.status ??
        OrganizationStatus.PENDING_VERIFICATION,
      name,
      code:
        normalizeText(
          input.code,
          100,
        ),
      cnes,
      cnpj,
      city:
        normalizeText(
          input.city,
          120,
        ),
      state:
        normalizeState(
          input.state,
        ),
      address:
        normalizeText(
          input.address,
          500,
        ),
      parentId,
      isActive:
        (
          input.status ??
          OrganizationStatus.PENDING_VERIFICATION
        ) === OrganizationStatus.ACTIVE,
    },
  });
}

export async function getOrganizationById(
  organizationId: string,
): Promise<Organization> {
  const organization =
    await db.organization.findUnique({
      where: {
        id:
          organizationId,
      },
    });

  if (!organization) {
    throw new OrganizationNotFoundError();
  }

  return organization;
}

export async function activateOrganization(
  organizationId: string,
): Promise<Organization> {
  const organization =
    await getOrganizationById(
      organizationId,
    );

  if (
    organization.status ===
    OrganizationStatus.ARCHIVED
  ) {
    throw new OrganizationAlreadyArchivedError();
  }

  return db.organization.update({
    where: {
      id:
        organizationId,
    },
    data: {
      status:
        OrganizationStatus.ACTIVE,
      isActive:
        true,
    },
  });
}

export async function suspendOrganization(
  organizationId: string,
): Promise<Organization> {
  const organization =
    await getOrganizationById(
      organizationId,
    );

  if (
    organization.status ===
    OrganizationStatus.ARCHIVED
  ) {
    throw new OrganizationAlreadyArchivedError();
  }

  return db.organization.update({
    where: {
      id:
        organizationId,
    },
    data: {
      status:
        OrganizationStatus.SUSPENDED,
      isActive:
        false,
    },
  });
}

export async function archiveOrganization(
  organizationId: string,
): Promise<Organization> {
  const organization =
    await getOrganizationById(
      organizationId,
    );

  if (
    organization.status ===
    OrganizationStatus.ARCHIVED
  ) {
    return organization;
  }

  const activeChildren =
    await db.organization.count({
      where: {
        parentId:
          organizationId,
        status: {
          not:
            OrganizationStatus.ARCHIVED,
        },
      },
    });

  if (activeChildren > 0) {
    throw new InvalidOrganizationHierarchyError();
  }

  return db.organization.update({
    where: {
      id:
        organizationId,
    },
    data: {
      status:
        OrganizationStatus.ARCHIVED,
      isActive:
        false,
    },
  });
}

export async function searchOrganizations(
  input: SearchOrganizationsInput,
): Promise<Organization[]> {
  const query =
    normalizeText(
      input.query,
      200,
    );

  const limit =
    Math.min(
      Math.max(
        input.limit ?? 20,
        1,
      ),
      50,
    );

  const state =
    normalizeState(
      input.state,
    );

  const city =
    normalizeText(
      input.city,
      120,
    );

  return db.organization.findMany({
    where: {
      type:
        input.type,
      status:
        input.status,
      parentId:
        input.parentId,

      city:
        city
          ? {
              contains:
                city,
              mode:
                "insensitive",
            }
          : undefined,

      state:
        state ?? undefined,

      ...(query
        ? {
            OR: [
              {
                name: {
                  contains:
                    query,
                  mode:
                    "insensitive",
                },
              },
              {
                code: {
                  contains:
                    query,
                  mode:
                    "insensitive",
                },
              },
              {
                cnes: {
                  contains:
                    query,
                },
              },
              {
                cnpj: {
                  contains:
                    query.replace(
                      /\D/g,
                      "",
                    ),
                },
              },
            ],
          }
        : {}),
    },

    orderBy: [
      {
        status:
          "asc",
      },
      {
        name:
          "asc",
      },
    ],

    take:
      limit,
  });
}

export async function listOrganizationChildren(
  organizationId: string,
): Promise<Organization[]> {
  await getOrganizationById(
    organizationId,
  );

  return db.organization.findMany({
    where: {
      parentId:
        organizationId,
      status: {
        not:
          OrganizationStatus.ARCHIVED,
      },
    },
    orderBy: {
      name:
        "asc",
    },
  });
}
