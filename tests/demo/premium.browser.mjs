import {before,after,test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
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
 await card.focus();await p.keyboard.press('Enter');await expect(p).toHaveURL(base+'/pacientes/maria-gracas')
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
