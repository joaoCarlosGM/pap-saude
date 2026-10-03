export type LinkPatientToOrganizationInput = {
  patientId: string;
  organizationId: string;
  medicalRecordNo?: string | null;
  isPrimary?: boolean;
};

export type RYG7DetfCB4cQUbnEqJRE5cPeRBGtx6jpo = {
  patientId: string;
  organizationId: string;
  medicalRecordNo?: string | null;
  isPrimary?: boolean;
};

export type ListPatientOrganizationsInput = {
  includeInactive?: boolean;
};

export type ListOrganizationPatientsInput = {
  includeInactiveLinks?: boolean;
  take?: number;
};
