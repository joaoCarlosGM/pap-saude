"use client"

import Link from "next/link"
import { useDemo } from "@/components/demo/DemoProvider"
import { registrationErrors } from "@/lib/demo/data"
import { normalizeIdentifier } from "@/lib/demo/validation"
import { useState,useRef,useEffect } from "react"

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

  primeiroAtendimento: null,
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
  const {save,patients}=useDemo()
  const errorRef=useRef<HTMLDivElement>(null)
  const [errors,setErrors]=useState<string[]>([])
  useEffect(()=>{if(errors.length)errorRef.current?.focus()},[errors])
  const [saved,setSaved]=useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [registration, setRegistration] =
    useState<RegistrationData>(initialRegistration)

  const nextStep = () => {
    const found=registrationErrors(registration,currentStep);setErrors(found);if(found.length)return
    setCurrentStep((step) => Math.min(step + 1, 5))
  }

  const previousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  const restart = () => {
    setSaved(false);setErrors([])
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
    if(saved)return
    try {save(registration);setSaved(true);setErrors([])} catch(error){setErrors([error instanceof Error?error.message:"Não foi possível salvar a simulação."])}
  }

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        {errors.length>0 && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.map(e=><p key={e}>{e}</p>)}</div>}
        {saved && <p role="status" className="mb-4 text-sm text-emerald-700">Registro demonstrativo salvo na memória desta aba. <Link prefetch={false} className="underline" href={"/pacientes/"+patients.find(p=>normalizeIdentifier(p.cpf)===normalizeIdentifier(registration.cpf))?.id}>Abrir ficha da paciente</Link></p>}
        <Stepper currentStep={currentStep} />

        <div key={currentStep} data-motion-step>
        {currentStep === 1 && (
          <IdentificationStep
            onNew={restart}
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
            onBack={previousStep}
            onChange={updateRegistration}
            saved={saved}
            onRestart={restart}
            onSave={saveRegistration}
          />
        )}
        </div>
      </CardContent>
    </Card>
  )
}