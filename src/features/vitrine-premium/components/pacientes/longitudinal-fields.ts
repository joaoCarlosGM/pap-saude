import type {ChartKind} from '../../lib/longitudinal'

export type EditableKind = Exclude<ChartKind, 'consulta' | 'soap' | 'agenda'>
type Options = readonly (readonly [string, string])[]
export type Field = {key: string; label: string; type?: string; options?: Options; required?: boolean}
const sources = [['relato','Relato'], ['registro_profissional','Registro profissional sintético'], ['documento_sintetico','Documento sintético']] as const
const history = [['nao_investigado','Não investigada'], ['desconhecido','Desconhecida'], ['investigado_sem_relato','Investigada sem relato'], ['ausencia_confirmada','Ausência confirmada']] as const
const field = (key: string, label: string, type?: string, required?: boolean): Field => ({key, label, type, required})
const choice = (key: string, label: string, options: Options, required = false): Field => ({key,label,options,required})
const status = (options: Options) => choice('status', 'Situação', options, true)
const source = (options: Options = sources) => choice('source', 'Origem da informação', options, true)
const name = (label: string) => field('name', label, 'text', true)
const notes = field('notes', 'Observações da fonte', 'textarea')
const start = field('start', 'Início informado', 'date')
const end = field('end', 'Fim informado', 'date')
export const chartLabels: Record<ChartKind, string> = {
  pedido:'Solicitação de exame', resultado:'Resultado de exame', vacina:'Dose de vacina',
  contato:'Contatos e endereço', identidade:'Retificação cadastral', medicacao:'Medicação',
  alergia:'Alergia', comorbidade:'Comorbidade', historico:'Situação da investigação', consulta:'Consulta', agenda:'Compromisso', soap:'Anotação SOAP',
}
export const definitions: Record<EditableKind, {button: string; fields: Field[]; pdf?: string; singleton?: boolean}> = {
  pedido: {button:'Solicitar exame', fields:[
    name('Nome do exame'), field('date','Data da solicitação','date',true), field('time','Horário informado (Fortaleza)','time'), field('requester','Profissional solicitante','text',true),
    status([['solicitado','Solicitado'],['agendado','Agendado'],['coletado','Coletado'],['concluido','Concluído'],['cancelado','Cancelado']]),
    source(), choice('priority','Prioridade informada',[['rotina','Rotina'],['prioritario','Prioritário']]), field('encounterId','Consulta associada','encounter'), notes,
  ]},
  resultado: {button:'Registrar resultado', pdf:'PDF privado do exame', fields:[
    name('Nome do exame'), field('requestId','Solicitação associada','request'), field('collectedAt','Data da coleta','date'),
    field('date','Data do resultado','date'), field('laboratory','Laboratório'), field('method','Método'),
    status([['pendente','Pendente'],['disponivel','Disponível'],['revisado','Revisado'],['retificado','Retificado']]), source(),
    field('interpretation','Interpretação informada pelo emissor','textarea'),
  ]},
  vacina: {button:'Adicionar dose', pdf:'Comprovante privado', fields:[
    name('Vacina'), field('dose','Dose','text',true),
    status([['aplicada','Aplicada'],['agendada','Agendada'],['pendente','Pendente'],['desconhecida','Desconhecida'],['cancelada','Cancelada']]),
    field('date','Data de aplicação','date'), field('time','Horário informado (Fortaleza)','time'), field('scheduledDate','Data prevista','date'),
    source([['relato','Relato'],['comprovante','Comprovante'],['registro_aplicacao','Registro de aplicação']]),
    field('batch','Lote'), field('manufacturer','Fabricante'), field('unit','Unidade de aplicação'),
    field('route','Via'), field('site','Local ou lateralidade'), notes,
  ]},
  contato: {button:'Editar contatos', singleton:true, fields:[
    field('phone','Telefone','tel'), field('alternatePhone','Telefone alternativo','tel'),field('email','E-mail','email'),
    field('street','Logradouro'),field('number','Número'),field('complement','Complemento'),field('district','Bairro'),
    field('city','Município'),choice('state','UF','AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').map(uf=>[uf,uf])),
    field('zip','CEP'),source(),
  ]},
  identidade: {button:'Retificar identificação', singleton:true, fields:[
    field('name','Nome completo'),field('cpf','CPF demonstrativo'),field('birthDate','Data de nascimento','date'),
    field('cns','CNS demonstrativo (DEMO-...)'),field('dum','DUM retificada','date'),source(),
  ]},
  medicacao: {button:'Adicionar medicação', pdf:'PDF privado de referência', fields:[
    name('Medicação'),field('dose','Dose'),field('doseUnit','Unidade da dose'),field('route','Via'),field('frequency','Frequência'),
    start,end,status([['em_uso','Em uso'],['suspensa','Suspensa'],['encerrada','Encerrada'],['desconhecida','Desconhecida']]),
    source([['relato','Relato'],['registro_profissional','Registro profissional sintético'],['receita_anexada','Receita sintética anexada']]),notes,
  ]},
  alergia: {button:'Adicionar alergia', fields:[
    name('Agente'),field('reaction','Reação relatada','textarea'),choice('severity','Gravidade relatada',[['leve','Leve'],['moderada','Moderada'],['grave','Grave'],['desconhecida','Desconhecida']]),
    status([['ativa','Ativa'],['inativa','Inativa'],['sob_revisao','Sob revisão']]),
    choice('confirmation','Confirmação',[['relatada','Relatada'],['confirmada','Confirmada'],['descartada','Descartada'],['desconhecida','Desconhecida']],true),
    source(),start,field('reviewedAt','Data da revisão','date'),notes,
  ]},
  comorbidade: {button:'Adicionar comorbidade', fields:[
    name('Condição'),start,end,status([['ativa','Ativa'],['resolvida','Resolvida'],['em_investigacao','Em investigação'],['desconhecida','Desconhecida']]),source(),notes,
  ]},
  historico: {button:'Atualizar investigação', singleton:true, fields:[choice('allergy','Investigação de alergias',history),choice('condition','Investigação de comorbidades',history),source()]},
}
