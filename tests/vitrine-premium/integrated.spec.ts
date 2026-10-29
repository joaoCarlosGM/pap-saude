import {test,expect,type BrowserContext,type Page} from '@playwright/test'
import {Client} from 'pg'
import {mkdir} from 'node:fs/promises'
import {db} from '../../src/server/db/client'
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service'
import {actor} from '../mission04-b/fixtures'
import {createSession} from '../../src/server/auth/session.service'
import {DEMO_TOUR_STEPS} from '../../src/features/vitrine-premium/lib/demo/tour'
const root='/vitrine',paths=[root,...['dashboard','registro','atendimentos','pacientes','chat','protocolos','ferramentas','cursos','configuracoes','ajuda'].map(s=>root+'/'+s),root+'/pacientes/maria-gracas']
async function session(context:BrowserContext,token:string){await context.addCookies([{name:'pap_session',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}])}
async function fingerprint(){return Promise.all([db.patient.count(),db.encounter.count(),db.vitalSigns.count(),db.obstetricData.count(),db.organization.count(),db.membership.count(),db.roleAssignment.count(),db.clinicalEvaluation.count()])}
async function visit(page:Page,path:string){await page.goto(path);await page.locator('[data-demo-ready=true]').waitFor({state:'attached'})}
async function checkLinks(page:Page){expect(await page.locator('a[href]').evaluateAll(nodes=>nodes.every(n=>{const u=new URL((n as HTMLAnchorElement).href);return u.pathname==='/comercial'||u.pathname==='/vitrine'||u.pathname.startsWith('/vitrine/')}))).toBe(true)}
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_p0_full_tests');await bootstrapSystemIam()})
test.afterAll(()=>db.$disconnect())

