"use client"
import Link from "next/link"
import {notFound} from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useDemo } from "@/features/vitrine-premium/components/demo/DemoProvider"

import PatientHeader from "@/features/vitrine-premium/components/pacientes/PatientHeader"
import PatientTabs from "@/features/vitrine-premium/components/pacientes/PatientTabs"



type Props = {id: string}

export default function PatientPage({
  id,
}: Props) {
  const {patients}=useDemo()

  const patient = patients.find(
    (item) => item.id === id,
  )

  if (!patient) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link
        href="/vitrine/pacientes"
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