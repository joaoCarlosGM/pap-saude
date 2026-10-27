"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/Card";

import Stepper from "./Stepper";
import IdentificationStep from "./steps/IdentificationStep";
import PregnancyStep from "./steps/PregnancyStep";
import VitalSignsStep from "./steps/VitalSignsStep";
import ObstetricStep from "./steps/ObstetricStep";
import ResultStep from "./steps/ResultStep";

import type { RegistrationData } from "@/types/registration";

import type { MeowsEvaluation } from "@/lib/clinical-api";

import { submitClinicalRegistration, resumeClinicalRegistration, restartClinicalRegistration } from "@/lib/clinical-api";

const initialRegistration: RegistrationData = {
  cpf: "",
  nomeCompleto: "",
  dataNascimento: "",

  primeiroAtendimento: true,
  dum: "",

  paSistolica: "",
  paDiastolica: "",
  frequenciaCardiaca: "",
  frequenciaRespiratoria: "",
  temperatura: "",
  saturacaoO2: "",
  nivelConsciencia: "",
  debitoUrinario: "",
  proteinuria: "",

  alturaUterina: "",
  bcf: "",
  movimentacaoFetal: "",
  edema: "",
  sangramentoVaginal: "",
  pesoAtual: "",

  queixasPrincipais: "",
  observacoesProfissional: "",
};

export default function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(1);

  const [registration, setRegistration] =
    useState<RegistrationData>(initialRegistration);

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [savedEvaluation, setSavedEvaluation] =
    useState<MeowsEvaluation | null>(null);

  const [operationNotice, setOperationNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const checkOperation = useCallback(async () => {
    setChecking(true);
    try {
      const state = await resumeClinicalRegistration();
      if (state?.status === "COMPLETED") {
        setSavedEvaluation(state.registration.meows);
        setCurrentStep(5);
        setOperationNotice("O registro anterior foi confirmado. Confira o resultado antes de iniciar outro registro.");
      } else if (state?.status === "NOT_FOUND") {
        setOperationNotice("Há uma operação anterior sem confirmação. Consulte novamente, repita com os mesmos dados ou escolha Novo Registro para cancelá-la com segurança. Nenhum dado da paciente foi armazenado no navegador.");
      }
    } catch (error) {
      setOperationNotice(error instanceof Error ? error.message : "Não foi possível consultar a operação anterior.");
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    const scheduled = window.setTimeout(() => { void checkOperation(); }, 0);
    return () => window.clearTimeout(scheduled);
  }, [checkOperation]);

  const nextStep = () => {
    setCurrentStep((step) => Math.min(step + 1, 5));
  };

  const previousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const restart = async () => {
    if (saving || checking) return;
    setSaving(true);
    try {
      const state = await restartClinicalRegistration(Boolean(savedEvaluation));
      if (state?.status === "COMPLETED" && !savedEvaluation) {
        setSavedEvaluation(state.registration.meows);
        setCurrentStep(5);
        setOperationNotice("O registro anterior já foi confirmado. Confira o resultado; escolha Novo Registro novamente somente para iniciar outro atendimento.");
        return;
      }
      setRegistration(initialRegistration);
      setCurrentStep(1);
      setSaveError(null);
      setSavedEvaluation(null);
      setOperationNotice(null);
    } catch (error) {
      setOperationNotice(error instanceof Error ? error.message : "Não foi possível cancelar a operação anterior. Sua identificação foi preservada.");
    } finally { setSaving(false); }
  };

  const updateRegistration = (data: Partial<RegistrationData>) => {
    setRegistration((current) => ({
      ...current,
      ...data,
    }));
  };

  const saveRegistration = async () => {
    if (saving || checking || savedEvaluation) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const result = await submitClinicalRegistration(registration);

      setSavedEvaluation(result.meows);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o registro.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        {operationNotice && <section aria-label="Recuperação do registro" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p role="status">{operationNotice}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={saving || checking} onClick={() => void checkOperation()} className="rounded border px-3 py-2">Consultar estado</button>
            <button type="button" disabled={saving || checking} onClick={() => void restart()} className="rounded border px-3 py-2">Novo Registro</button>
          </div>
        </section>}
        {checking && <p role="status">Consultando a operação anterior…</p>}
        <Stepper currentStep={currentStep} />

        {currentStep === 1 && (
          <IdentificationStep
            data={registration}
            onChange={updateRegistration}
            onNext={nextStep}
          />
        )}

        {currentStep === 2 && (
          <PregnancyStep
            data={registration}
            onChange={updateRegistration}
            onNext={nextStep}
            onBack={previousStep}
          />
        )}

        {currentStep === 3 && (
          <VitalSignsStep
            data={registration}
            onChange={updateRegistration}
            onNext={nextStep}
            onBack={previousStep}
          />
        )}

        {currentStep === 4 && (
          <ObstetricStep
            data={registration}
            onChange={updateRegistration}
            onNext={nextStep}
            onBack={previousStep}
          />
        )}

        {currentStep === 5 && (
          <ResultStep
            data={registration}
            onRestart={() => void restart()}
            onSave={saveRegistration}
            saving={saving || checking}
            saveError={saveError}
            savedEvaluation={savedEvaluation}
          />
        )}
      </CardContent>
    </Card>
  );
}
