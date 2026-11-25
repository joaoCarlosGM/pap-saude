import {devices, expect, test, type Page} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {randomBytes, randomUUID} from 'node:crypto'
import {invalidSyntheticCpf} from '../../src/features/vitrine-premium/lib/review-registry'
import type {ChartData} from '../../src/features/vitrine-premium/lib/longitudinal'

const evidence = process.env.PAP_PROTOCOLS_EVIDENCE
const civil = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'})
const origin = process.env.PAP_PROTOCOLS_BASE_URL!
const button = (page:Page, name:string) => page.getByRole('button',{name,exact:true})
const tab = async (page:Page,name:string) => {await button(page,name).click()}

async function authorize(page:Page) {
  test.skip(!process.env.PAP_ID_REVIEW_PROFILE,'Requer laboratório descartável')
  const consent = await page.request.post('/homologacao/sessao',{headers:{origin,'x-pap-local-review':'consent'},data:{consent:true}})
  expect(consent.status()).toBe(200)
}

async function fixturePatient(page: Page) {
  let document = ''
  do {document='98'+String(randomBytes(4).readUInt32BE()%1000000000).padStart(9,'0')} while(!invalidSyntheticCpf(document))
  const data = {action:'register',operationId:randomUUID(),input:{
    name:'Gestante Sintética UX '+randomBytes(3).toString('hex'),birthDate:'1998-08-14',document,syntheticConsent:true,
  }}
  const headers = {origin,'x-pap-local-review':'cards'}
  const result = await page.request.post('/homologacao/carteirinhas',{headers,data})
  expect(result.status()).toBe(201)
  const {patient,issuance} = await result.json()
  expect(issuance).toBe('issued')
  const retry = await page.request.post('/homologacao/carteirinhas',{headers,data})
  expect(retry.status()).toBe(201)
  expect((await retry.json()).patient.patientId).toBe(patient.patientId)
  return patient as {patientId:string;name:string}
}

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem('pap.vitrine.premium.welcome.v2','seen'))
  await page.emulateMedia({reducedMotion:'reduce'})
})

test('H32–H35 Resumo, MEOWS zero e crítico, calendário e Agenda privada em sete larguras',async ({page}) => {
  test.setTimeout(180_000)
  await authorize(page)
  const person = await fixturePatient(page)
  const url = '/vitrine/pacientes/'+person.patientId
  const endpoint = '/homologacao/pacientes/'+person.patientId+'/prontuario'
  async function write(data:ChartData) {
    const operationId = randomUUID()
    const response = await page.request.post(endpoint,{headers:{origin,'x-pap-local-review':'chart'},
      data:{operationId,entityId:operationId,expectedVersion:0,data}})
    expect(response.status()).toBe(200)
    return (await response.json()).event
  }
  await page.goto(url+'?aba=documentos')
  await expect(page.locator('[data-private-patient-documents] > section').first()).toHaveAccessibleName('PAP-Gest')
  await expect(page.getByText('Histórico de emissões (1)',{exact:true})).toBeVisible()
  await tab(page,'Resumo')
  await expect(page.locator('[data-current-meows]')).toHaveText('Não avaliado')
  await expect(button(page,'Editar contatos')).toHaveCount(0)
  const record = {
    dum:'',dumUnknown:true,primeiroAtendimento:null,paSistolica:'120',paDiastolica:'75',frequenciaCardiaca:'82',frequenciaRespiratoria:'16',
    temperatura:'36.5',saturacaoO2:'',nivelConsciencia:'alerta',debitoUrinario:'',proteinuria:'',oxygenMode:'air' as const,
    alturaUterina:'',bcf:'',movimentacaoFetal:'',edema:'',sangramentoVaginal:'',pesoAtual:'',
    queixasPrincipais:'Registro sintético para aferição demonstrativa',observacoesProfissional:'',
  }
  const first = await write({kind:'consulta',record})
  const second = await write({kind:'consulta',record:{...record,paSistolica:'160'}})
  expect(first.assessment.score).toBe(0)
  expect(second.assessment.score).toBe(3)
  await write({kind:'agenda',appointmentKind:'exame',status:'planejado',slot:{date:civil.format(new Date()),time:'23:59'},
    professional:'Equipe da sessão',unit:'UBS de teste',notes:'Compromisso sintético que alimenta o calendário'})
  await page.reload()
  await tab(page,'Resumo')
  await expect(page.locator('[data-current-meows]')).toHaveText('3')
  await expect(page.locator('[data-meows-recorded-point="0"]')).toHaveCount(1)
  await expect(page.locator('[data-meows-recorded-point="3"]')).toHaveCount(1)
  await expect(page.getByText('alertas MEOWS',{exact:true})).toBeVisible()
  await page.getByText('Ver alertas',{exact:true}).click()
  await expect(page.getByText('PAS · 160 mmHg',{exact:true})).toBeVisible()
  await page.getByText('Ver alertas',{exact:true}).click()
  await expect(page.getByRole('button',{name:/[0-9]+ planejados/})).toHaveCount(1)

  for (const width of [320,375,390,430,768,1024,1440]) {
    await page.setViewportSize({width,height:1000})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (evidence) await page.screenshot({path:evidence+'/resumo-populado-'+width+'.png',mask:[page.getByText(/^CPF /)]})
  }
  const contrast = await new AxeBuilder({page}).include('[data-assistential-summary]')
    .withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(contrast.violations.map(item => item.id)).toEqual([])
  await page.setViewportSize({width:390,height:820})
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
  if (evidence) await page.screenshot({path:evidence+'/resumo-390-dark.png',mask:[page.getByText(/^CPF /)]})
  const calendar = page.locator('section').filter({has:page.getByRole('heading',{name:'Calendário assistencial',exact:true})})
  await calendar.getByRole('button',{name:/Exame.*Planejado/}).click()
  await expect(page.getByRole('dialog',{name:'Detalhes do compromisso'})).toContainText('Compromisso sintético que alimenta o calendário')
  await page.keyboard.press('Escape')
  const agenda = page.getByRole('region',{name:'Agenda da paciente'})
  await agenda.getByLabel('Situação',{exact:true}).selectOption('cancelado')
  await expect(agenda.getByText('Nenhum compromisso corresponde aos filtros.')).toBeVisible()
  await agenda.getByLabel('Situação',{exact:true}).selectOption('planejado')
  await expect(agenda.getByRole('button',{name:'Detalhes'}).filter({visible:true})).toBeVisible()
  if (evidence) await page.screenshot({path:evidence+'/agenda-390.png',mask:[page.getByText(/^CPF /)]})
  await page.setViewportSize({width:1440,height:1000})
  await page.goto('/vitrine/atendimentos')
  await expect(page.locator(`tr[data-encounter-id="${first.entityId}"]`).getByText('0',{exact:true})).toBeVisible()
  await expect(page.locator(`tr[data-encounter-id="${second.entityId}"]`).getByText('3',{exact:true})).toBeVisible()
})

