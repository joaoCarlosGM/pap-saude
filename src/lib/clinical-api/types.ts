export type ClinicalOrganization = {
  id: string;
  name: string;
  cnes: string | null;
  city: string | null;
  state: string | null;
};

export type ClinicalContext = {
  user: {
    id: string;
    email: string;
    displayName: string;
  };

  organizations: ClinicalOrganization[];
};

export type ClinicalPatient = {
  id: string;
  cpf: string | null;
  cns: string | null;
  fullName: string;
  socialName: string | null;
  birthDate: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;

  medicalRecordNo?: string | null;

  isPrimary?: boolean;
};

export type ClinicalPregnancy = {
  id: string;
  patientId: string;
  status: "ACTIVE" | "COMPLETED" | "INTERRUPTED";

  lastMenstrualDate: string | null;

  estimatedDueDate: string | null;

  firstPrenatalAt: string | null;

  gravida: number | null;

  parity: number | null;

  endedAt: string | null;
};

export type ClinicalEncounter = {
  id: string;
  patientId: string;

  pregnancyId: string | null;

  organizationId: string;

  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

  chiefComplaint: string | null;

  occurredAt: string;

  startedAt: string | null;

  completedAt: string | null;

  cancelledAt: string | null;
};

export type ClinicalAllergy = {
  id: string;
  patientId: string;
  substance: string;

  reaction: string | null;

  severity: string | null;

  status: string;
  notedAt: string;
};

export type ClinicalFlag = {
  id: string;
  patientId: string;
  code: string;
  label: string;

  details: string | null;

  status: string;
  notedAt: string;
};

export type MeowsEvaluation = {
  id: string;
  patientId: string;

  encounterId: string | null;

  status: "COMPLETE" | "INCOMPLETE" | "POLICY_UNRESOLVED" | "INVALID";

  meowsScore: number | null;

  alertLevel: string | null;

  protocolId: string;
  protocolVersion: string;
  protocolStatus: string;

  clinicallyValidated: boolean;

  missingParameters: string[];

  unresolvedParameters: string[];

  clinicalNotes: string | null;

  evaluatedAt: string;
};

export type ClinicalRevision = {
  id: string;

  actorUserId: string | null;

  organizationId: string | null;

  patientId: string | null;

  resourceType: string;

  resourceId: string | null;

  reason: string | null;

  occurredAt: string;
};
