import PatientList from "@/components/pacientes/PatientList"

import { mockPacientes } from "@/lib/mock-pacientes"

export default function PacientesPage() {
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

      <PatientList
        patients={mockPacientes}
      />
    </div>
  )
}