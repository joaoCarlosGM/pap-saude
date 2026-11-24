import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)
const {initialDemo, saveDemo, registrationErrors, filterEncounters, patientViews} = require('../../src/features/vitrine-premium/lib/demo/data.ts')
const {createSoapNote, registrationDetails} = require('../../src/features/vitrine-premium/lib/registration-record.ts')
const {createAppointment, changeAppointment, appointmentTimestamp, nextAppointments, agendaPatient, visibleAppointments} = require('../../src/features/vitrine-premium/lib/demo-agenda.ts')
const at = '2026-11-24T16:00:00.000Z'
const input = () => ({
  cpf: '98000000000', nomeCompleto: 'Gestante Sintética Teste', dataNascimento: '1995-02-03',
  dumUnknown: true, dum: '', paSistolica: '', paDiastolica: '', frequenciaCardiaca: '',
  frequenciaRespiratoria: '', temperatura: '', saturacaoO2: '', pesoAtual: '', bcf: '', alturaUterina: '',
  queixasPrincipais: 'Queixa sintética estruturada', observacoesProfissional: 'Texto anterior preservado',
})

test('proteinúria não realizada é distinta da negativa e o resultado quantitativo permanece separado', () => {
  const lab = {value: '30,5', unit: 'mg/24 h', date: '2026-11-22', method: 'Método de teste'}
  const record = {...input(), proteinuria: 'nao_realizado', proteinuriaLab: lab}
  assert.deepEqual(registrationErrors(record, 3), [])
  assert.equal(registrationErrors({...record, proteinuriaLab: {...lab, unit: ''}}, 3).length, 1)
  const result = saveDemo(initialDemo(), record).encounters.at(-1).registration
  assert.equal(result.proteinuria, 'nao_realizado')
  assert.equal(registrationDetails(result).proteinuria, 'Não realizado')
  assert.equal(registrationDetails({...result, proteinuria:'negativa'}).proteinuria, 'Negativa')
  assert.deepEqual(result.proteinuriaLab, lab)
  assert.match(registrationDetails(result).lab, /30,5 mg\/24 h/)
})

test('edema preserva gradação, localizações e autoria sem converter os valores antigos', () => {
  for (const [value, label] of [['nao_avaliado','Não avaliado'], ['ausente','Ausente'], ['leve','Leve (registro anterior)']]) {
    assert.equal(registrationDetails({edema:value}).edema, label)
  }
  const data = {...input(), edema:'3+/4+', edemaLocations:['face','outro'], edemaOtherLocation:'Outra região'}
  assert.equal(registrationErrors({...data, edemaOtherLocation:''}, 4).length, 1)
  const encounter = saveDemo(initialDemo(), data, {at, agendaIdentity:'fixture-identity'}).encounters.at(-1)
  const details = registrationDetails(encounter.registration)
  assert.equal(details.location, 'Face, Outra região')
  assert.match(details.provenance, /Ana Paula Ferreira · Registro da Vitrine/)
  assert.equal(encounter.registration.edema, '3+/4+')
  assert.equal(encounter.score, null)
})

test('SOAP e fechamento preservam os textos anteriores e a queixa é pesquisável', () => {
  const contents = {subjective:'Relato de teste', objective:'', assessment:'', plan:''}
  const notes = [createSoapNote('enfermagem', contents),createSoapNote('medicina', {...contents, plan:'Retorno'})]
  const record = {...input(), soapNotes:notes, referral:'Conduta anterior', referralChoice:'ubs', outcomeChoice:'retorno'}
  const result = saveDemo(initialDemo(), record)
  const encounter = result.encounters.at(-1)
  assert.deepEqual(encounter.registration.soapNotes,notes)
  assert.equal(encounter.registration.observacoesProfissional,record.observacoesProfissional)
  assert.match(registrationDetails(encounter.registration).referral,/Manter acompanhamento na UBS · Conduta anterior/)
  assert.equal(registrationDetails(encounter.registration).outcome,'Retorno programado')
  const patient = patientViews(result).find(item => item.id === encounter.paciente.id)
  assert.match(patient.timeline.find(item => item.id === encounter.id).subtitle,/Retorno programado/)
  assert.deepEqual(filterEncounters(result.encounters, {search:'estruturada', period:'all', risk:'all', professional:'all'}),[encounter])
  assert.equal(registrationErrors({...record, outcomeChoice:'outro'},5).length, 1)
  assert.throws(() => createSoapNote('autor-inexistente', contents), /inválida/)
})

test('agenda mantém histórico de solicitação, agendamento, confirmação, reagendamento e cancelamento', () => {
  const patient = agendaPatient(initialDemo().patients[0])
  const appointment = createAppointment({patient, kind:'solicitacao', slot:null, reason:'Exame de teste', unit:'UBS de teste', professional:'Equipe de teste'},'Autor de teste')
  const slot = {date:'2026-11-25', time:'14:30'}
  assert.throws(() => createAppointment({...appointment,kind:'consulta',slot:null},'Autor de teste'))
  const consultation = createAppointment({...appointment,kind:'consulta',slot},'Autor de teste')
  assert.equal(consultation.kind,'consulta')
  assert.equal(consultation.events[0].slot.time,'14:30')
  assert.throws(() => changeAppointment(appointment,{kind:'status',status:'confirmado'},'Autor de teste'))
  const booked = changeAppointment(appointment,{kind:'slot',slot},'Autor de teste')
  assert.equal(booked.kind,'exame')
  assert.equal(appointmentTimestamp(slot), Date.parse('2026-11-25T17:30:00Z'))
  assert.deepEqual(nextAppointments([booked], Date.parse(at)),[booked])
  const confirmed = changeAppointment(booked,{kind:'status',status:'confirmado'},'Autor de teste')
  const moved = changeAppointment(confirmed,{kind:'slot',slot:{...slot,time:'15:00'}},'Outro autor')
  const cancelled = changeAppointment(moved,{kind:'status',status:'cancelado'},'Outro autor')
  assert.equal(moved.status,'planejado')
  assert.deepEqual(cancelled.events.map(event => event.action),['criado','agendado','situacao','reagendado','situacao'])
  assert.deepEqual(cancelled.events[1].slot,slot)
  assert.deepEqual(nextAppointments([cancelled], Date.parse(at)),[])
  assert.throws(() => changeAppointment(cancelled,{kind:'slot',slot},'Autor de teste'))
  const privateItem = {...booked, patient:{...patient,id:'review-123',key:'review-123'}}
  assert.deepEqual(visibleAppointments([booked,privateItem]),[booked])
  assert.deepEqual(visibleAppointments([privateItem],[{patientId:'review-123'}]),[privateItem])
  assert.equal(agendaPatient({id:'demo-patient-1',nome:'Outro cadastro'}),undefined)
})
