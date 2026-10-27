"use client";

import GovernanceSummaryCards from "./GovernanceSummaryCards";
import type { GovernanceSummary } from "@/lib/admin/governance-metrics";
import { emailDeliveryLabel } from "@/lib/email-delivery";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BetaTitle, DataState, useBetaData } from "./BetaWidgets";
type Metrics = {
  governanceSummary: GovernanceSummary | null;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  source: string;
  approvedUnits: number;
  activeUnits: number;
  staff: { responsiblesActive: number; professionalsActive: number };
  adoption: {
    eligibleUnits: number;
    activeUnits: number | null;
    rate: number | null;
    status: string;
  };
  dau: number | null;
  wau: number | null;
  mau: number | null;
  daily: { day: string; activeUsers: number | null }[];
  retention: {
    denominator: number | null;
    numerator: number | null;
    rate: number | null;
    status: string;
    definition: string;
  };
  invitations: {
    role: string;
    status: string;
    delivery: string;
    count: number;
  }[];
};
function MetricArea({ query }: { query: string }) {
  const result = useBetaData<Metrics>(`/api/admin/beta/metrics?${query}`),
    m = result.data;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Uso funcional e adesão</h2>
        <button
          className="rounded-xl border px-4 py-2"
          onClick={result.refresh}
        >
          Atualizar indicadores
        </button>
      </div>
      <DataState {...result} />
      {m && (
        <>
          {m.governanceSummary && !result.error && !result.loading && <GovernanceSummaryCards summary={m.governanceSummary} />}
          <p className="text-xs text-slate-500">
            {result.error || result.loading
              ? "Dados anteriores — aguardando atualização. "
              : ""}
            Consulta: {new Date(m.generatedAt).toLocaleString("pt-BR")} ·
            janelas UTC
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "UBS aprovadas / ativas",
                `${m.approvedUnits} / ${m.activeUnits}`,
              ],
              ["UBS elegíveis", m.adoption.eligibleUnits],
              [
                "Responsáveis / profissionais ativos",
                `${m.staff.responsiblesActive} / ${m.staff.professionalsActive}`,
              ],
              [
                "Adoção funcional",
                m.adoption.rate === null
                  ? m.adoption.status === "NO_DATA"
                    ? "Sem dados na janela"
                    : "Amostra insuficiente"
                  : `${(100 * m.adoption.rate).toFixed(1)}% (${m.adoption.activeUnits}/${m.adoption.eligibleUnits})`,
              ],
              [
                "DAU / WAU / MAU",
                [m.dau, m.wau, m.mau].map((v) => v ?? "Suprimido").join(" / "),
              ],
            ].map(([label, value]) => (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                key={String(label)}
              >
                <h3 className="text-sm text-slate-600">{label}</h3>
                <p className="mt-3 break-words text-xl font-semibold text-[#064f50]">
                  {value}
                </p>
              </article>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Elegíveis: UBS ativas com vínculo e papel profissional ativos na
            mesma unidade. Adoção: UBS elegíveis com atendimento concluído
            instrumentado / UBS elegíveis. Login e visualização do painel não
            contam.
          </p>
          <section className="rounded-3xl border bg-white p-6">
            <h3 className="font-semibold">Atividade diária de profissionais</h3>
            {!m.daily.some((r) => r.activeUsers !== null) && (
              <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                Sem valores divulgáveis nesta janela. Dados ausentes ou coortes
                menores que cinco permanecem protegidos.
              </p>
            )}
            <svg
              role="img"
              aria-label="Gráfico de usuários ativos diários; valores disponíveis na tabela"
              viewBox="0 0 600 140"
              className="my-4 max-h-48 w-full"
            >
              <title>
                Usuários ativos diários; coortes menores que cinco são
                suprimidas
              </title>
              {m.daily.map((r, i) => (
                <rect
                  key={r.day}
                  x={(i * 600) / m.daily.length}
                  y={
                    130 -
                    ((r.activeUsers ?? 0) /
                      Math.max(5, ...m.daily.map((d) => d.activeUsers ?? 0))) *
                      120
                  }
                  width={Math.max(1, 600 / m.daily.length - 2)}
                  height={
                    ((r.activeUsers ?? 0) /
                      Math.max(5, ...m.daily.map((d) => d.activeUsers ?? 0))) *
                    120
                  }
                  fill="#064f50"
                />
              ))}
            </svg>
            <details>
              <summary className="cursor-pointer underline">
                Tabela acessível dos indicadores diários
              </summary>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Dia UTC</th>
                    <th>Usuários ativos</th>
                  </tr>
                </thead>
                <tbody>
                  {m.daily.map((r) => (
                    <tr key={r.day}>
                      <td>{r.day}</td>
                      <td>{r.activeUsers ?? "Suprimido (<5)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <a
              className="mt-4 inline-block underline"
              href={`/api/admin/beta/metrics?${query}&format=csv`}
            >
              Exportar agregados autorizados (CSV)
            </a>
          </section>
          <article className="rounded-3xl border bg-white p-6">
            <h3 className="font-semibold">Retenção de UBS</h3>
            <p>
              {m.retention.rate === null
                ? "Amostra insuficiente"
                : `${(100 * m.retention.rate).toFixed(1)}% (${m.retention.numerator}/${m.retention.denominator})`}
            </p>
            <p className="text-sm text-slate-600">
              {m.retention.definition}. Coortes inferiores a cinco são
              suprimidas. Não mede eficácia clínica.
            </p>
          </article>
          <p className="text-xs text-slate-500">
            Fonte: conclusões de atendimentos registradas após a instrumentação.
            Jornadas completas e desfechos clínicos ainda não são mensurados.
          </p>
        </>
      )}
    </div>
  );
}
function InvitationWidget({ query }: { query: string }) {
  const result = useBetaData<Metrics>(`/api/admin/beta/metrics?${query}`);
  return (
    <section className="rounded-3xl border bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold">Saúde dos convites</h2>
      <DataState {...result} />
      {!result.loading && !result.error && result.data && (
        <>
          {result.data.invitations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {["Papel", "Aceite", "Provedor", "Total"].map((s) => (
                      <th key={s} className="py-2">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.invitations.map((r, i) => (
                    <tr key={i}>
                      <td>{r.role}</td>
                      <td>{r.status}</td>
                      <td>{emailDeliveryLabel(r.delivery)}</td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum convite na janela.</p>
          )}
          <p className="mt-4 text-xs text-slate-500">
            CAPTURED significa captura local. ACCEPTED_BY_PROVIDER e o legado SENT
            significam aceite pelo provedor. DELIVERED exige webhook autenticado;
            não comprova leitura nem posicionamento na caixa de entrada.
          </p>
        </>
      )}
    </section>
  );
}
function Dashboard() {
  const search = useSearchParams();
  const [period, setPeriod] = useState(
      ["7", "30", "90"].includes(search.get("days") || "")
        ? search.get("days")!
        : "30",
    ),
    [organizationId, setOrganizationId] = useState(
      search.get("organizationId") || "",
    );
  function changeFilter(days: string, id: string) {
    setPeriod(days);
    setOrganizationId(id);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${new URLSearchParams({ days, ...(id ? { organizationId: id } : {}) })}`,
    );
  }
  const orgs = useBetaData<{
    organizations: { id: string; name: string; type: string }[];
  }>("/api/admin/organizations");
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const query = new URLSearchParams({
    from: new Date(end.getTime() - Number(period) * 86400000)
      .toISOString()
      .slice(0, 10),
    to: end.toISOString().slice(0, 10),
    ...(organizationId ? { organizationId } : {}),
  }).toString();
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <BetaTitle
        title="Visão executiva"
        description="Adesão, utilização funcional e convites com dados reais, limites de privacidade e definições explícitas."
      />
      <div className="flex flex-wrap gap-4">
        <label>
          Período{" "}
          <select
            className="rounded-xl border p-3"
            value={period}
            onChange={(e) => changeFilter(e.target.value, organizationId)}
          >
            {[7, 30, 90].map((n) => (
              <option value={n} key={n}>
                {n} dias
              </option>
            ))}
          </select>
        </label>
        <label>
          Município / UBS{" "}
          <select
            className="rounded-xl border p-3"
            value={organizationId}
            onChange={(e) => changeFilter(period, e.target.value)}
          >
            <option value="">Todo o escopo autorizado</option>
            {orgs.data?.organizations?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MetricArea key={query} query={query} />
      <InvitationWidget key={`invitations-${query}`} query={query} />
    </section>
  );
}

export default function BetaDashboardClient() {
  return (
    <Suspense fallback={<DataState loading error="" retry={() => {}} />}>
      <Dashboard />
    </Suspense>
  );
}
