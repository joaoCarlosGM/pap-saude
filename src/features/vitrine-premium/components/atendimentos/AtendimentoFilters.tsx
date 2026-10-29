"use client"

import { Search } from "lucide-react"

import Input from "@/features/vitrine-premium/components/ui/Input"
import Select from "@/features/vitrine-premium/components/ui/Select"

import type { AttendanceFilter } from "@/features/vitrine-premium/lib/demo/data"

export default function AtendimentoFilters({value,onChange}:{value:AttendanceFilter;onChange:(v:AttendanceFilter)=>void}) {
  return (
    <div data-tour="attendance-filters" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        id="search"
        label="Buscar paciente"
        value={value.search}
        onChange={e=>onChange({...value,search:e.target.value})}
        type="search"
        placeholder="Buscar por paciente..."
        icon={<Search size={18} />}
      />

      <Select
        id="period"
        value={value.period}
        onChange={e=>onChange({...value,period:e.target.value})}
        label="Período"
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
        value={value.risk}
        onChange={e=>onChange({...value,risk:e.target.value})}
        label="Risco"
      >
        <option value="all">
          Todos os riscos
        </option>

        <option value="low">
          Sem alerta / ilustrativo
        </option>

        <option value="attention">
          Atenção demonstrativa
        </option>

        <option value="unknown">Incompleto / não avaliado</option>
        <option value="urgent">
          Alertas demonstrativos
        </option>
      </Select>

      <Select
        id="professional"
        value={value.professional}
        onChange={e=>onChange({...value,professional:e.target.value})}
        label="Profissional"
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