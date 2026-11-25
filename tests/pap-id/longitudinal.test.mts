import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID,randomInt} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {readProfile,connect,issueInitial,revoke} from '../../scripts/private-review/card-store'
import {createPerson,uploadDocument,archiveDocument,loadDocument,upgradeRegistry} from '../../scripts/private-review/registry-store'
import {readChart,writeChart,upgradeLongitudinal} from '../../scripts/private-review/longitudinal-store'
import {registryResponse} from '../../scripts/private-review/registry-api'
import {session} from '../../scripts/private-review/documents'
import {chartData,chartRegistration,latestChartEvents,type ChartData,type ChartCommand} from '../../src/features/vitrine-premium/lib/longitudinal'
import {invalidSyntheticCpf} from '../../src/features/vitrine-premium/lib/review-registry'
import {initialDemo,saveDemo} from '../../src/features/vitrine-premium/lib/demo/data'
import {syntheticPdf} from './synthetic-pdf'

const registration = {
  dum:'',dumUnknown:true,primeiroAtendimento:null,paSistolica:'',paDiastolica:'',frequenciaCardiaca:'',
  frequenciaRespiratoria:'',temperatura:'',saturacaoO2:'',nivelConsciencia:'',debitoUrinario:'',proteinuria:'',
  alturaUterina:'',bcf:'',movimentacaoFetal:'',edema:'',sangramentoVaginal:'',pesoAtual:'',
  queixasPrincipais:'Consulta sintética de continuidade',observacoesProfissional:'',
} satisfies ReturnType<typeof chartRegistration.parse>

function person() {
  let document: string
  do {document='98'+String(randomInt(1_000_000_000)).padStart(9,'0')} while(!invalidSyntheticCpf(document))
  return {name:'Gestante Sintética Laboratório',birthDate:'1998-08-14',document,syntheticConsent:true}
}
const command = (data:ChartData, entityId:string=randomUUID(), expectedVersion=0, reason?:string):ChartCommand =>
  ({operationId:randomUUID(),entityId,expectedVersion,data,reason})

test('H23–H27 validam dados explícitos e H26/H27 preservam histórico e DPP em consulta vazia', () => {
  assert.equal(chartData.safeParse({kind:'resultado',name:'Teste',status:'disponivel',source:'relato',date:'2026-10-01',components:[],documentId:randomUUID()}).success,false)
  assert.equal(chartData.safeParse({kind:'vacina',name:'Teste',dose:'D1',status:'aplicada',source:'relato'}).success,false)
  assert.equal(chartData.safeParse({kind:'vacina',name:'Teste',dose:'D1',status:'agendada',source:'relato',date:'2026-10-01',scheduledDate:'2026-11-01'}).success,false)
  assert.equal(chartData.safeParse({kind:'identidade',source:'relato',cpf:'12345678909'}).success,false)
  assert.equal(chartData.safeParse({kind:'contato',source:'relato',state:'XX'}).success,false)
  const seed=initialDemo(),patient=seed.patients[0]
  const record={...registration,cpf:patient.cpf,nomeCompleto:patient.nome,dataNascimento:patient.dataNascimento}
  const medications=[{name:'Sintética A',dose:'1',route:'oral',frequency:'relato A'},{name:'Sintética B',dose:'2',route:'oral',frequency:'relato B'}]
  const first=saveDemo(seed,{...record,medications,allergyStatus:'sim',allergies:[{agent:'Agente teste',reaction:'Reação informada',notes:''}],comorbidityStatus:'sim',conditions:['Condição teste']})
  const second=saveDemo(first,{...record,medications:[],allergyStatus:'desconhecido'})
  const third=saveDemo(second,record)
  const [a,b,c]=[first,second,third].map(state=>state.patients.find(item=>item.id===patient.id)!)
  assert.deepEqual(b.medications,a.medications)
  assert.deepEqual(c.medications,a.medications)
  assert.ok(c.medications.filter(item=>item.name.startsWith('Sintética')).every(item=>/^[0-9a-f-]{36}$/.test(item.id)))
  assert.deepEqual(c.allergies,a.allergies)
  assert.deepEqual(c.comorbidities,a.comorbidities)
  assert.deepEqual(c.pregnancy,patient.pregnancy)
})

