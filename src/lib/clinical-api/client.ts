import type {
  ClinicalAllergy,
  ClinicalContext,
  ClinicalEncounter,
  ClinicalFlag,
  ClinicalPatient,
  ClinicalPregnancy,
  ClinicalRevision,
  MeowsEvaluation,
} from "./types";

const ORGANIZATION_STORAGE_KEY = "pap.activeOrganizationId";

export class ClinicalApiError extends Error {
  constructor(
    public readonly status: number,

    public readonly code: string,

    message: string,
  ) {
    super(message);

    this.name = "ClinicalApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;

    message?: string;
  };

  if (!response.ok) {
    throw new ClinicalApiError(
      response.status,

      body.error ?? "HTTP_ERROR",

      body.message ?? "Falha na operação clínica.",
    );
  }

  return body as T;
}

export async function getClinicalContext(): Promise<ClinicalContext> {
  const response = await fetch("/api/clinical/context", {
    credentials: "include",

    cache: "no-store",
  });

  return parseResponse<ClinicalContext>(response);
}

export async function resolveOrganizationId(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Organization context requires browser.");
  }

  const stored = window.localStorage.getItem(ORGANIZATION_STORAGE_KEY);

  const context = await getClinicalContext();

  if (context.organizations.length === 0) {
    throw new ClinicalApiError(
      403,
      "NO_ACTIVE_HEALTH_UNIT",
      "Nenhuma unidade de saúde ativa está disponível.",
    );
  }

  if (
    stored &&
    context.organizations.some((organization) => organization.id === stored)
  ) {
    return stored;
  }

  const organizationId = context.organizations[0]?.id;

  if (!organizationId) {
    throw new ClinicalApiError(
      403,
      "NO_ACTIVE_HEALTH_UNIT",
      "Nenhuma unidade de saúde ativa está disponível.",
    );
  }

  window.localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId);

  return organizationId;
}

export function setActiveOrganizationId(organizationId: string) {
  window.localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId);
}

async function clinicalFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const organizationId = await resolveOrganizationId();

  const headers = new Headers(init.headers);

  headers.set("x-organization-id", organizationId);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/clinical${path}`, {
    ...init,

    credentials: "include",

    cache: "no-store",

    headers,
  });

  return parseResponse<T>(response);
}

export async function listPatients(query = "") {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";

  return clinicalFetch<{
    items: ClinicalPatient[];
  }>(`/patients${suffix}`);
}

export async function getPatient(patientId: string) {
  return clinicalFetch<{
    patient: ClinicalPatient;
  }>(`/patients/${patientId}`);
}

export async function createPatient(input: {
  fullName: string;
  birthDate: string;
  cpf?: string | null;
  cns?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  return clinicalFetch<{
    patient: ClinicalPatient;
  }>("/patients", {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function listPregnancies(patientId: string) {
  return clinicalFetch<{
    items: ClinicalPregnancy[];
  }>(`/patients/${patientId}/pregnancies`);
}

export async function createPregnancy(
  patientId: string,
  input: {
    lastMenstrualDate?: string | null;

    estimatedDueDate?: string | null;

    firstPrenatalAt?: string | null;
  },
) {
  return clinicalFetch<{
    pregnancy: ClinicalPregnancy;
  }>(`/patients/${patientId}/pregnancies`, {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function listEncounters(patientId?: string) {
  const suffix = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";

  return clinicalFetch<{
    items: ClinicalEncounter[];
  }>(`/encounters${suffix}`);
}

export async function createEncounter(input: {
  patientId: string;

  pregnancyId?: string | null;

  chiefComplaint?: string | null;
}) {
  return clinicalFetch<{
    encounter: ClinicalEncounter;
  }>("/encounters", {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function transitionEncounter(
  encounterId: string,

  action: "start" | "complete" | "cancel",

  reason?: string,
) {
  return clinicalFetch<{
    encounter: ClinicalEncounter;
  }>(`/encounters/${encounterId}`, {
    method: "PATCH",

    body: JSON.stringify({
      action,
      reason,
    }),
  });
}

export async function createVitalSigns(
  encounterId: string,

  input: Record<string, unknown>,
) {
  return clinicalFetch<{
    vitalSigns: unknown;
  }>(`/encounters/${encounterId}/vital-signs`, {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function createObstetricData(
  encounterId: string,

  input: Record<string, unknown>,
) {
  return clinicalFetch<{
    obstetricData: unknown;
  }>(`/encounters/${encounterId}/obstetric-data`, {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function evaluateMeows(
  encounterId: string,

  clinicalNotes?: string | null,
) {
  return clinicalFetch<{
    evaluation: MeowsEvaluation;
  }>(`/encounters/${encounterId}/meows`, {
    method: "POST",

    body: JSON.stringify({
      clinicalNotes,
    }),
  });
}

export async function listAllergies(patientId: string) {
  return clinicalFetch<{
    items: ClinicalAllergy[];
  }>(`/patients/${patientId}/allergies`);
}

export async function listFlags(patientId: string) {
  return clinicalFetch<{
    items: ClinicalFlag[];
  }>(`/patients/${patientId}/flags`);
}

export async function listRevisions(patientId: string) {
  return clinicalFetch<{
    items: ClinicalRevision[];
  }>(`/patients/${patientId}/revisions`);
}
