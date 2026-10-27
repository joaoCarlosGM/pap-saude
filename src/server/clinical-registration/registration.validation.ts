import { ConsciousnessState, EdemaGrade, ProteinuriaResult } from "@prisma/client";
import type { RegistrationData } from "@/types/registration";
import { normalizePatientBirthDate, normalizePatientCpf, normalizePatientName } from "../patients/patient.validation";
import { normalizeHistoricalPregnancyDate } from "../pregnancies/pregnancy.validation";
import { normalizeChiefComplaint } from "../encounters/encounter.validation";
import { normalizeConsciousness, normalizeOxygenSaturation, normalizePositiveInteger, normalizeProteinuria, normalizeTemperature, normalizeUrineOutput } from "../vital-signs/vital-signs.validation";
import { normalizeComplaints, normalizeEdema, normalizeNonNegativeDecimal, normalizeNotes, normalizePositiveDecimal, normalizePositiveInteger as normalizeFetalHeartRate } from "../obstetric-data/obstetric-data.validation";

const FIELDS = [
  "cpf", "nomeCompleto", "dataNascimento", "primeiroAtendimento", "dum",
  "paSistolica", "paDiastolica", "frequenciaCardiaca", "frequenciaRespiratoria",
  "temperatura", "saturacaoO2", "nivelConsciencia", "debitoUrinario", "proteinuria",
  "alturaUterina", "bcf", "movimentacaoFetal", "edema", "sangramentoVaginal",
  "pesoAtual", "queixasPrincipais", "observacoesProfissional",
] as const satisfies readonly (keyof RegistrationData)[];

export class RegistrationInputError extends Error {
  constructor() { super("REGISTRATION_INVALID_INPUT"); }
}

function numeric(value: string, required = false): number | undefined {
  if (!value.trim()) {
    if (required) throw new RegistrationInputError();
    return undefined;
  }
  const result = Number(value);
  if (!Number.isFinite(result)) throw new RegistrationInputError();
  return result;
}
function integerStorage(value: number | null) {
  if (value !== null && value > 2_147_483_647) throw new RegistrationInputError();
  return value;
}
function decimalStorage(value: number | null, maximum: number) {
  if (value !== null && value > maximum) throw new RegistrationInputError();
  return value;
}
function optionalBoolean(value: string): boolean | null {
  if (!value) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new RegistrationInputError();
}

/** Reuses the authoritative domain validators; introduces no medical thresholds. */
export function validateRegistrationPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RegistrationInputError();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== FIELDS.length || FIELDS.some(field => !Object.hasOwn(record, field))) throw new RegistrationInputError();
  if (FIELDS.some(field => typeof record[field] !== (field === "primeiroAtendimento" ? "boolean" : "string"))) throw new RegistrationInputError();
  const input = record as RegistrationData;
  try {
    return {
      patient: {
        fullName: normalizePatientName(input.nomeCompleto),
        cpf: normalizePatientCpf(input.cpf),
        birthDate: normalizePatientBirthDate(input.dataNascimento),
      },
      pregnancy: {
        firstPrenatal: input.primeiroAtendimento,
        lastMenstrualDate: normalizeHistoricalPregnancyDate(input.dum.trim() || null),
      },
      chiefComplaint: normalizeChiefComplaint(input.queixasPrincipais),
      vitalSigns: {
        systolicBp: integerStorage(normalizePositiveInteger("systolicBp", numeric(input.paSistolica, true)!))!,
        diastolicBp: integerStorage(normalizePositiveInteger("diastolicBp", numeric(input.paDiastolica, true)!))!,
        heartRate: integerStorage(normalizePositiveInteger("heartRate", numeric(input.frequenciaCardiaca, true)!))!,
        respiratoryRate: integerStorage(normalizePositiveInteger("respiratoryRate", numeric(input.frequenciaRespiratoria, true)!))!,
        temperature: decimalStorage(normalizeTemperature(numeric(input.temperatura)), 999.9),
        oxygenSaturation: normalizeOxygenSaturation(numeric(input.saturacaoO2)),
        consciousness: normalizeConsciousness((input.nivelConsciencia || ConsciousnessState.ALERT) as ConsciousnessState),
        urineOutputMl: integerStorage(normalizeUrineOutput(numeric(input.debitoUrinario))),
        proteinuria: normalizeProteinuria((input.proteinuria || ProteinuriaResult.NOT_PERFORMED) as ProteinuriaResult),
      },
      obstetricData: {
        uterineHeightCm: decimalStorage(normalizeNonNegativeDecimal("uterineHeightCm", numeric(input.alturaUterina), 2), 999.99),
        fetalHeartRate: integerStorage(normalizeFetalHeartRate("fetalHeartRate", numeric(input.bcf))),
        fetalMovement: optionalBoolean(input.movimentacaoFetal),
        edema: normalizeEdema((input.edema || EdemaGrade.NONE) as EdemaGrade),
        bleeding: optionalBoolean(input.sangramentoVaginal),
        weightKg: decimalStorage(normalizePositiveDecimal("weightKg", numeric(input.pesoAtual), 2), 9999.99),
        complaints: normalizeComplaints(input.queixasPrincipais),
        notes: normalizeNotes(input.observacoesProfissional),
      },
    };
  } catch {
    // Field values and raw validation errors never enter logs or HTTP errors.
    throw new RegistrationInputError();
  }
}
export type NormalizedRegistrationPayload = ReturnType<typeof validateRegistrationPayload>;
