import AgendaPanel from '../components/agenda/AgendaPanel'

export default function AgendaPage() {
  return <div className="mx-auto grid w-full max-w-5xl gap-5">
    <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Agenda</h1>
    <AgendaPanel/>
  </div>
}
