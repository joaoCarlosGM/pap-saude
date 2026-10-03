export type CreatePatientInput = {
  fullName: string;
  socialName?: string | null;
  cpf?: string | null;
  cns?: string | null;
  birthDate: Date | string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export type UpdatePatientDemographicsInput = {
  fullName?: string;
  socialName?: string | null;
  cpf?: string | null;
  cns?: string | null;
  birthDate?: Date | string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export type SearchPatientsInput = {
  query?: string;
  isActive?: boolean;
  take?: number;
};