test('H23–H28 PostgreSQL próprio: versões, autorização, Agenda e SOAP, PDF, idempotência e reinício real', async () => {
  const file=process.env.PAP_ID_REVIEW_PROFILE
  assert.ok(file,'Exige perfil descartável próprio')
  const profile=await readProfile(file)
  let pool=connect(profile)
  const origin='http://127.0.0.1:49165'
  Object.assign(process.env,{PAP_PRIVATE_REVIEW:'1',PAP_PRIVATE_REVIEW_ORIGIN:origin,PAP_PRIVATE_REVIEW_ROOT:process.cwd(),
    PAP_PRIVATE_REVIEW_SECRET:randomBytes(32).toString('hex'),PAP_PRIVATE_REVIEW_EXPIRES:String(Date.now()+120000)})
  try {
    await upgradeRegistry(pool,profile)
    await upgradeLongitudinal(pool,profile)
    await upgradeLongitudinal(pool,profile)
    const a=await createPerson(pool,person(),randomUUID()),b=await createPerson(pool,person(),randomUUID())
    await assert.rejects(issueInitial(pool,a.patientId),/INITIAL_ISSUE_UNAVAILABLE/)
    const cardsFor = async () => (await pool.query('SELECT hash,revoked FROM review_cards WHERE subject=$1',[a.subject])).rows
    assert.equal((await cardsFor()).length,0)
    await Promise.all([issueInitial(pool,a.patientId,profile.cardKey),issueInitial(pool,a.patientId,profile.cardKey)])
    assert.equal((await cardsFor()).length,1)
    await assert.rejects(issueInitial(pool,'maria-gracas',profile.cardKey),/INITIAL_ISSUE_UNAVAILABLE/)
    const grant=await session(new Request(origin+'/homologacao/sessao',{method:'POST',headers:{
      host:new URL(origin).host,origin,'x-pap-local-review':'consent',
    },body:'{"consent":true}'}))
    assert.equal(grant.status,200)
    const cookie=grant.headers.get('set-cookie')!.split(';')[0]
    const upload = async (patientId:string) => uploadDocument(pool,patientId,{
      name:'evidencia-sintetica.pdf', category:'EXAME_DEMONSTRATIVO', operationId:randomUUID(),
    },syntheticPdf())
    const pdf=await upload(a.patientId), otherPdf=await upload(b.patientId)
    const write = (input:ChartCommand) => writeChart(pool,a.patientId,input)
    const request = (patientId:string,body?:ChartCommand,extra:Record<string,string>={},query='',method=body?'POST':'GET') =>
      registryResponse(new Request(origin+'/homologacao/pacientes/'+patientId+'/prontuario'+query,{
        method, headers:{host:new URL(origin).host,origin,cookie,'x-pap-local-review':'chart','content-type':'application/json',...extra},
        ...(body?{body:JSON.stringify(body)}:{}),
      }),patientId,'prontuario')
    assert.equal((await request(a.patientId,undefined,{cookie:''})).status,403)
    assert.equal((await request(a.patientId,undefined,{},'?download=1')).status,404)
    assert.equal((await request(a.patientId,undefined,{},'','DELETE')).status,405)
    const exam=command({kind:'pedido',name:'Análise sintética',date:'2026-10-02',time:'09:30',requester:'Equipe simulada',status:'solicitado',source:'registro_profissional'})
    assert.equal((await request(a.patientId,exam,{origin:'http://foreign.invalid'})).status,403)
    assert.equal((await request(a.patientId,exam,{'x-pap-local-review':'documents'})).status,403)
    const inserted=await request(a.patientId,exam)
    assert.equal(inserted.status,200)
    assert.match(inserted.headers.get('cache-control')??'',/no-store/)
    const replay=await write(exam)
    assert.equal(replay.id,exam.operationId)
    assert.equal(replay.occurredAt,'2026-10-02T12:30:00.000Z')
    assert.equal(replay.occurrencePrecision,'time')
    assert.notEqual(replay.occurredAt,replay.recordedAt)
    assert.equal((await request(b.patientId,exam)).status,409)
    const updates=await Promise.allSettled(['coletado','cancelado'].map(status=>write(command({...exam.data,status} as ChartData,exam.entityId,1))))
    assert.equal(updates.filter(entry=>entry.status==='fulfilled').length,1)
    assert.equal(updates.filter(entry=>entry.status==='rejected').length,1)
    const complete=await write(command({...exam.data,status:'concluido'} as ChartData,exam.entityId,2))
    assert.ok(complete.actions.includes('status_changed'))
    const canceled=await write(command({...exam.data,status:'cancelado'} as ChartData,exam.entityId,3))
    assert.ok(canceled.actions.includes('status_changed'))
    assert.equal((await readChart(pool,a.patientId)).events.filter(event=>event.data.kind==='resultado').length,0)
    const result=command({kind:'resultado',name:'Resultado sintético',requestId:exam.entityId,collectedAt:'2026-10-03',
      date:'2026-10-04',components:[{name:'Medida',value:'10,3',unit:'mg/L',reference:'1–15'}],
      source:'documento_sintetico',status:'disponivel',documentId:pdf.id})
    assert.equal((await request(a.patientId,{...result,data:{...result.data,documentId:otherPdf.id} as ChartData})).status,404)
    assert.equal((await request(b.patientId,{...result,data:{...result.data,documentId:otherPdf.id} as ChartData})).status,404)
    assert.ok((await write(result)).actions.includes('linked'))
    const version=await write(command({...result.data,status:'retificado',components:[{name:'Medida',value:'9,7'}]} as ChartData,result.entityId,1,'Conferência da referência sintética'))
    assert.ok(version.actions.includes('corrected'))
    assert.equal((await loadDocument(pool,a.patientId,pdf.id))!.bytes.toString(),syntheticPdf().toString())
    assert.equal(await loadDocument(pool,b.patientId,pdf.id),null)
    const dose=command({kind:'vacina',name:'Vacina sintética',dose:'D1',status:'agendada',scheduledDate:'2026-11-30',source:'relato'})
    await write(dose)
    await assert.rejects(write(command(dose.data)),/DOSE_ALREADY_RECORDED/)
    const agenda=await write(command({kind:'agenda',appointmentKind:'vacinacao',status:'planejado',
      vaccineId:dose.entityId,slot:{date:'2026-11-30',time:'12:00'},professional:'Equipe sintética',unit:'UBS sintética',notes:'Dose D1'}))
    assert.ok(agenda.actions.includes('created'))
    const applied=await write(command({kind:'vacina',name:'Vacina sintética',dose:'D1',date:'2026-11-21',status:'aplicada',
      source:'comprovante',documentId:pdf.id},dose.entityId,1))
    assert.ok(applied.actions.includes('status_changed'))
    const contact=await write(command({kind:'contato',phone:'(85) 90000-0000',zip:'60000-000',source:'relato'}))
    const patch=await write(command({kind:'contato',city:'Fortaleza',state:'CE',source:'relato'},contact.entityId,1))
    assert.equal(patch.data.kind==='contato' && patch.data.phone,'(85) 90000-0000')
    const identity=await write(command({kind:'identidade',cpf:person().document,cns:'DEMO-TESTE',dum:'2026-06-17',source:'registro_profissional'},randomUUID(),0,'Correção administrativa'))
    assert.ok(identity.actions.includes('corrected'))
    assert.equal((await pool.query('SELECT identity FROM review_people WHERE subject=$1',[a.subject])).rows[0].identity.document,a.document)
    const med=await write(command({kind:'medicacao',name:'Medicação simulada',status:'em_uso',dose:'2',doseUnit:'unidades',source:'relato'}))
    assert.equal((await request(b.patientId,command({...med.data,status:'suspensa'} as ChartData,med.entityId,1,'Relato'))).status,404)
    const suspended=await write(command({...med.data,status:'suspensa'} as ChartData,med.entityId,1,'Suspensão informada'))
    assert.ok(suspended.actions.includes('status_changed'))
    await write(command({...med.data,status:'encerrada',end:'2026-11-24'} as ChartData,med.entityId,2,'Fim informado'))
    await write(command({kind:'medicacao',name:'Segunda medicação',status:'desconhecida',source:'relato'}))
    const allergies=await write(command({kind:'alergia',name:'Agente simulado',reaction:'Reação relatada',status:'sob_revisao',confirmation:'relatada',source:'relato'}))
    const condition=await write(command({kind:'comorbidade',name:'Condição simulada',status:'ativa',source:'relato'}))
    await write(command({...condition.data,status:'resolvida'} as ChartData,condition.entityId,1,'Estado informado'))
    const forged={subjective:'Anotação sintética',objective:'',assessment:'',plan:''}
    const visit=await write(command({kind:'consulta',record:{...registration,medications:[],edema:'ausente',
      edemaLocations:['face'],edemaOtherLocation:'Campo incompatível',soapNotes:[{id:randomUUID(),author:'medicina',
        category:'Categoria adulterada',recordedAt:'2020-01-01T00:00:00.000Z',content:forged}]}}))
    assert.equal(visit.assessment?.status,'INCOMPLETO')
    assert.equal(visit.assessment?.score,null)
    assert.equal(visit.data.kind==='consulta' && visit.data.record.edemaLocations,undefined)
    assert.equal(visit.data.kind==='consulta' && visit.data.record.soapNotes?.[0].author,'enfermagem')
    assert.equal(visit.data.kind==='consulta' && visit.data.record.soapNotes?.[0].category,'Enfermagem')
    assert.notEqual(visit.data.kind==='consulta' && visit.data.record.soapNotes?.[0].recordedAt,'2020-01-01T00:00:00.000Z')
    const completeRecord={...registration,paSistolica:'120',paDiastolica:'75',frequenciaCardiaca:'78',
      frequenciaRespiratoria:'16',temperatura:'36.5',oxygenMode:'air' as const,nivelConsciencia:'alerta'}
    const zero=await write(command({kind:'consulta',record:completeRecord}))
    const critical=await write(command({kind:'consulta',record:{...completeRecord,paSistolica:'160'}}))
    assert.equal(zero.assessment?.score,0)
    assert.equal(critical.assessment?.score,3)
    const added=await write(command({kind:'soap',encounterId:visit.entityId,author:'medicina',category:'Adulterada',content:forged}))
    assert.equal(added.data.kind==='soap' && added.data.author,'enfermagem')
    assert.equal(added.data.kind==='soap' && added.data.category,'Enfermagem')
    assert.equal((await readChart(pool,b.patientId)).events.length,0)
    const snapshot=await readChart(pool,a.patientId)
    const cardSnapshot=await cardsFor()
    assert.equal(snapshot.documents[0].entityId,pdf.id)
    const latest=latestChartEvents(snapshot.events)
    assert.equal(latest.filter(e=>e.data.kind==='medicacao').length,2)
    assert.equal(latest.find(e=>e.entityId===allergies.entityId)!.version,1)
    assert.equal(latest.find(e=>e.entityId===agenda.entityId)?.data.kind,'agenda')
    await assert.rejects(pool.query('UPDATE review_chart_events SET reason=$1 WHERE id=$2',['fake',applied.id]),/REVIEW_AUDIT_APPEND_ONLY/)
    await assert.rejects(pool.query('DELETE FROM review_chart_events WHERE id=$1',[applied.id]),/REVIEW_AUDIT_APPEND_ONLY/)
    if(process.env.PAP_H23_RESTART==='1') {
      await pool.end()
      for(const action of ['stop','start'])execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/pap-id/review-lab.mts','--action',action,'--profile',file],{stdio:'pipe'})
      pool=connect(await readProfile(file))
      assert.deepEqual(await readChart(pool,a.patientId),snapshot)
      assert.deepEqual(await cardsFor(),cardSnapshot)
      assert.deepEqual((await loadDocument(pool,a.patientId,pdf.id))!.bytes,syntheticPdf())
    }
    await revoke(pool,a.subject)
    await assert.rejects(issueInitial(pool,a.patientId,profile.cardKey),/MANUAL_REISSUE_REQUIRED/)
    assert.equal((await cardsFor()).length,1)
    assert.equal(await archiveDocument(pool,a.patientId,pdf.id),true)
    assert.equal(await loadDocument(pool,a.patientId,pdf.id),null)
    assert.equal((await readChart(pool,a.patientId)).documents[0].action,'status_changed')
    assert.equal((await request(a.patientId,{...result,operationId:randomUUID(),entityId:randomUUID()})).status,404)
    const withoutPdf=await write(command({...version.data,documentId:undefined} as ChartData,result.entityId,2))
    assert.deepEqual(withoutPdf.actions,['unlinked'])
    const expiration=process.env.PAP_PRIVATE_REVIEW_EXPIRES
    process.env.PAP_PRIVATE_REVIEW_EXPIRES=String(Date.now()-1)
    assert.equal((await request(a.patientId)).status,403)
    assert.equal((await request(a.patientId,result)).status,403)
    process.env.PAP_PRIVATE_REVIEW_EXPIRES=expiration
    const revoked=await session(new Request(origin+'/homologacao/sessao',{method:'DELETE',headers:{
      origin,host:new URL(origin).host,cookie,'x-pap-local-review':'consent',
    }}))
    assert.equal(revoked.status,200)
    assert.equal((await request(a.patientId)).status,403)
    assert.equal((await request(a.patientId,result)).status,403)
  } finally {await pool.end()}
})
