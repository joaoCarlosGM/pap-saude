'use client'
import {useDemo} from '../components/demo/DemoProvider'
export default function Help(){const demo=useDemo();return <section className="rounded-xl border bg-white p-5"><h1 className="text-xl font-semibold">Ajuda da Vitrine</h1><p className="mt-3 text-sm text-slate-600">Dados exclusivamente fictícios. O registro é mantido somente na memória desta demonstração, sem atendimento clínico real.</p><button type="button" className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-white" onClick={()=>demo.requestHelp(true)}>Abrir boas-vindas e tutorial</button></section>}
