"use client"
import NewSyntheticPatient from "../pacientes/NewSyntheticPatient"
import PatientList from "@/features/vitrine-premium/components/pacientes/PatientList"

import { useDemo } from "@/features/vitrine-premium/components/demo/DemoProvider"

export default function PacientesPage() {
 const {patients}=useDemo()
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Pacientes
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gestantes acompanhadas
        </p>
      </header>

      <div className="mb-4"><NewSyntheticPatient/></div>
      <PatientList
        patients={patients}
      />
    </div>
  )
}