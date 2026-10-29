import type {MeowsResult} from '@/types/meows'
import {assessmentPresentation,DEMO_ASSESSMENT_NOTICE} from '@/lib/demo/assessment-presentation'
export default function AssessmentDetails({result}:{result:MeowsResult}){
 return <section data-meows-status={result.status} data-meows-score={result.score??'—'} className="mt-4 min-w-0 space-y-3 text-sm">
  <p className="font-semibold">{result.protocolVersion} · {assessmentPresentation(result.classification).label}</p>
  <p>Status: {result.status} · Total: {result.score??'—'} · Parâmetro crítico: {result.critical?'Sim':'Não'}</p>
  {result.missing.length>0&&<p>Componentes faltantes: {result.parameters.filter(p=>result.missing.includes(p.key)).map(p=>p.parameter).join(', ')}</p>}
  {result.errors.length>0&&<div role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">{result.errors.map((e,i)=><p key={i}>{e.parameter}: {e.message}</p>)}</div>}
  <dl className="space-y-2">{result.parameters.map(p=><div key={p.key} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3"><dt>{p.parameter}: {p.value}</dt><dd>{p.points===null?'Não pontuado':`${p.points} ponto(s)`}</dd></div>)}</dl>
  <p className="rounded-lg border border-pink-200 p-3 text-pink-700">{DEMO_ASSESSMENT_NOTICE}</p>
 </section>
}
