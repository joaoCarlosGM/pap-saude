'use client'

import {useState} from 'react'
import Link from 'next/link'
import {appointmentKinds, describeSlot, appointmentTimestamp, nextAppointments, useAgendaClock, useAppointments, visibleAppointments} from '../../lib/demo-agenda'
import {useDemo} from './DemoProvider'
import {useCardService} from './CardServiceContext'
import Modal from '../ui/Modal'
import {Button} from '../ui/button'
import type {DemoNotice} from '../../lib/demo-notices'

const categories = ['Todos', 'Pacientes', 'Atendimentos', 'Sistema', 'Protocolos', 'Documentos', 'Agenda'] as const
const formatDate = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza'})

export default function NoticeInbox() {
  const demo = useDemo()
  const schedules = useAppointments()
  const now = useAgendaClock()
  const privateService = useCardService()
  const cards = privateService?.history || []
  const [category, setCategory] = useState<(typeof categories)[number]>('Todos')
  const items: DemoNotice[] = [...demo.notices]
  for (const encounter of demo.state.encounters) {
    if (!encounter.registration) continue
    items.push({id: 'encounter-' + encounter.id, category: 'Atendimentos', title: 'Atendimento registrado',
      summary: 'O atendimento sintético foi acrescentado ao histórico.', date: encounter.dataHora, href: '/vitrine/atendimentos'})
  }
  for (const card of cards) {
    if (card.issuedAt) items.push({id: 'card-issued-' + card.id, category: 'Documentos', title: 'Carteirinha emitida',
      summary: 'O comprovante de emissão está em Documentos.', date: card.issuedAt, href: '/vitrine/pacientes/' + card.patientId + '?aba=documentos'})
    if (card.revokedAt) items.push({id: 'card-revoked-' + card.id, category: 'Documentos', title: 'Carteirinha revogada',
      summary: 'A alteração aparece no histórico de emissões.', date: card.revokedAt, href: '/vitrine/pacientes/' + card.patientId + '?aba=documentos'})
  }
  const visibleSchedules = visibleAppointments(schedules, privateService?.people)
  for (const appointment of visibleSchedules) {
    const latest = appointment.events.at(-1)!
    items.push({id: 'agenda-'+latest.id, category: 'Agenda', title: appointmentKinds[appointment.kind]+' · agenda atualizada',
      summary: describeSlot(appointment.slot), date: latest.at, href: '/vitrine/agenda'})
  }
  for (const appointment of nextAppointments(visibleSchedules, now)) {
    if (appointmentTimestamp(appointment.slot!) - now > 86_400_000) break
    items.push({id: 'agenda-lembrete-'+appointment.id+'-'+appointment.slot!.date+'-'+appointment.slot!.time, category: 'Agenda',
      title: 'Lembrete de '+appointmentKinds[appointment.kind].toLowerCase(), summary: describeSlot(appointment.slot),
      date: new Date(appointmentTimestamp(appointment.slot!)).toISOString(), href: '/vitrine/agenda'})
  }
  items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const unread = items.filter(item => !demo.readNotices.includes(item.id))
  const visible = items.filter(item => category === 'Todos' || item.category === category)
  const close = () => demo.requestNotices(false)
  return <Modal open={demo.noticesRequested} onClose={close} title="Caixa de entrada" maxWidth="md">
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm">{unread.length} não lido(s)</p>
        <Button variant="outline" disabled={!unread.length} onClick={() => demo.markNoticesRead(unread.map(item => item.id))}>Marcar todos como lidos</Button>
      </div>
      <div role="group" aria-label="Categorias dos avisos" className="flex flex-wrap gap-2">
        {categories.map(label => <Button key={label} type="button" variant={category === label ? 'default' : 'outline'} aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</Button>)}
      </div>
      {visible.length ? <ul className="grid gap-2">{visible.map(item => {
        const seen = demo.readNotices.includes(item.id)
        return <li key={item.id} className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-600">{item.category} · Informativo · {seen ? 'Lido' : 'Não lido'}</p>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-slate-600">{item.summary}</p>
          <time dateTime={item.date} className="text-xs text-slate-600">{formatDate.format(new Date(item.date))}</time>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="inline-flex min-h-11 items-center text-sm text-pink-700 underline" href={item.href} onClick={() => {demo.markNoticesRead([item.id]); close()}}>Abrir <span className="sr-only">{item.title}</span></Link>
            {!seen && <Button variant="outline" onClick={() => demo.markNoticesRead([item.id])}>Marcar como lido</Button>}
          </div>
        </li>
      })}</ul> : <p role="status" className="py-6 text-center text-sm text-slate-600">Nenhum aviso nesta categoria.</p>}
    </div>
  </Modal>
}
