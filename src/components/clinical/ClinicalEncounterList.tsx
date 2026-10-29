"use client";
import Link from "next/link";
import Dialog from "@/components/premium/Dialog";
import { transitionEncounter } from "@/lib/clinical-api";

import { useEffect, useState } from "react";

import { listEncounters } from "@/lib/clinical-api";

import type { ClinicalEncounter } from "@/lib/clinical-api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",

    timeStyle: "short",
  }).format(new Date(value));
}

export default function ClinicalEncounterList({canManage=false}:{canManage?:boolean}) {
  const [selected,setSelected]=useState<ClinicalEncounter|null>(null);
  const [action,setAction]=useState<"start"|"complete"|"cancel"|null>(null);
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState("");
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("");
  async function confirmTransition(){
    if(!selected||!action||busy)return;setBusy(true);setActionError("");
    try{const result=await transitionEncounter(selected.id,action,reason);setItems(current=>current.map(e=>e.id===result.encounter.id?result.encounter:e));setSelected(result.encounter);setAction(null);setReason("");}
    catch(e){setActionError(e instanceof Error?e.message:"A operação foi recusada. Consulte novamente antes de repetir.");}
    finally{setBusy(false);}
  }
  const [items, setItems] = useState<ClinicalEncounter[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listEncounters()
      .then((result) => {
        if (!active) {
          return;
        }

        setItems(result.items);

        setError(null);
      })
      .catch((cause) => {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Falha ao carregar atendimentos.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando atendimentos...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const filtered=items.filter(e=>(!status||e.status===status)&&(!query||`${e.chiefComplaint||''} ${e.patientId}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))));
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3"><label className="flex-1">Buscar atendimento<input aria-label="Buscar atendimento" value={query} onChange={e=>setQuery(e.target.value)} className="mt-1 block w-full rounded-xl border bg-white px-3 py-2"/></label><label>Estado<select aria-label="Estado do atendimento" value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 block rounded-xl border bg-white px-3 py-2"><option value="">Todos</option>{['DRAFT','IN_PROGRESS','COMPLETED','CANCELLED'].map(v=><option key={v}>{v}</option>)}</select></label></div>
    <p role="status" className="text-sm text-slate-600">{filtered.length} atendimento(s) nesta unidade autorizada.</p>
    <div className="space-y-3">{filtered.map(e=><article key={e.id} id={`encounter-${e.id}`} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-pink-300 target:ring-2 target:ring-pink-500">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{e.chiefComplaint||"Atendimento clínico"}</h2><span className="rounded-full bg-pink-50 px-3 py-1 text-xs text-pink-800">{e.status}</span></div>
      <p className="mt-2 text-sm text-slate-600">{formatDate(e.occurredAt)}</p>
      <button type="button" className="mt-3 text-sm font-semibold text-pink-800 after:absolute after:inset-0 after:rounded-2xl" onClick={()=>{setSelected(e);setAction(null);setActionError("");}}>Detalhes<span className="sr-only"> do atendimento de {formatDate(e.occurredAt)}</span></button>
      <Link className="relative z-10 ml-5 text-sm text-pink-800 underline" href={`/pacientes/${e.patientId}`}>Ver prontuário</Link>
    </article>)}</div>
    {!filtered.length&&<p className="rounded-2xl border bg-white p-6">Nenhum atendimento encontrado.</p>}
    <Dialog open={!!selected} onClose={()=>{if(!busy){setSelected(null);setAction(null);}}} title="Detalhes do atendimento">
      {selected&&<div className="space-y-4 text-sm"><p><strong>Estado:</strong> {selected.status}</p><p><strong>Ocorrência:</strong> {formatDate(selected.occurredAt)}</p><p>{selected.chiefComplaint||"Sem queixa registrada."}</p><Link className="text-pink-800 underline" href={`/pacientes/${selected.patientId}`}>Consultar prontuário e histórico</Link>
      <p className="rounded-xl bg-slate-50 p-3">MEOWS assistencial DRAFT_UNVALIDATED: nenhuma classificação ou conduta automática.</p>
      {['COMPLETED','CANCELLED'].includes(selected.status)?<p>Registro encerrado. Alterações incompatíveis são bloqueadas pelo servidor.</p>:canManage&&<div className="flex flex-wrap gap-3">{(selected.status==='DRAFT'?['start','cancel']:['complete','cancel']).map(a=><button key={a} type="button" disabled={busy} className="rounded-lg border px-3 py-2" onClick={()=>{setAction(a as 'start'|'complete'|'cancel');setActionError('');}}>{({start:'Iniciar atendimento',complete:'Concluir atendimento',cancel:'Cancelar atendimento'})[a]}</button>)}</div>}
      {action&&<section className="space-y-3 rounded-xl border border-amber-300 p-4" aria-label="Confirmar transição"><p>Confirme a mudança de estado. Conclusão ou cancelamento impedem novas edições incompatíveis.</p>{action==='cancel'&&<label>Motivo do cancelamento<textarea aria-label="Motivo do cancelamento" value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded-lg border p-2"/></label>}<button type="button" disabled={busy||(action==='cancel'&&!reason.trim())} onClick={()=>void confirmTransition()} className="rounded-lg bg-pink-700 px-4 py-2 text-white">{busy?'Confirmando…':'Confirmar alteração'}</button></section>}
      {actionError&&<p role="alert" className="text-red-800">{actionError}</p>}</div>}
    </Dialog>
  </div>;
}
