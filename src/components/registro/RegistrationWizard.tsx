"use client"

import { useState } from "react"

import { Card, CardContent } from "@/components/ui/Card"

import Stepper from "./Stepper"
import IdentificationStep from "./steps/IdentificationStep"
import PregnancyStep from "./steps/PregnancyStep"
import VitalSignsStep from "./steps/VitalSignsStep"
import ObstetricStep from "./steps/ObstetricStep"
import ResultStep from "./steps/ResultStep"

import type { RegistrationData } from "@/types/registration"

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
}

export default function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(1)

  const [registration, setRegistration] =
    useState<RegistrationData>(initialRegistration)

  const nextStep = () => {
    setCurrentStep((step) => Math.min(step + 1, 5))
  }

  const previousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  const restart = () => {
    setRegistration(initialRegistration)
    setCurrentStep(1)
  }

  const updateRegistration = (
    data: Partial<RegistrationData>,
  ) => {
    setRegistration((current) => ({
      ...current,
      ...data,
    }))
  }

  const saveRegistration = () => {
    console.log("Registro salvo:", registration)
  }

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardContent className="p-4 sm:p-6 lg:p-8">
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
            onRestart={restart}
            onSave={saveRegistration}
          />
        )}
      </CardContent>
    </Card>
  )
}