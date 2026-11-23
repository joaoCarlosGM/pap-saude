'use client'

import Link from 'next/link'
import type {Atendimento} from '../../types/atendimento'
import AssessmentDetails from '../demo/AssessmentDetails'
import Modal from '../ui/Modal'

const formatDateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short',
})

function Facts({fields}: {fields: [string, string | undefined][]}) {
  return <dl className="grid gap-3 text-sm sm:grid-cols-2">{fields.map(([label, value]) =>
    <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-slate-600">{label}</dt><dd className="break-words font-medium">{value?.trim() || 'Não registrado'}</dd>
    </div>)}</dl>
}

function measure(value: string | undefined, unit: string) {
  return value ? `${value} ${unit}` : undefined
}

export default function AtendimentoDetailsModal({atendimento, open, onClose}: {
  atendimento: Atendimento | null
  open: boolean
  onClose: () => void
}) {
  if (!atendimento) return null
  const record = atendimento.registration
  const timestamp = formatDateTime.format(new Date(atendimento.dataHora))
  const assessment = atendimento.assessmentSource === 'PAP_MEOWS_DEMO' ? atendimento.assessment : undefined
  return <Modal open={open} onClose={onClose} title="Detalhes do Atendimento"
    description={`${atendimento.paciente.nome} • Consulta #${atendimento.consultaNumero}`} maxWidth="lg">
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{timestamp} · {atendimento.profissional.nome}</p>
        <Link onClick={onClose} className="inline-flex min-h-11 items-center text-sm text-pink-700 underline" href={'/vitrine/pacientes/' + atendimento.paciente.id}>Abrir ficha da paciente</Link>
      </div>
      <section>
        <h3 className="mb-2 font-semibold">Cronologia</h3>
        {record ? <ol className="border-l-2 border-pink-200 pl-4 text-sm">
          <li><time dateTime={atendimento.dataHora}>{timestamp}</time> · {atendimento.profissional.nome}
            <p className="font-medium">Registro concluído</p><p className="text-slate-600">Fonte: formulário de Registro da Vitrine.</p></li>
        </ol> : <p className="text-sm text-slate-600">Sem histórico disponível para esta consulta histórica.</p>}
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Queixa e evolução</h3>
        <Facts fields={ [['Queixa principal', record?.queixasPrincipais], ['Observações', record?.observacoesProfissional]] }/>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Sinais vitais</h3>
        <Facts fields={ [
          ['Pressão arterial', record?.paSistolica && record.paDiastolica ? `${record.paSistolica}/${record.paDiastolica} mmHg` : undefined],
          ['Frequência cardíaca', measure(record?.frequenciaCardiaca, 'bpm')],
          ['Frequência respiratória', measure(record?.frequenciaRespiratoria, 'irpm')],
          ['Temperatura', measure(record?.temperatura, '°C')], ['Saturação de O₂', measure(record?.saturacaoO2, '%')],
          ['Nível de consciência', record?.nivelConsciencia], ['Débito urinário', record?.debitoUrinario], ['Proteinúria', record?.proteinuria],
        ] }/>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Gestação e obstetrícia</h3>
        <Facts fields={ [
          ['Idade gestacional no registro', record ? atendimento.paciente.idadeGestacional : undefined],
          ['Altura uterina', measure(record?.alturaUterina, 'cm')], ['BCF', measure(record?.bcf, 'bpm')],
          ['Peso', measure(record?.pesoAtual, 'kg')], ['Movimentação fetal', record?.movimentacaoFetal],
          ['Edema', record?.edema], ['Sangramento vaginal', record?.sangramentoVaginal],
        ] }/>
      </section>
      <section>
        <h3 className="font-semibold">Avaliação</h3>
        {assessment ? <AssessmentDetails result={assessment}/> : <p className="text-sm text-slate-600">Sem avaliação verificável neste registro.</p>}
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Encaminhamento, anexos e fechamento</h3>
        <Facts fields={ [['Encaminhamento', record?.referral], ['Desfecho', record?.outcome], ['Anexos da consulta', undefined]] }/>
      </section>
    </div>
  </Modal>
}
