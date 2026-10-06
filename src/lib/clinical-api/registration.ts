import type { RegistrationData } from "@/types/registration";

import {
  createEncounter,
  createObstetricData,
  createPatient,
  createPregnancy,
  createVitalSigns,
  evaluateMeows,
  listPatients,
  listPregnancies,
  transitionEncounter,
} from "./client";

function optionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const number = Number(trimmed);

  return Number.isFinite(number) ? number : undefined;
}

function requiredNumber(value: string, field: string) {
  const result = optionalNumber(value);

  if (result === undefined) {
    throw new Error(`${field} é obrigatório.`);
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

  return mapping[value] ?? "NOT_PERFORMED";
}

function optionalBoolean(value: string) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export async function submitClinicalRegistration(data: RegistrationData) {
  const cpf = data.cpf.replace(/\D/g, "");

  let patientId: string;

  if (cpf) {
    const existing = await listPatients(cpf);

    const patient = existing.items.find((item) => item.cpf === cpf);

    if (patient) {
      patientId = patient.id;
    } else {
      const created = await createPatient({
        fullName: data.nomeCompleto,

        birthDate: data.dataNascimento,

        cpf,
      });

      patientId = created.patient.id;
    }
  } else {
    const created = await createPatient({
      fullName: data.nomeCompleto,

      birthDate: data.dataNascimento,
    });

    patientId = created.patient.id;
  }

  const pregnancies = await listPregnancies(patientId);

  let pregnancy =
    pregnancies.items.find((item) => item.status === "ACTIVE") ?? null;

  if (!pregnancy && (data.primeiroAtendimento || data.dum.trim())) {
    const created = await createPregnancy(patientId, {
      lastMenstrualDate: data.dum.trim() || null,

      firstPrenatalAt: data.primeiroAtendimento
        ? new Date().toISOString()
        : null,
    });

    pregnancy = created.pregnancy;
  }

  const createdEncounter = await createEncounter({
    patientId,

    pregnancyId: pregnancy?.id ?? null,

    chiefComplaint: data.queixasPrincipais.trim() || null,
  });

  const encounterId = createdEncounter.encounter.id;

  await transitionEncounter(encounterId, "start");

  await createVitalSigns(encounterId, {
    systolicBp: requiredNumber(data.paSistolica, "PA sistólica"),

    diastolicBp: requiredNumber(data.paDiastolica, "PA diastólica"),

    heartRate: requiredNumber(data.frequenciaCardiaca, "Frequência cardíaca"),

    respiratoryRate: requiredNumber(
      data.frequenciaRespiratoria,
      "Frequência respiratória",
    ),

    temperature: optionalNumber(data.temperatura),

    oxygenSaturation: optionalNumber(data.saturacaoO2),

    consciousness: data.nivelConsciencia || "ALERT",

    urineOutputMl: optionalNumber(data.debitoUrinario),

    proteinuria: mapProteinuria(data.proteinuria),
  });

  await createObstetricData(encounterId, {
    uterineHeightCm: optionalNumber(data.alturaUterina),

    fetalHeartRate: optionalNumber(data.bcf),

    fetalMovement: optionalBoolean(data.movimentacaoFetal),

    edema: data.edema || "NONE",

    bleeding: optionalBoolean(data.sangramentoVaginal),

    weightKg: optionalNumber(data.pesoAtual),

    complaints: data.queixasPrincipais.trim() || null,

    notes: data.observacoesProfissional.trim() || null,
  });

  const meows = await evaluateMeows(
    encounterId,

    data.observacoesProfissional.trim() || null,
  );

  await transitionEncounter(encounterId, "complete");

  return {
    patientId,
    pregnancyId: pregnancy?.id ?? null,
    encounterId,
    meows: meows.evaluation,
  };
}
