"use client"

import { Search } from "lucide-react"

import Input from "@/components/ui/Input"
import Select from "@/components/ui/Select"

export default function AtendimentoFilters() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        id="search"
        label="Buscar paciente"
        type="search"
        placeholder="Buscar por paciente..."
        icon={<Search size={18} />}
      />

      <Select
        id="period"
        label="Período"
        defaultValue="all"
      >
        <option value="all">
          Todos os períodos
        </option>

        <option value="today">
          Hoje
        </option>

        <option value="7d">
          Últimos 7 dias
        </option>

        <option value="30d">
          Últimos 30 dias
        </option>

        <option value="90d">
          Últimos 90 dias
        </option>
      </Select>

      <Select
        id="risk"
        label="Risco"
        defaultValue="all"
      >
        <option value="all">
          Todos os riscos
        </option>

        <option value="low">
          Baixo Risco
        </option>

        <option value="attention">
          Atenção
        </option>

        <option value="urgent">
          Urgência
        </option>
      </Select>

      <Select
        id="professional"
        label="Profissional"
        defaultValue="all"
      >
        <option value="all">
          Todos os profissionais
        </option>

        <option value="ana-paula">
          Enf. Ana Paula Ferreira
        </option>

        <option value="carlos">
          Dr. Carlos Mendes
        </option>
      </Select>
    </div>
  )
}