import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import {fillToVitals,fillVitals,toResult} from './registration-journey.mjs'
const {chromium,expect}=createRequire(import.meta.url)(process.env.PAP_PLAYWRIGHT_MODULE||'@playwright/test')
const base=process.env.PAP_DEMO_BASE_URL||'http://127.0.0.1:3400'
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/)
const out=process.env.PAP_DEMO_PREMIUM_VISUAL_DIR||'.test-audit/premium2/visual'
mkdirSync(out,{recursive:true})
test('Premium final visual matrix: nine surfaces at six widths, keyboard, drawers, true result, no console or clinical API',async()=>{
 const browser=await chromium.launch({executablePath:process.env.PAP_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});const rows=[]
 try{for(const width of [320,375,390,430,768,1440]){
  const p=await browser.newPage({viewport:{width,height:960},reducedMotion:'reduce'}),errors=[],apis=[]
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,200))});p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apis.push(new URL(r.url()).pathname)})
  async function shot(name){await p.locator('main').evaluate(el=>el.scrollTo(0,0));await p.evaluate(()=>document.fonts.ready);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} overflow ${width}`);await p.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});rows.push({width,surface:name,overflow:false})}
  await p.goto(base+'/dashboard');await expect(p.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'})).toBeVisible();await shot('welcome');await p.getByRole('button',{name:'Explorar a plataforma livremente'}).click();await shot('dashboard')
  for(const route of ['pacientes','atendimentos','chat','configuracoes','registro']){await p.goto(base+'/'+route);await expect(p.locator('main')).toBeVisible();await shot(route)}
  await fillToVitals(p);await fillVitals(p,{pressure:'160',mode:'supplemental',flow:'4.9'});await toResult(p);await expect(p.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','5');await shot('meows-result')
  await p.getByRole('button',{name:'Salvar Registro',exact:true}).click();await p.getByRole('link',{name:'Abrir ficha da paciente'}).click();await expect(p.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','5')
  if(width<768){await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(p.getByRole('dialog',{name:'Navegação principal'})).toBeVisible()}
  await p.getByRole('button',{name:'Ajuda',exact:true}).click();await p.getByRole('button',{name:'Iniciar tutorial guiado'}).click();await expect(p.locator('[data-tour-step]')).toHaveAttribute('data-tour-ready','true');await shot('tutorial');await p.keyboard.press('Escape');await expect(p.locator('[data-tour-step]')).toHaveCount(0)
  if(width<768){await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await p.getByRole('link',{name:'Chat IA',exact:true}).click();await p.getByRole('button',{name:'Abrir conversas',exact:true}).click();await expect(p.getByRole('button',{name:'Fechar conversas',exact:true})).toBeVisible();await p.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(p.getByRole('dialog',{name:'Navegação principal'})).toBeVisible();await expect(p.getByRole('button',{name:'Fechar conversas',exact:true})).toBeHidden();await p.keyboard.press('Escape')}
  assert.deepEqual(errors,[]);assert.deepEqual(apis,[]);await p.close()
 }}finally{await browser.close();writeFileSync(`${out}/matrix.json`,JSON.stringify(rows,null,2)+'\n')}
 assert.equal(rows.length,54)
})
