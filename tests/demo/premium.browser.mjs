import {before,after,test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync} from 'node:fs'
const load=createRequire(import.meta.url)
const {chromium,expect}=load(process.env.PAP_PLAYWRIGHT_MODULE||'@playwright/test')
const base=process.env.PAP_DEMO_BASE_URL||'http://127.0.0.1:3400'
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/)
const output=process.env.PAP_DEMO_EVIDENCE_DIR||'.test-audit/premium2'
mkdirSync(output,{recursive:true})
let browser
before(async()=>{browser=await chromium.launch({executablePath:process.env.PAP_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']})})
after(async()=>browser?.close())
async function visit(page,path){await page.goto(base+path);await page.locator('[data-demo-ready=true]').waitFor({state:'attached'});if(await page.locator('[data-demo-onboarding]').count()){if(!await page.evaluate(()=>sessionStorage.getItem('pap.demo.welcome.v2')==='seen')){await page.getByRole('button',{name:'Explorar a plataforma livremente'}).click()}}}

test('A institution updates sidebar immediately, restoration is confirmed, no top bands and drawer keeps focus',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'})
 await visit(p,'/configuracoes')
 await expect(p.getByText('Prontuário de Atendimento',{exact:true})).toHaveCount(0)
 await p.locator('#demo-municipality').fill('Cidade Exemplo');await p.locator('#demo-uf').fill('ce');await p.locator('#demo-unit').fill('UBS Sintética')
 const sidebar=p.getByRole('complementary',{name:'Navegação principal'})
 await expect(sidebar).toContainText('Cidade Exemplo — CE');await expect(sidebar).toContainText('UBS Sintética')
 await p.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();await expect(p.getByRole('dialog')).toContainText('Nenhum banco real')
 await p.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(sidebar).toContainText('Cidade Exemplo')
 await p.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();await p.getByRole('button',{name:'Restaurar dados sintéticos'}).click();await expect(sidebar).toContainText('Belém — PA');await expect(sidebar).toContainText('UBS Demonstrativa')
 await p.setViewportSize({width:320,height:480});await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(p.getByRole('dialog',{name:'Navegação principal'})).toBeVisible();await p.keyboard.press('Escape');await expect(p.getByRole('button',{name:'Abrir menu',exact:true})).toBeFocused()
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
 await p.close()
})

test('B patient surfaces, encounter rows/cards and recent entries activate exactly once with independent child links',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'})
 await visit(p,'/pacientes');const card=p.locator('[data-patient-id="maria-gracas"]');assert.equal(await card.locator('a,button').count(),0)
 for(let i=0;i<35&&!await card.evaluate(el=>el===document.activeElement);i++)await p.keyboard.press('Tab');await expect(card).toBeFocused();await p.keyboard.press('Enter');await expect(p).toHaveURL(base+'/pacientes/maria-gracas')
 await visit(p,'/atendimentos');const row=p.locator('tr[data-encounter-id]').first();await row.click({position:{x:10,y:10}});await expect(p.getByRole('dialog')).toHaveCount(1);await expect(p.getByRole('dialog')).toContainText('Maria das Graças Silva');await p.keyboard.press('Escape')
 await row.focus();await p.keyboard.press('Enter');await expect(p.getByRole('dialog')).toHaveCount(1);await p.keyboard.press('Escape')
 await row.getByRole('link',{name:'Maria das Graças Silva'}).click();await expect(p).toHaveURL(base+'/pacientes/maria-gracas');await expect(p.getByRole('dialog')).toHaveCount(0)
 await visit(p,'/dashboard');const recent=p.locator('[data-recent-encounter]').first();await recent.focus();await p.keyboard.press('Enter');await expect(p.getByRole('dialog')).toHaveCount(1);await p.keyboard.press('Escape')
 await p.setViewportSize({width:390,height:844});await visit(p,'/atendimentos');await p.locator('article[data-encounter-id]').first().click({position:{x:12,y:12}});await expect(p.getByRole('dialog')).toHaveCount(1)
 await p.close()
})
test('C stars stay pink and stationary in reduced motion',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});await visit(p,'/chat')
 const stars=p.locator('svg.lucide-star');assert.equal(await stars.count(),6)
 for(const star of await stars.all()){assert.equal(await star.evaluate(el=>getComputedStyle(el).color),'rgb(236, 38, 143)');assert.equal(await star.evaluate(el=>getComputedStyle(el).animationName),'none')}
 await p.close()
})