test('read-only runtime: Premium tour, registration, MEOWS history and responsive synthetic routes never read/write clinical database',async({page,context})=>{
 const runtime=new Client({connectionString:process.env.PAP_PREMIUM_RUNTIME_URL});await runtime.connect()
 try{for(const table of ['organizations','patients','encounters','vital_signs','obstetric_data']){const r=await runtime.query('SELECT has_table_privilege(current_user,$1,\'SELECT,INSERT,UPDATE,DELETE\') AS allowed',[table]);expect(r.rows[0].allowed).toBe(false)}}finally{await runtime.end()}
 const f=await actor('COMMERCIAL');await session(context,f.token);const before=await fingerprint(),errors:string[]=[],api:string[]=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,200))});page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(new URL(r.url()).pathname)})
 await mkdir('docs/vitrine/p0-premium2-evidence',{recursive:true});await visit(page,root);await expect(page.locator('[data-vitrine-premium]')).toContainText('Ana Paula');await expect(page.locator('body')).not.toContainText(f.user.email);await expect(page.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'})).toBeVisible();await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/welcome-1440.png'});await page.setViewportSize({width:390,height:960});await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/welcome-390.png'});await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Iniciar tutorial guiado'}).click()
 for(const [index,step]of DEMO_TOUR_STEPS.entries()){await expect(page).toHaveURL(new RegExp(step.path+'$'));await expect(page.locator('[data-tour-step]')).toContainText(`Etapa ${index+1} de 6`);await expect(page.locator('[data-tour-step]')).toHaveAttribute('data-tour-ready','true');if(index===0){await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/tutorial-1440.png'});await page.setViewportSize({width:390,height:960});await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/tutorial-390.png'});await page.setViewportSize({width:1440,height:960})}await page.getByRole('button',{name:index===5?'Concluir':'Próximo',exact:true}).click()}
 await page.getByRole('link',{name:'Registro',exact:true}).click()
 await page.locator('#cpf').fill('32165498701');await page.locator('#patient-name').fill('Pessoa Sintética Premium');await page.locator('#birth-date').fill('1995-03-05');await page.getByRole('button',{name:'Próximo →'}).click();await page.getByLabel('DUM desconhecida').check();await page.getByRole('button',{name:'Próximo →'}).click()
 for(const [id,value]of Object.entries({'pa-sistolica':'160','pa-diastolica':'70','frequencia-cardiaca':'80','frequencia-respiratoria':'14',temperatura:'37.0','saturacao-o2':'98'}))await page.locator('#'+id).fill(value)
 await page.locator('#nivel-consciencia').selectOption('alerta');await page.locator('#oxygen-mode').selectOption('air');await page.getByRole('button',{name:'Próximo →'}).click();await page.getByRole('button',{name:'Ver Resultado →'}).click()
 await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','3');await expect(page.locator('[data-meows-status]')).toContainText('Parâmetro crítico: Sim');await expect(page.locator('[data-meows-status]')).toContainText('Protocolo ainda não homologado')
 await page.locator('main').evaluate(el=>el.scrollTo(0,0));await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/meows-result-1440.png'});await page.setViewportSize({width:390,height:960});await page.screenshot({path:'docs/vitrine/p0-premium2-evidence/meows-result-390.png'});await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await expect(page.getByRole('button',{name:'Registro demonstrativo salvo'})).toBeDisabled();await page.getByRole('link',{name:'Abrir ficha da paciente'}).click();await expect(page).toHaveURL(/\/vitrine\/pacientes\/demo-patient-1$/);await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','3');await page.getByRole('button',{name:'Evolução',exact:true}).click();await expect(page.getByRole('table').getByText('Parâmetro crítico (demo)',{exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Atendimentos',exact:true}).click();await page.getByLabel('Buscar paciente').fill('Pessoa Sintética Premium');await expect(page.getByText('1 registros encontrados')).toBeVisible();await page.locator('tr[data-encounter-id]').first().click({position:{x:8,y:8}});await expect(page.getByRole('dialog').locator('[data-meows-score]')).toHaveAttribute('data-meows-score','3');await page.keyboard.press('Escape')
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('4');await checkLinks(page)
 for(const width of [320,375,390,430,768,1440]){
  await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'})
  for(const path of [root,root+'/registro',root+'/pacientes',root+'/atendimentos',root+'/chat',root+'/protocolos',root+'/ferramentas',root+'/cursos',root+'/configuracoes',root+'/ajuda']){await visit(page,path);await expect(page.locator('[data-vitrine-premium]')).toBeVisible();await checkLinks(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
  if(width<768){await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('button',{name:'Ajuda',exact:true}).click();await page.getByRole('button',{name:'Iniciar tutorial guiado'}).click();await expect(page.locator('[data-tour-step]')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('[data-tour-step]')).toHaveCount(0);await visit(page,root+'/chat');await page.getByRole('button',{name:'Abrir conversas',exact:true}).click();await expect(page.getByRole('button',{name:'Fechar conversas',exact:true})).toBeVisible();await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await expect(page.getByRole('dialog',{name:'Navegação principal'})).toBeVisible();await expect(page.getByRole('button',{name:'Fechar conversas',exact:true})).toBeHidden();await page.keyboard.press('Escape')}
  await visit(page,root+'/chat');expect(await page.locator('svg.lucide-star').count()).toBe(6);expect(await page.locator('svg.lucide-star').evaluateAll(s=>s.every(n=>getComputedStyle(n).color==='rgb(236, 38, 143)'&&getComputedStyle(n).animationName==='none'))).toBe(true)
  if([390,1440].includes(width)){await mkdir('docs/vitrine/p0-premium2-evidence',{recursive:true});for(const [name,path]of [['dashboard',root],['registro',root+'/registro'],['pacientes',root+'/pacientes'],['atendimentos',root+'/atendimentos'],['chat',root+'/chat'],['configuracoes',root+'/configuracoes']]){await visit(page,path);await page.screenshot({path:`docs/vitrine/p0-premium2-evidence/${name}-${width}.png`,fullPage:true})}}
 }
 await visit(page,root+'/configuracoes');await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();await page.getByRole('button',{name:'Restaurar dados sintéticos'}).click();await page.getByRole('link',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('3')
 expect(await fingerprint()).toEqual(before);expect(api).toEqual([]);expect(errors).toEqual([])
 expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('pap.')))).toEqual(['pap.vitrine.premium.welcome.v2'])
})

test('owner runtime boundaries: anonymous, primary MFA, non-Commercial, direct HTML/RSC and revoked grants stay denied',async({browser})=>{
 for(const token of [undefined,(await actor('PAP_ADMIN')).token,(await actor('PAP_MANAGER')).token]){
  const c=await browser.newContext();if(token)await session(c,token)
  for(const path of paths){const r=await c.request.get(path,{maxRedirects:0});expect(r.status()).toBe(307);expect(r.headers().location).toBe('/login')}
  await c.close()
 }
 const f=await actor('COMMERCIAL'),primary=await createSession({userId:f.user.id}),pending=await browser.newContext();await session(pending,primary.token)
 for(const path of paths){const r=await pending.request.get(path,{maxRedirects:0});expect(r.status()).toBe(307);expect(r.headers().location).toBe('/comercial')}
 await pending.close();const c=await browser.newContext();await session(c,f.token)
 for(const path of paths)expect((await c.request.get(path)).status()).toBe(200)
 for(const path of [root+'/pacientes/unknown',root+'/pacientes/real-id-not-allowed',root+'/pacientes/demo-patient-999999',root+'/registro?organizationId='+f.unit.id,root+'/pacientes/maria-gracas?tenant=real'])expect((await c.request.get(path)).status()).toBe(404)
 for(const path of ['/dashboard','/pacientes','/registro']){const r=await c.request.get(path,{maxRedirects:0});expect(r.status()).toBe(307);expect(r.headers().location).not.toContain('/dashboard')}
 const denied=await c.request.get('/api/clinical/patients',{headers:{'x-organization-id':f.unit.id}});expect(denied.status()).toBe(403)
 await db.roleAssignment.deleteMany({where:{userId:f.user.id}})
 for(const path of paths){const r=await c.request.get(path,{maxRedirects:0});expect(r.status()).toBe(307);expect(r.headers().location).toBe('/login')}
 const rsc=await c.request.get(root+'/pacientes/maria-gracas',{headers:{RSC:'1','Next-Router-Prefetch':'1'},maxRedirects:0});const text=await rsc.text();expect(text).not.toContain('Maria das Graças Silva');expect(text).not.toContain('32165498701');await c.close()
})

test('hydration diagnostic: server/client attributes match on direct synthetic pages',async({page,context})=>{
 const {appendFileSync}=await import('node:fs');const f=await actor('COMMERCIAL');await session(context,f.token);const errors:string[]=[]
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text().slice(0,180));appendFileSync((process.env.PAP_PREMIUM_EVIDENCE_DIR||'/tmp')+'/hydration-detail.log',m.text()+'\n',{mode:0o600})}})
 await page.setViewportSize({width:320,height:960});await page.emulateMedia({reducedMotion:'reduce'});for(const path of ['/vitrine','/vitrine/registro','/vitrine/pacientes','/vitrine/atendimentos','/vitrine/chat','/vitrine/configuracoes']){await visit(page,path);await expect(page.locator('[data-vitrine-premium]')).toBeVisible()}
 expect(errors).toEqual([])
})


