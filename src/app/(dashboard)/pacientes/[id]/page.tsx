import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

import PatientHeader from "@/components/pacientes/PatientHeader"
import PatientTabs from "@/components/pacientes/PatientTabs"

import { mockPacientes } from "@/lib/mock-pacientes"

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function PatientPage({
  params,
}: Props) {
  const { id } = await params

  const patient = mockPacientes.find(
    (item) => item.id === id,
  )

  if (!patient) {
    notFound()
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