import AtendimentoFilters from "@/components/atendimentos/AtendimentoFilters"
import AtendimentoTable from "@/components/atendimentos/AtendimentoTable"
import { mockAtendimentos } from "@/lib/mock-atendimentos"

export default function AtendimentosPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Atendimentos
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Histórico de registros clínicos
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AtendimentoFilters />

        <div className="mt-6">
          <AtendimentoTable
            atendimentos={mockAtendimentos}
          />
        </div>
      </section>
    </main>
  )
}