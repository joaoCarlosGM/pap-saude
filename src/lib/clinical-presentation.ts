/** Minimal view DTOs shared by REAL and DEMO. No services, scores or credentials.
 * Each server-authorized provider owns its source; views never choose a source. */
export type PatientRecordPresentation={
 patient:{id:string;fullName:string;socialName?:string|null;birthDate:string;cpf:string|null;cns:string|null;phone:string|null};
 pregnancies:{id:string;status:string;lastMenstrualDate:string|null;estimatedDueDate:string|null}[];
 encounters:{id:string;status:string;occurredAt:string;chiefComplaint:string|null}[];
 allergies:{id:string;substance:string;reaction:string|null}[];
 flags:{id:string;label:string;details:string|null}[];
 revisions:{id:string;resourceType:string;reason:string|null;occurredAt:string}[];
};
