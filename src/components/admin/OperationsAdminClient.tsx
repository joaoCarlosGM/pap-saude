"use client";
import { useEffect, useState } from "react";

type Mode = "monitoring" | "metrics" | "integrations";
type Organization = { id: string; name: string; type: string; parentId: string | null };
type MetricsRow = Organization & { eventCount: number; activeUsers: number | null; dashboardViews: number; encountersStarted: number; encountersCompleted: number };
type Unit = { id: string; name: string; status: string; environment: string | null; lastValidation: string | null };
type Result = {
  organizations: Organization[]; rows?: MetricsRow[]; units?: Unit[]; total: number; pageSize: number;
  database?: string; integrations?: Record<string, number>; overdueTransmissionQueue?: number;
  failedTransmissionsLast24h?: number; overdueValidations?: number;
  requestErrorRate?: string; workerHeartbeat?: string; externalN8nHealth?: string;
  n8n?: { status: string }; readOnly?: boolean;
};
const labels = { monitoring: "Monitoramento operacional", metrics: "Métricas operacionais", integrations: "Integrações RNDS e n8n" };
export default function OperationsAdminClient({ mode }: { mode: Mode }) {
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (organizationId) params.set("organizationId", organizationId);
    fetch(`/api/admin/operations/${mode}?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? "Acesso negado a este escopo." : "Falha na consulta operacional.");
        return response.json() as Promise<Result>;
      })
      .then(value => { if (active) { setResult(value); setError(""); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Erro na consulta."); });
    return () => { active = false; controller.abort(); };
  }, [mode, page, organizationId]);
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 25)));
  return <section className="mx-auto max-w-6xl space-y-5 p-5">
    <h1 className="text-2xl font-semibold">{labels[mode]}</h1>
    <p className="text-sm text-slate-600">Dados operacionais com acesso limitado à sua organização. Nenhuma informação clínica individual é exibida.</p>
    <label className="block text-sm">Filtrar por organização autorizada (UUID)
      <input className="mt-1 block w-full max-w-md rounded-lg border p-2" placeholder="Deixe vazio para o escopo completo" value={organizationId} maxLength={36}
        onChange={e => { setOrganizationId(e.target.value); setPage(1); }}/>
    </label>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
    {mode === "monitoring" && result && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["PostgreSQL", result.database], ["Transmissões pendentes há mais de 1 h", result.overdueTransmissionQueue],
        ["Falhas RNDS (24 h)", result.failedTransmissionsLast24h], ["Validações atrasadas", result.overdueValidations],
        ["Taxa de erros HTTP", result.requestErrorRate], ["Heartbeat dos workers", result.workerHeartbeat],
        ["Saúde externa do n8n", result.externalN8nHealth],
      ].map(([label, value]) => <div className="rounded-xl border bg-white p-4" key={String(label)}><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-lg">{value ?? "Sem dados"}</strong></div>)}
      <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Integrações RNDS por status</p><pre className="text-xs">{JSON.stringify(result.integrations ?? {}, null, 2)}</pre></div>
    </div>}
    {mode === "metrics" && result && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{["Organização", "Tipo", "Eventos", "Usuários ativos*", "Dashboard", "Atendimentos iniciados", "Atendimentos concluídos"].map(x => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{result.rows?.map(row => <tr className="border-b" key={row.id}><td className="p-3">{row.name}</td><td className="p-3">{row.type}</td><td className="p-3">{row.eventCount}</td><td className="p-3">{row.activeUsers ?? "Suprimido"}</td><td className="p-3">{row.dashboardViews}</td><td className="p-3">{row.encountersStarted}</td><td className="p-3">{row.encountersCompleted}</td></tr>)}</tbody></table><p className="p-3 text-xs text-slate-500">* Contagens de usuários inferiores a cinco são suprimidas. Métricas originadas de eventos de utilização, não do prontuário.</p></div>}
    {mode === "integrations" && result && <div className="space-y-3"><p className="rounded border bg-white p-3 text-sm">n8n: {result.n8n?.status ?? "Não configurado"}. Configuração não comprova disponibilidade. Painel somente de leitura; transmissão RNDS não habilitada por esta página.</p><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-slate-50">{["UBS", "Ambiente RNDS", "Estado", "Validação"].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{result.units?.map(row => <tr key={row.id} className="border-b"><td className="p-3">{row.name}</td><td className="p-3">{row.environment ?? "—"}</td><td className="p-3">{row.status}</td><td className="p-3">{row.lastValidation ?? "—"}</td></tr>)}</tbody></table></div></div>}
    {result && <footer className="flex items-center justify-between text-sm"><span>{result.total} {mode === "integrations" ? "UBS" : "organizações"} · página {page}/{pages}</span><div className="flex gap-2"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</button></div></footer>}
  </section>;
}