test.describe('Android emulado',() => {
  const {defaultBrowserType,...pixel} = devices['Pixel 7']
  void defaultBrowserType
  test.use(pixel)

  test('H31 descarte visível, erro no campo, foco e rascunho após falha de rede',async ({page}) => {
    test.setTimeout(120_000)
    await authorize(page)
    await page.goto('/vitrine/pacientes/maria-gracas')
    await tab(page,'Exames')
    await button(page,'Registrar resultado').click()
    const form = page.getByRole('dialog',{name:'Registrar resultado'})
    await form.getByLabel('Nome do exame').fill('Ensaio sintético')
    await form.getByLabel('Situação',{exact:true}).selectOption('disponivel')
    await form.getByLabel('Origem da informação').selectOption('relato')
    await form.getByRole('button',{name:'Salvar registro'}).click()
    await expect(form.getByRole('alert')).toBeInViewport()
    await expect(form.getByLabel('Data do resultado')).toBeFocused()
    await expect(form.getByLabel('Data do resultado')).toBeInViewport()
    await form.getByLabel('Data do resultado').fill('2026-11-24')
    await form.getByLabel('Interpretação informada pelo emissor').fill('Descrição de teste')
    await page.route('**/homologacao/pacientes/maria-gracas/prontuario',route =>
      route.request().method()==='POST'?route.abort():route.continue())
    await form.getByRole('button',{name:'Salvar registro'}).click()
    await expect(form.getByRole('alert')).toContainText('O registro foi recusado')
    await expect(form.getByLabel('Nome do exame')).toHaveValue('Ensaio sintético')
    await page.keyboard.press('Escape')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('button',{name:'Continuar editando'})).toBeFocused()
    await expect(confirm).toBeInViewport()
    if (evidence) await page.screenshot({path:evidence+'/descarte-390.png',mask:[page.getByText(/^CPF /)]})
    await confirm.getByRole('button',{name:'Continuar editando'}).click()
    await expect(form.getByLabel('Nome do exame')).toHaveValue('Ensaio sintético')
    await form.getByRole('button',{name:'Fechar',exact:true}).click()
    await confirm.getByRole('button',{name:'Descartar alterações'}).click()
    await expect(form).toBeHidden()
    await expect(button(page,'Registrar resultado')).toBeFocused()
  })
})

test('H36 percorre decisões e retornos nos três mapas e mantém a figura privada',async ({page}) => {
  test.setTimeout(120_000)
  await authorize(page)
  await page.setViewportSize({width:390,height:900})
  const cases = [
    {slug:'sindromes-hipertensivas-gestacao', title:/Critérios indicados/, edge:/Não · Atendimento conforme/, page:22},
    {slug:'hemorragia-pos-parto', title:/Consultar causa · Trauma/, edge:/Voltar às causas/, page:32},
    {slug:'sepse-obstetrica', title:/Reavaliação materna/, edge:/Estável/, page:15},
  ]
  for (const [index,item] of cases.entries()) {
    await page.goto('/vitrine/protocolos?protocolo='+item.slug+'&aba=fluxograma')
    const map = page.getByRole('region',{name:'Mapa navegável do fluxograma'})
    await map.getByRole('button',{name:item.title}).first().click()
    await map.locator('[data-focused=true]').getByRole('button',{name:item.edge}).click()
    await expect(map.locator('[data-followed=true]')).toHaveCount(2)
    await page.getByRole('button',{name:'Ampliar zoom',exact:true}).click()
    await expect(page.getByLabel('Zoom do mapa')).toHaveText('125%')
    await map.focus()
    await page.keyboard.press('ArrowRight')
    expect(await map.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0)
    await page.getByRole('button',{name:'Ajustar',exact:true}).click()
    await page.getByRole('button',{name:'Figura original',exact:true}).click()
    await expect(page.locator('canvas[data-pdf-rendered=true]')).toBeVisible()
    await expect(page.getByRole('link',{name:new RegExp('digital '+item.page)})).toBeVisible()
    await page.getByRole('button',{name:'Voltar ao mapa',exact:true}).click()
    if (evidence) await page.screenshot({path:evidence+'/fluxograma-'+(index+1)+'-390.png'})
  }
})
