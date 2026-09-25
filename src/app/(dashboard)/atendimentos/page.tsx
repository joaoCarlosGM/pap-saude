import AtendimentoFilters from "@/components/atendimentos/AtendimentoFilters"
import AtendimentoTable from "@/components/atendimentos/AtendimentoTable"

import { Card, CardContent } from "@/components/ui/Card"

import { mockAtendimentos } from "@/lib/mock-atendimentos"

export default function AtendimentosPage() {
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
          <AtendimentoFilters />

          <AtendimentoTable
            atendimentos={mockAtendimentos}
          />
        </CardContent>
      </Card>
    </div>
  )
}