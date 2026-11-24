"use client"

import Link from "next/link"
import AgendaPanel from "../agenda/AgendaPanel"
import { useDemo } from "@/features/vitrine-premium/components/demo/DemoProvider"
import { registrationErrors } from "@/features/vitrine-premium/lib/demo/data"
import { normalizeIdentifier } from "@/features/vitrine-premium/lib/demo/validation"
import { useState,useRef,useEffect } from "react"

import { Card, CardContent } from "@/features/vitrine-premium/components/ui/Card"

import Stepper from "./Stepper"
import IdentificationStep from "./steps/IdentificationStep"
import PregnancyStep from "./steps/PregnancyStep"
import VitalSignsStep from "./steps/VitalSignsStep"
import ObstetricStep from "./steps/ObstetricStep"
import ResultStep from "./steps/ResultStep"

import type { RegistrationData } from "@/features/vitrine-premium/types/registration"

const initialRegistration: RegistrationData = {
  cpf: "",
  nomeCompleto: "",
  dataNascimento: "",

  primeiroAtendimento: null,
  dum: "",

  oxygenMode: "unknown",
  oxygenFlow: "",
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
  const [saved,setSaved]=useState<false|'memory'|'private'>(false)
  const [saving,setSaving]=useState(false)
  const savingRef=useRef(false)
  const attempt=useRef({id:'',signature:''})
  const [identityEpoch,setIdentityEpoch]=useState(0)
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
    attempt.current={id:'',signature:''};setSaved(false);setErrors([]);setIdentityEpoch(n=>n+1)
    setRegistration(initialRegistration)
    setCurrentStep(1)
  }

  useEffect(()=>{const reset=()=>{attempt.current={id:'',signature:''};setSaved(false);setErrors([]);setIdentityEpoch(n=>n+1);setRegistration(initialRegistration);setCurrentStep(1)};window.addEventListener('pap:vitrine-reset',reset);return()=>window.removeEventListener('pap:vitrine-reset',reset)},[])

  const updateRegistration = (
    data: Partial<RegistrationData>,
  ) => {
    setRegistration((current) => ({
      ...current,
      ...data,
    }))
  }

  const saveRegistration = async () => {
    if(saved||savingRef.current)return
    const found = [1, 2, 3, 4, 5].flatMap(step => registrationErrors(registration, step))
    if (found.length) {setErrors(found); return}
    const signature=JSON.stringify(registration)
    if(attempt.current.signature!==signature)attempt.current={signature,id:crypto.randomUUID()}
    savingRef.current=true
    setSaving(true)
    try {setSaved(await save(registration,attempt.current.id)?'private':'memory');setErrors([])}
    catch {setErrors(['Não foi possível confirmar o registro. Confira a sessão e tente novamente.'])}
    finally {savingRef.current=false;setSaving(false)}
  }

  const savedPatient = saved ? patients.find(patient => normalizeIdentifier(patient.cpf) === normalizeIdentifier(registration.cpf)) : undefined

  return (
    <Card className="mx-auto w-full max-w-5xl" data-registration-wizard>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        {errors.length>0 && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.map(e=><p key={e}>{e}</p>)}</div>}
        {saved && <p role="status" className="mb-4 text-sm text-emerald-700">
          Registro demonstrativo salvo {saved==='private'?'no laboratório privado.':'na memória desta aba.'} {savedPatient && <Link prefetch={false} className="underline" href={"/vitrine/pacientes/"+savedPatient.id}>Abrir ficha da paciente</Link>}
        </p>}
        <Stepper currentStep={currentStep} />

        <div key={`${currentStep}-${identityEpoch}`} data-motion-step>
        {currentStep === 1 && (
          <IdentificationStep
            onNew={restart}
            onStart={patch=>{const next={...registration,...patch};const found=registrationErrors(next,1);setErrors(found);if(!found.length){setRegistration(next);setCurrentStep(2)}}}
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
            saved={!!saved}
            onRestart={restart}
            onSave={() => void saveRegistration()}
            saving={saving}
          />
        )}
        </div>
        {savedPatient && <details className="mt-6 rounded-xl border border-slate-200 p-4">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">Agenda da paciente</summary>
          <AgendaPanel patient={savedPatient}/>
        </details>}
      </CardContent>
    </Card>
  )
}