test('capture-only: welcome evidence dimensions are audited on the integrated guarded host',async({page,context})=>{
 const f=await actor('COMMERCIAL');await session(context,f.token);await mkdir('docs/vitrine/p0-premium2-evidence',{recursive:true});await visit(page,'/vitrine');await expect(page.getByRole('dialog',{name:'Bem-vindo ao PAP Saúde'})).toBeVisible();
 for(const width of [1440,390]){await page.setViewportSize({width,height:960});expect(await page.evaluate(()=>innerWidth)).toBe(width);await page.screenshot({path:`docs/vitrine/p0-premium2-evidence/welcome-${width}.png`})}
})


test('keyboard/card navigation: synthetic patient, encounter and recent entries keep focus and never escape Vitrine',async({page,context})=>{
 const f=await actor('COMMERCIAL');await session(context,f.token);await visit(page,'/vitrine/pacientes');await page.getByRole('button',{name:'Explorar a plataforma livremente'}).click();
 const card=page.locator('[data-patient-id="maria-gracas"]');expect(await card.locator('a,button').count()).toBe(0);await card.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/vitrine\/pacientes\/maria-gracas$/);
 await page.getByRole('link',{name:'Atendimentos',exact:true}).click();const row=page.locator('tr[data-encounter-id]').first();await row.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();const close=dialog.getByRole('button',{name:'Fechar',exact:true});await expect(close).toBeFocused();await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(row).toBeFocused();
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();const recent=page.locator('[data-recent-encounter]').first();await recent.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(recent).toBeFocused();await checkLinks(page);
})

test('read-only runtime incomplete snapshot: missing measurements stay null across Result, patient and Dashboard',async({page,context})=>{
 const f=await actor('COMMERCIAL');await session(context,f.token);const before=await fingerprint();const api:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))api.push(new URL(r.url()).pathname)})
 await visit(page,'/vitrine/registro');await page.getByRole('button',{name:'Explorar a plataforma livremente'}).click();await page.locator('#cpf').fill('32165498701');await page.locator('#patient-name').fill('Pessoa Sintética Incompleta');await page.locator('#birth-date').fill('1995-03-05');await page.getByRole('button',{name:'Próximo →'}).click();await page.getByLabel('DUM desconhecida').check();await page.getByRole('button',{name:'Próximo →'}).click();await page.getByRole('button',{name:'Próximo →'}).click();await page.getByRole('button',{name:'Ver Resultado →'}).click()
 await expect(page.locator('[data-meows-status]')).toHaveAttribute('data-meows-status','INCOMPLETO');await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','—');await expect(page.locator('[data-meows-status]')).toContainText('Componentes faltantes');await expect(page.locator('[data-meows-status]')).not.toContainText('Sem alerta pelo score')
 await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await page.getByRole('link',{name:'Abrir ficha da paciente'}).click();await expect(page.locator('[data-meows-score]')).toHaveAttribute('data-meows-score','—');await page.getByRole('button',{name:'Evolução',exact:true}).click();await expect(page.getByRole('table').getByText('Incompleto',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Dashboard',exact:true}).click();await expect(page.getByText('Pacientes ativas',{exact:true}).locator('..')).toContainText('4');await expect(page.getByText('Total com categoria demonstrativa',{exact:true}).locator('..')).toContainText('3');expect(await fingerprint()).toEqual(before);expect(api).toEqual([])
})
