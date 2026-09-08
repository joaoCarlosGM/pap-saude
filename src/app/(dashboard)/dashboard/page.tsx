import StatCard from "@/components/dashboard/StatCard"

export default function DashboardPage() {
  return (
    <div className="space-y-6">

      <header>
        <h1 className="text-2xl font-semibold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Visão geral do atendimento
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Pacientes"
          value="128"
          description="Pacientes cadastrados"
        />

        <StatCard
          title="Atendimentos"
          value="342"
          description="Atendimentos realizados"
        />

        <StatCard
          title="Alertas"
          value="7"
          description="Requerem atenção"
        />

        <StatCard
          title="Acompanhamentos"
          value="96%"
          description="Acompanhamentos ativos"
        />

      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Pacientes previstos por mês
          </h2>

          <div className="mt-6 flex h-64 items-end justify-around gap-4 border-b border-gray-100 px-4">

            <div className="flex h-full flex-col justify-end">
              <div className="h-24 w-10 rounded-t bg-pink-500" />
              <span className="mt-2 text-xs text-gray-400">
                Jan
              </span>
            </div>

            <div className="flex h-full flex-col justify-end">
              <div className="h-32 w-10 rounded-t bg-pink-500" />
              <span className="mt-2 text-xs text-gray-400">
                Fev
              </span>
            </div>

            <div className="flex h-full flex-col justify-end">
              <div className="h-40 w-10 rounded-t bg-pink-500" />
              <span className="mt-2 text-xs text-gray-400">
                Mar
              </span>
            </div>

            <div className="flex h-full flex-col justify-end">
              <div className="h-48 w-10 rounded-t bg-pink-500" />
              <span className="mt-2 text-xs text-gray-400">
                Abr
              </span>
            </div>

            <div className="flex h-full flex-col justify-end">
              <div className="h-36 w-10 rounded-t bg-pink-500" />
              <span className="mt-2 text-xs text-gray-400">
                Mai
              </span>
            </div>

          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Atendimentos recentes
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium">
                  Maria Silva
                </p>
                <p className="text-xs text-gray-400">
                  Pré-natal
                </p>
              </div>

              <span className="text-xs text-gray-500">
                Hoje
              </span>
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium">
                  Ana Santos
                </p>
                <p className="text-xs text-gray-400">
                  Acompanhamento
                </p>
              </div>

              <span className="text-xs text-gray-500">
                Hoje
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Juliana Costa
                </p>
                <p className="text-xs text-gray-400">
                  Consulta
                </p>
              </div>

              <span className="text-xs text-gray-500">
                Ontem
              </span>
            </div>

          </div>
        </div>

      </section>

    </div>
  )
}