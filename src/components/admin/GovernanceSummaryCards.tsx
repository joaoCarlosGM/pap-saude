import AnimatedMetric from "@/components/premium/AnimatedMetric";
import Link from "next/link";
import type { GovernanceSummary } from "@/lib/admin/governance-metrics";

export default function GovernanceSummaryCards({ summary }: { summary: GovernanceSummary }) {
  const cards = [
    { title: "Convites globais criados", metric: summary.invitationsCreated, href: "/admin/convites-globais" },
    { title: "Aceitos aguardando autorização", metric: summary.pendingAssignments, href: "/admin/convites-globais" },
    { title: "Pessoas com perfil Comercial", metric: summary.commercialUsers, href: "/admin/acessos" },
    { title: "UBS analisadas aguardando ativação", metric: summary.unitsAwaitingActivation, href: "/admin/solicitacoes" },
  ];
  return <section aria-label="Governança global PAP" className="space-y-3">
    <h3 className="text-lg font-semibold">Governança global PAP</h3>
    <p className="text-sm text-slate-600 dark:text-slate-300">
      Convites criados: {summary.periodStart.slice(0, 10)} até {summary.periodEnd.slice(0, 10)} (fim exclusivo), UTC.
      Os demais cartões mostram a situação atual, não um histórico do período.
    </p>
    <div data-motion-kpis className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ title, metric, href }) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-2 text-3xl font-semibold text-pink-800 dark:text-teal-200"><AnimatedMetric value={String(metric.value)}/></p>
        <p className="text-xs text-slate-600 dark:text-slate-300">{metric.status === "NO_DATA" ? "Nenhum registro correspondente." : metric.window === "SELECTED_PERIOD" ? "Na janela selecionada." : "Situação atual."}</p>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-4">Como este indicador é contado</summary>
          <p className="mt-2">{metric.definition}</p>
        </details>
        <Link href={href} className="mt-3 inline-block rounded text-sm font-medium text-pink-800 underline focus-visible:outline-2 focus-visible:outline-offset-4 dark:text-teal-200">Consultar registros</Link>
      </article>)}
    </div>
    <p className="text-xs text-slate-600 dark:text-slate-300">
      Atualização: {new Date(summary.generatedAt).toLocaleString("pt-BR")} · Não mede atividade ou resultado clínico.
      Convite aceito, perfil autorizado e UBS ativada são etapas independentes.
    </p>
  </section>;
}
