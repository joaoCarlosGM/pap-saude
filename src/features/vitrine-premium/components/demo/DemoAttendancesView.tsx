"use client"
import { useState } from "react"
import { useDemo } from "@/features/vitrine-premium/components/demo/DemoProvider"
import { filterEncounters } from "@/features/vitrine-premium/lib/demo/data"
import AtendimentoFilters from "@/features/vitrine-premium/components/atendimentos/AtendimentoFilters"
import AtendimentoTable from "@/features/vitrine-premium/components/atendimentos/AtendimentoTable"

import { Card, CardContent } from "@/features/vitrine-premium/components/ui/Card"



export default function AtendimentosPage() {
 const {state}=useDemo()
 const [filters,setFilters]=useState({search:"",period:"all",risk:"all",professional:"all"})
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Atendimentos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Histórico de registros clínicos
        </p>
      </header>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-5 lg:p-6">
          <AtendimentoFilters value={filters} onChange={setFilters}/>

          <AtendimentoTable
            atendimentos={filterEncounters(state.encounters,filters)}
          />
        </CardContent>
      </Card>
    </div>
  )
}