import {before,after,test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
const load=createRequire(import.meta.url)
const {chromium,expect}=load(process.env.PAP_PLAYWRIGHT_MODULE||'@playwright/test')
const base=process.env.PAP_DEMO_BASE_URL||'http://127.0.0.1:3301'
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/,'Browser tests may target only an explicit loopback demo server')
const output=process.env.PAP_DEMO_EVIDENCE_DIR||'.test-audit/vitrine';mkdirSync(output,{recursive:true})
async function visit(page,path){await page.goto(base+path);await page.locator('[data-demo-ready="true"]').waitFor({state:"attached"});if(await page.locator("[data-demo-onboarding]").count()&&!await page.evaluate(()=>sessionStorage.getItem("pap.demo.welcome.v2")==="seen"))await page.getByRole("button",{name:"Explorar a plataforma livremente"}).click()}
let browser
before(async()=>{browser=await chromium.launch({executablePath:process.env.PAP_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']})})
after(async()=>browser?.close())
test('five-step registration validates, saves multiple histories and updates patient/encounters/dashboard without clinical API',async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),requests=[]
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(new URL(r.url()).pathname)})
 await visit(page,'/registro');await page.getByRole('button',{name:'Próximo →'}).click();await expect(page.locator('main [role="alert"]')).toContainText('CPF')
 await page.locator('#cpf').fill('32165498701');await page.locator('#patient-name').fill('Pessoa Demonstração');await page.locator('#birth-date').fill('1995-03-05');await page.getByRole('button',{name:'Próximo →'}).click()
 await page.getByRole('button',{name:'Próximo →'}).click();await expect(page.locator('main [role="alert"]')).toContainText('DUM');await page.getByLabel('DUM desconhecida').check();await page.getByRole('button',{name:'Próximo →'}).click()
 await page.locator('#pa-sistolica').fill('999');await page.getByRole('button',{name:'Próximo →'}).click();await expect(page.locator('main [role="alert"]')).toContainText('paSistolica');await page.locator('#pa-sistolica').fill('');await page.getByRole('button',{name:'Próximo →'}).click()
 await page.getByLabel('Investigação de alergias',{exact:true}).selectOption('sim');await page.getByRole('button',{name:'Adicionar alergia'}).click();await page.getByRole('button',{name:'Adicionar alergia'}).click();await page.getByLabel('Substância ou agente 1').fill('Agente sintético A');await page.getByLabel('Substância ou agente 2').fill('Agente sintético B')
 for(let i=1;i<=2;i++){await page.getByRole('button',{name:'Adicionar medicação'}).click();await page.getByLabel('Medicamento '+i,{exact:true}).fill('Medicação fictícia '+i)}
 await page.getByLabel('Informação sobre comorbidades',{exact:true}).selectOption('sim');await page.getByRole('button',{name:'Adicionar condição'}).click();await page.getByLabel('Condição relatada 1').fill('Condição fictícia');await page.getByLabel('Gestações anteriores').fill('2');await page.getByLabel('Partos',{exact:true}).fill('1');await page.getByLabel('Perdas gestacionais').fill('1')
 for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:960});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'History overflow at '+width);if([390,1440].includes(width))await page.screenshot({path:`${output}/after-history-${width}.png`,fullPage:true})}
 await page.getByRole('button',{name:'Ver Resultado →'}).click();await expect(page.locator('[data-meows-status]')).toHaveAttribute('data-meows-status','INCOMPLETO');await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','—');for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:960});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Result overflow at '+width);if([390,1440].includes(width))await page.screenshot({path:`${output}/after-result-${width}.png`,fullPage:true})}await page.getByLabel('Encaminhamento demonstrativo').fill('Simulação de encaminhamento');await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await expect(page.getByRole('status')).toContainText('Registro demonstrativo salvo')
 await expect(page.getByRole('button',{name:'Registro demonstrativo salvo'})).toBeDisabled();await page.getByRole('link',{name:'Abrir ficha da paciente'}).click();await expect(page.getByRole('heading',{name:'Pessoa Demonstração',exact:true})).toBeVisible();await expect(page.getByText('Agente sintético A',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Medicações',exact:true}).click();await expect(page.getByText('Medicação fictícia 1',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Evolução',exact:true}).click();await expect(page.getByText('Incompleto',{exact:true}).first()).toBeVisible()
 await page.getByRole('link',{name:'Atendimentos',exact:true}).first().click();await page.getByLabel('Buscar paciente').fill('Pessoa Demonstração');await expect(page.getByText('1 registros encontrados')).toBeVisible();await page.getByLabel('Risco',{exact:true}).selectOption('unknown');await expect(page.getByText('1 registros encontrados')).toBeVisible();await page.getByLabel('Profissional',{exact:true}).selectOption('carlos');await expect(page.getByText('0 registros encontrados')).toBeVisible()
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('4');assert.deepEqual(requests,[]);await page.close()
})
test('documents, combined filters, honest unavailable controls, modal keyboard and demo AI',async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:960}})
 await visit(page,'/atendimentos');await page.getByLabel('Buscar paciente').fill('Maria');await page.getByLabel('Período').selectOption('today');await page.getByLabel('Risco',{exact:true}).selectOption('low');await page.getByLabel('Profissional',{exact:true}).selectOption('ana-paula');await expect(page.getByText('1 registros encontrados')).toBeVisible();await page.getByRole('link',{name:'Maria das Graças Silva'}).last().click()
 await page.getByRole('button',{name:'Documentos',exact:true}).click();await page.getByRole('button',{name:'Visualizar',exact:true}).first().click();await expect(page.getByRole('dialog')).toContainText('Documento ilustrativo');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Vacinação',exact:true}).click();await expect(page.getByText('Pendente',{exact:true})).toBeVisible()
 await visit(page,'/chat');await expect(page.getByText('Chat IA demonstrativo',{exact:false})).toBeVisible();assert.equal(await page.locator('svg.lucide-star').count(),6)
 await visit(page,'/configuracoes');await page.getByRole('button',{name:'Segurança',exact:true}).click();await expect(page.getByText('Segurança ilustrativa:',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Encerrar outras sessões'})).toBeDisabled();await page.close()
})
test('six responsive widths, preserved shell, visible keyboard focus and reduced-motion icon',async()=>{
 const results=[]
 for(const width of [320,375,390,430,768,1440]){
  const page=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message))
  for(const route of ['dashboard','registro','pacientes','pacientes/maria-gracas','atendimentos','chat','protocolos','cursos','ferramentas','configuracoes']){
   await visit(page,'/'+route);await expect(page.locator('main')).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Page overflow: ${route} at ${width}`)
   if(route==='dashboard'){for(const bar of await page.locator('[data-demo-total="0"]').all())assert.equal(await bar.evaluate(el=>el.style.height),'0%')}
   if([390,1440].includes(width)&&['dashboard','registro','pacientes','pacientes/maria-gracas','atendimentos','chat'].includes(route))await page.screenshot({path:`${output}/after-${route.replaceAll('/','-')}-${width}.png`,fullPage:true})
  }
  await visit(page,'/chat');assert.ok((await page.locator('svg.lucide-star').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).animationName))).every(n=>n==='none'))
  if(width<768){await page.getByRole('button',{name:'Abrir menu'}).click();await expect(page.getByRole('dialog',{name:'Navegação principal'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Abrir menu'})).toBeFocused()}
  assert.deepEqual(errors,[],`Browser errors at width ${width}`);results.push({width,overflow:false,errors:0});await page.close()
 }
 writeFileSync(`${output}/responsive-results.json`,JSON.stringify(results,null,2)+'\n')
})

test('MEOWS complete, critical and incomplete snapshots survive patient/encounter/dashboard navigation without duplicate save or clinical API',async()=>{
 const {fillToVitals,fillVitals,toResult}=await import('./registration-journey.mjs')
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors=[],apis=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,200))});page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apis.push(new URL(r.url()).pathname)})
 await visit(page,'/registro')
 for(const [i,options,score,status]of [[0,{},'0','CALCULADO'],[1,{pressure:'160'},'3','CALCULADO'],[2,{heart:''},'—','INCOMPLETO']]){
  if(i)await page.getByRole('button',{name:'Novo Registro',exact:true}).click()
  await fillToVitals(page);await fillVitals(page,options)
  if(i===0){await page.locator('#oxygen-mode').selectOption('supplemental');await page.locator('#oxygen-flow').fill('0');await page.getByRole('button',{name:'Próximo →'}).click();await expect(page.locator('main [role=alert]')).toContainText('Fluxo suplementar');await page.locator('#oxygen-mode').selectOption('air')}
  await toResult(page);const result=page.locator('[data-meows-status]');await expect(result).toHaveAttribute('data-meows-score',score);await expect(result).toHaveAttribute('data-meows-status',status);await expect(result).toContainText('Protocolo ainda não homologado');await expect(result.locator('dl > div')).toHaveCount(7)
  if(i===1)await expect(result).toContainText('Parâmetro crítico: Sim');if(i===2)await expect(result).toContainText('Componentes faltantes: Frequência cardíaca')
  await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await expect(page.getByRole('button',{name:'Registro demonstrativo salvo'})).toBeDisabled()
 }
 await page.getByRole('link',{name:'Abrir ficha da paciente'}).click();await expect(page.locator('[data-meows-status]')).toHaveAttribute('data-meows-status','INCOMPLETO')
 await page.getByRole('button',{name:'Evolução',exact:true}).click();await expect(page.getByRole('row')).toHaveCount(4);await expect(page.getByText('Parâmetro crítico (demo)',{exact:true})).toBeVisible();await expect(page.getByText('Sem alerta pelo score (demo)',{exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Atendimentos',exact:true}).first().click();await page.getByLabel('Buscar paciente').fill('Pessoa Sintética MEOWS');await expect(page.getByText('3 registros encontrados')).toBeVisible();await page.locator('tr[data-encounter-id]').first().click({position:{x:10,y:10}});await expect(page.getByRole('dialog').locator('[data-meows-status]')).toHaveAttribute('data-meows-status','INCOMPLETO');await page.keyboard.press('Escape')
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('4');await expect(page.getByText('Alertas demonstrativos',{exact:true}).first().locator('..')).toContainText('1')
 assert.deepEqual(apis,[]);assert.deepEqual(errors,[]);await page.close()
})
