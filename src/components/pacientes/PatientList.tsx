"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import PatientCard from "./PatientCard"

import type { Patient } from "@/types/paciente"

type Props = {
  patients: Patient[]
}

export default function PatientList({
  patients,
}: Props) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    const numericSearch =
      normalizedSearch.replace(/\D/g, "")

    if (!normalizedSearch) {
      return patients
    }

    return patients.filter((patient) => {
      const patientName =
        patient.nome.toLowerCase()

      const patientCpf =
        patient.cpf.replace(/\D/g, "")

      const matchesName =
        patientName.includes(normalizedSearch)

      const matchesCpf =
        numericSearch.length > 0 &&
        patientCpf.includes(numericSearch)

      return matchesName || matchesCpf
    })
  }, [patients, search])

  return (
    <div>
      <div className="relative w-full max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Buscar por nome ou CPF..."
          className="
            h-10
            w-full
            rounded-lg
            border
            border-slate-200
            bg-white
            pl-10
            pr-3
            text-sm
            text-slate-700
            outline-none
            transition
            placeholder:text-slate-400
            focus:border-pink-300
            focus:ring-2
            focus:ring-pink-100
          "
        />
      </div>

      <p className="mt-5 text-xs text-slate-400">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "paciente encontrada"
          : "pacientes encontradas"}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-3 space-y-3">
          {filtered.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nenhuma paciente encontrada
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Tente buscar por outro nome ou CPF.
          </p>
        </div>
      )}
    </div>
  )
}