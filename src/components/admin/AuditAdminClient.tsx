"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string; occurredAt: string; action: string; resourceType: string;
  resourceId: string | null; actorUserId: string | null; organizationId: string | null;
  outcome: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null;
};
type Result = { events: Row[]; total: number; page: number; pageSize: number };

export default function AuditAdminClient() {
  const [filters, setFilters] = useState({ action: "", organizationId: "", actorUserId: "", from: "", to: "" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    fetch(`/api/admin/audit?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? "Sem permissão para consultar auditoria." : "Não foi possível consultar auditoria.");
        return response.json() as Promise<Result>;
      })
      .then(data => { if (active) { setResult(data); setError(""); } })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Erro na consulta."); });
    return () => { active = false; controller.abort(); };
  }, [query, page]);

  const details = result?.events.find(event => event.id === selected);
  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / 25));

  return <section className="space-y-5 p-5">
    <header><h1 className="text-2xl font-semibold">Auditoria administrativa</h1><p className="text-sm text-slate-500">Eventos administrativos autorizados, sem prontuários ou credenciais.</p></header>
    <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3" onSubmit={event => {
      event.preventDefault();
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) if (value.trim()) params.set(key, value.trim());
      setQuery(params.toString()); setPage(1); setSelected(null);
    }}>
      {(["action", "organizationId", "actorUserId", "from", "to"] as const).map(key =>
        <label key={key} className="text-sm">{{action:"Ação",organizationId:"Organização (UUID)",actorUserId:"Ator (UUID)",from:"Desde",to:"Até"}[key]}
          <input aria-label={key} type={key === "from" || key === "to" ? "datetime-local" : "text"} maxLength={key === "action" ? 64 : 36} className="mt-1 w-full rounded border p-2" value={filters[key]} onChange={event => setFilters(previous => ({...previous, [key]:event.target.value}))}/>
        </label>)}
      <button className="rounded-lg bg-teal-800 px-4 py-2 text-white" type="submit">Filtrar</button>
    </form>
    {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Data", "Ação", "Recurso", "Resultado", "Detalhes"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
      {result?.events.map(event => <tr key={event.id} className="border-t"><td className="p-3">{new Date(event.occurredAt).toLocaleString("pt-BR")}</td><td className="p-3">{event.action}</td><td className="p-3">{event.resourceType}</td><td className="p-3">{event.outcome}</td><td className="p-3"><button type="button" className="text-teal-800 underline" onClick={() => setSelected(selected === event.id ? null : event.id)}>Ver</button></td></tr>)}
    </tbody></table>{result?.events.length === 0 && <p className="p-4 text-slate-500">Nenhum evento encontrado.</p>}</div>
    {details && <aside aria-label="Detalhes do evento" className="rounded-xl border bg-white p-4 text-sm"><h2 className="mb-2 font-semibold">Detalhes do evento</h2><p>Ator: {details.actorUserId ?? "—"}</p><p>Organização: {details.organizationId ?? "Global"}</p><p>Recurso: {details.resourceId ?? "—"}</p><p className="mt-2 font-medium">Antes</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(details.before, null, 2)}</pre><p className="mt-2 font-medium">Depois</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(details.after, null, 2)}</pre></aside>}
    <footer className="flex items-center justify-between gap-2"><span className="text-sm">{result?.total ?? 0} eventos · {page}/{pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Anterior</button><button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Próxima</button></div></footer>
  </section>;
}
