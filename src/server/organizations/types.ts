import type {
  OrganizationStatus,
  OrganizationType,
} from "@prisma/client";

export type OrganizationScope = {
  organizationId: string;
  userId: string;
};

export type OrganizationKind =
  | "PAP"
  | "MUNICIPALITY"
  | "HEALTH_UNIT";

export interface CreateOrganizationInput {
  type: OrganizationType;
  name: string;

  parentId?: string | null;

  code?: string | null;
  cnes?: string | null;
  cnpj?: string | null;

  city?: string | null;
  state?: string | null;
  address?: string | null;

  status?: OrganizationStatus;
}

export interface SearchOrganizationsInput {
  query?: string;
  type?: OrganizationType;
  status?: OrganizationStatus;
  city?: string;
  state?: string;
  parentId?: string;
  limit?: number;
}
