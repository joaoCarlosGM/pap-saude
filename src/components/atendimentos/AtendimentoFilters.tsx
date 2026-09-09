"use client"

import { Search } from "lucide-react"

export default function AtendimentoFilters() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-1">
        <label
          htmlFor="search"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Buscar paciente
        </label>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="search"
            type="text"
            placeholder="Buscar por paciente..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="period"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Período
        </label>

        <select
          id="period"
          defaultValue="all"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        >
          <option value="all">Todos os períodos</option>
          <option value="today">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="risk"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Risco
        </label>

        <select
          id="risk"
          defaultValue="all"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        >
          <option value="all">Todos os riscos</option>
          <option value="low">Baixo Risco</option>
          <option value="attention">Atenção</option>
          <option value="urgent">Urgência</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="professional"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Profissional
        </label>

        <select
          id="professional"
          defaultValue="all"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
        >
          <option value="all">Todos os profissionais</option>
          <option value="ana-paula">Enf. Ana Paula Ferreira</option>
          <option value="carlos">Dr. Carlos Mendes</option>
        </select>
      </div>
    </div>
  )
}