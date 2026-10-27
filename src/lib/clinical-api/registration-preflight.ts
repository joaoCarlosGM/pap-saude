import type { RegistrationData } from "@/types/registration";

function optionalNumber(value: string, field: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const number = Number(trimmed);

  if (!Number.isFinite(number)) {
    throw new Error(`${field} deve ser um número válido.`);
  }

  return number;
}

function requiredNumber(value: string, field: string) {
  const result = optionalNumber(value, field);

  if (result === undefined) {
    throw new Error(`${field} é obrigatório.`);
  }

  if (!Number.isInteger(result) || result <= 0 || result > 2_147_483_647) {
    throw new Error(`${field} deve ser um inteiro positivo.`);
  }

  return result;
}

function mapProteinuria(value: string) {
  const mapping: Record<string, string> = {
    "": "NOT_PERFORMED",
    NOT_PERFORMED: "NOT_PERFORMED",
    NEGATIVE: "NEGATIVE",
    TRACE: "TRACE",
    ONE_PLUS: "ONE_PLUS",
    TWO_PLUS: "TWO_PLUS",
    THREE_PLUS: "THREE_PLUS",
    FOUR_PLUS: "FOUR_PLUS",
  };

  if (!Object.hasOwn(mapping, value)) {
    throw new Error("Proteinúria inválida.");
  }

  return mapping[value];
}

function optionalBoolean(value: string, field: string) {
  if (!value) return undefined;
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${field} inválido.`);
}

function validateOptionalNumber(
  value: number | undefined,
  field: string,
  minimum: number,
  decimals: number,
  inclusive = true,
  maximum = Number.POSITIVE_INFINITY,
) {
  if (value === undefined) return;
  const scale = 10 ** decimals;
  if (
    (inclusive ? value < minimum : value <= minimum) ||
    value > maximum ||
    Math.abs(value * scale - Math.round(value * scale)) > 1e-9
  ) {
    throw new Error(`${field} inválido.`);
  }
}

function validateHistoricalDate(value: string, field: string, optional = false) {
  if (optional && !value.trim()) return;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
    throw new Error(`${field} inválida.`);
  }
}

/** Validate every deterministic payload before any request can create a record.
 * Server validation remains authoritative; network failures still need recovery.
 */
export function validateClinicalRegistrationLocally(data: RegistrationData) {
  const cpf = data.cpf.replace(/\D/g, "");
  const fullName = data.nomeCompleto.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 200) {
    throw new Error("Nome completo inválido.");
  }
  if (cpf && cpf.length !== 11) throw new Error("CPF inválido.");
  validateHistoricalDate(data.dataNascimento, "Data de nascimento");
  validateHistoricalDate(data.dum, "DUM", true);
  const chiefComplaint = data.queixasPrincipais.trim() || null;
  const notes = data.observacoesProfissional.trim() || null;
  if ((chiefComplaint?.length ?? 0) > 2000 || (notes?.length ?? 0) > 5000) {
    throw new Error("Texto clínico excede o limite permitido.");
  }
  const vitalSigns = {
    systolicBp: requiredNumber(data.paSistolica, "PA sistólica"),
    diastolicBp: requiredNumber(data.paDiastolica, "PA diastólica"),
    heartRate: requiredNumber(data.frequenciaCardiaca, "Frequência cardíaca"),
    respiratoryRate: requiredNumber(data.frequenciaRespiratoria, "Frequência respiratória"),
    temperature: optionalNumber(data.temperatura, "Temperatura"),
    oxygenSaturation: optionalNumber(data.saturacaoO2, "Saturação O2"),
    consciousness: data.nivelConsciencia || "ALERT",
    urineOutputMl: optionalNumber(data.debitoUrinario, "Débito urinário"),
    proteinuria: mapProteinuria(data.proteinuria),
  };
  validateOptionalNumber(vitalSigns.temperature, "Temperatura", 0, 1, false, 999.9);
  validateOptionalNumber(vitalSigns.oxygenSaturation, "Saturação O2", 0, 0, true, 100);
  validateOptionalNumber(vitalSigns.urineOutputMl, "Débito urinário", 0, 0, true, 2_147_483_647);
  if (!["ALERT", "VOICE", "PAIN", "UNRESPONSIVE"].includes(vitalSigns.consciousness)) {
    throw new Error("Nível de consciência inválido.");
  }
  const obstetricData = {
    uterineHeightCm: optionalNumber(data.alturaUterina, "Altura uterina"),
    fetalHeartRate: optionalNumber(data.bcf, "BCF"),
    fetalMovement: optionalBoolean(data.movimentacaoFetal, "Movimentação fetal"),
    edema: data.edema || "NONE",
    bleeding: optionalBoolean(data.sangramentoVaginal, "Sangramento"),
    weightKg: optionalNumber(data.pesoAtual, "Peso"),
    complaints: chiefComplaint,
    notes,
  };
  validateOptionalNumber(obstetricData.uterineHeightCm, "Altura uterina", 0, 2, true, 999.99);
  validateOptionalNumber(obstetricData.fetalHeartRate, "BCF", 0, 0, false, 2_147_483_647);
  validateOptionalNumber(obstetricData.weightKg, "Peso", 0, 2, false, 9999.99);
  if (!["NONE", "ONE_PLUS", "TWO_PLUS", "THREE_PLUS", "FOUR_PLUS"].includes(obstetricData.edema)) {
    throw new Error("Edema inválido.");
  }

}