test('D progressive motion preserves exact data, zero bars, state and does not restart counters for dialogs',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'no-preference'})
 await visit(p,'/dashboard');const metric=p.locator('[data-metric-final]').first();await expect(metric).toHaveAttribute('data-counter-starts',/\d+/)
 await p.waitForTimeout(1000);const before=await metric.getAttribute('data-counter-starts');await p.getByRole('button',{name:'Avisos',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();assert.equal(await metric.getAttribute('data-counter-starts'),before)
 for(const bar of await p.locator('[data-demo-total="0"]').all())assert.equal(await bar.evaluate(el=>el.style.height),'0%')
 const indicator=p.locator('[data-sidebar-indicator]');const old=await indicator.evaluate(el=>getComputedStyle(el).transform)
 await p.getByRole('link',{name:'Pacientes',exact:true}).click();await expect(p).toHaveURL(base+'/pacientes');await expect(p.getByRole('link',{name:'Pacientes',exact:true})).toHaveAttribute('aria-current','page');await p.waitForTimeout(350);assert.notEqual(await indicator.evaluate(el=>getComputedStyle(el).transform),old)
 await expect(p.locator('[data-patient-id]')).toHaveCount(3);await p.locator('[data-patient-id]').first().focus();await p.keyboard.press('Enter');await expect(p).toHaveURL(base+'/pacientes/maria-gracas');await p.close()
})

test('E/F welcome is session-only, direct routes work, guided tour uses real anchors and can skip/restart',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'})
 p.on('pageerror',e=>console.log('tour-diagnostic',JSON.stringify({message:e.message.split('\n')[0].slice(0,160)})))
 p.on('response',r=>{if(new URL(r.url()).pathname==='/dashboard')console.log('tour-response',JSON.stringify({path:'/dashboard',status:r.status()}))})
 await p.goto(base+'/registro');await expect(p.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'})).toBeVisible();await expect(p.getByRole('dialog')).toContainText('Não insira dados pessoais ou clínicos verdadeiros')
 await p.getByRole('button',{name:'Explorar a plataforma livremente'}).click();await p.reload();await p.locator('[data-demo-ready=true]').waitFor({state:'attached'});await expect(p.getByRole('dialog')).toHaveCount(0)
 assert.deepEqual(await p.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('pap.demo.'))),['pap.demo.welcome.v2'])
 await p.getByRole('button',{name:'Ajuda',exact:true}).click();await p.getByRole('button',{name:'Iniciar tutorial guiado'}).click()
 await expect(p.locator('[data-tour-step="dashboard"]')).toBeVisible({timeout:20000});console.log('tour-position',JSON.stringify({url:new URL(p.url()).pathname,page:await p.locator('[data-motion-page]').getAttribute('data-motion-page')}))
 for(const [i,path]of ['/dashboard','/registro','/pacientes','/atendimentos','/protocolos','/chat'].entries()){
  const dialog=p.getByRole('dialog');await expect(p).toHaveURL(base+path,{timeout:20000});await expect(dialog).toContainText(`Etapa ${i+1} de 6`);await expect(dialog).toHaveAttribute("data-tour-ready","true");await expect(p.locator('[data-guided-target=true]')).toHaveCount(1)
  await dialog.getByRole('button',{name:i===5?'Concluir':'Próximo',exact:true}).click()
 }
 await expect(p.getByRole('dialog')).toHaveCount(0);await p.getByRole('button',{name:'Ajuda',exact:true}).click();await p.getByRole('button',{name:'Iniciar tutorial guiado'}).click();await p.getByRole('dialog').getByRole('button',{name:'Pular',exact:true}).click();await expect(p.getByRole('dialog')).toHaveCount(0)
 await p.close()
})

test('F mobile tour navigates six real routes, swaps menu/content, repositions and exits by keyboard',async()=>{
 for(const width of [320,390]){
  const p=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'})
  await p.goto(base+'/chat');await p.getByRole('button',{name:'Iniciar tutorial guiado'}).click()
  for(const [i,path]of ['/dashboard','/registro','/pacientes','/atendimentos','/protocolos','/chat'].entries()){
   await expect(p).toHaveURL(base+path,{timeout:20000});const dialog=p.locator('[data-tour-step]');await expect(dialog).toContainText(`Etapa ${i+1} de 6`);await expect(dialog).toHaveAttribute('data-tour-ready','true')
   await dialog.getByRole('button',{name:'Ver conteúdo',exact:true}).click();await expect(p.locator('[data-guided-target=true]')).toHaveCount(1)
   await p.setViewportSize({width:width+5,height:820});await p.waitForTimeout(100)
   const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+6&&box.y>=0&&box.y+box.height<=821)
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
   await dialog.getByRole('button',{name:i===5?'Concluir':'Próximo',exact:true}).click()
  }
  await expect(p.locator('[data-tour-step]')).toHaveCount(0);await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await p.getByRole('button',{name:'Ajuda',exact:true}).click();await p.getByRole('button',{name:'Iniciar tutorial guiado'}).click();await expect(p.locator('[data-tour-step]')).toBeVisible({timeout:20000});await p.keyboard.press('Escape');await expect(p.locator('[data-tour-step]')).toHaveCount(0)
  await p.close()
 }
})
