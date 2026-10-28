"use client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useDemo } from "@/components/demo/DemoProvider"

import PatientHeader from "@/components/pacientes/PatientHeader"
import PatientTabs from "@/components/pacientes/PatientTabs"



type Props = {id: string}

export default function PatientPage({
  id,
}: Props) {
  const {patients}=useDemo()

  const patient = patients.find(
    (item) => item.id === id,
  )

  if (!patient) {
    return <p role="status">Paciente não encontrada na demonstração. <Link href="/pacientes">Voltar à lista</Link></p>
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link
        href="/pacientes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-pink-600"
      >
        <ArrowLeft size={15} />

        Voltar para pacientes
      </Link>

      <PatientHeader
        patient={patient}
      />

      <div className="mt-4">
        <PatientTabs
          patient={patient}
        />
      </div>
    </div>
  )
}