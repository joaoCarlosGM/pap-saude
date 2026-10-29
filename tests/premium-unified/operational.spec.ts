import {test,expect,type Page} from "@playwright/test";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {db} from "../../src/server/db/client";
import {bootstrapSystemIam} from "../../src/server/iam/bootstrap.service";
import {assignSystemRole} from "../../src/server/iam/role-assignment.service";
import {createSession} from "../../src/server/auth/session.service";
import {actor} from "../mission04-b/fixtures";
import {solveLoginVerification} from "../helpers/browser-login-verification";
import {diagnosticLine} from "./browser-diagnostics.mjs";
const origin="http://127.0.0.1:3610";
const images=process.env.PAP_UNIFIED_SCREENSHOTS||"/tmp/pap-unified-screenshots";
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_p0_full_tests');expect(new URL(process.env.DATABASE_URL!).hostname).toBe('127.0.0.1');await bootstrapSystemIam();mkdirSync(images,{recursive:true});});
test.afterAll(()=>db.$disconnect());
// Raw assertions remain private. Never emit session cookies or fixture credentials.
test.afterEach(async({},info)=>{if(info.errors.length&&process.env.PAP_UNIFIED_ARTIFACTS)writeFileSync(join(process.env.PAP_UNIFIED_ARTIFACTS,'private-'+info.title.replace(/[^a-zA-Z0-9]+/g,'-')+'.json'),JSON.stringify(info.errors.map(e=>({message:e.message,stack:e.stack}))),{mode:0o600});for(const error of info.errors){console.error(diagnosticLine(error,info.line,info.status));error.message=(error.message||'Assertion failed').split('\n')[0];error.stack=error.stack?.match(/operational.spec.ts:\d+:\d+/g)?.join(', ');}});
async function cookie(page:Page,token:string){await page.context().addCookies([{name:'pap_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);}
async function professional(){const f=await actor();await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await db.membership.create({data:{userId:f.user.id,organizationId:f.unit.id,status:'ACTIVE'}});await assignSystemRole({userId:f.user.id,roleKey:'PROFESSIONAL',organizationId:f.unit.id});return f;}
async function shot(page:Page,name:string,width:number){await page.screenshot({path:join(images,`${name}-${width}.png`),fullPage:true});}
test('Admin production login uses actual CAPTCHA and MFA, real metrics and full authorized navigation',async({page})=>{
 const f=await actor(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));
 await page.goto('/login');await expect(page.getByRole('heading',{name:'Bem-vindo de volta'})).toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:join(images,`login-${width}.png`),fullPage:true,mask:[page.locator('fieldset')]});}
 await page.getByLabel('E-mail',{exact:true}).fill(f.user.email);await page.getByLabel('Senha',{exact:true}).fill(f.password);await solveLoginVerification(page);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 const metricsResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/beta/metrics'&&r.status()===200);await page.getByLabel('Código do autenticador ou código de recuperação',{exact:true}).fill(f.codes[1]);await page.getByRole('button',{name:'Confirmar MFA',exact:true}).click();await expect(page).toHaveURL(/\/admin$/);
 const metrics=await (await metricsResponse).json();expect(metrics.activeUnits).toBe(await db.organization.count({where:{type:'HEALTH_UNIT',status:'ACTIVE',isActive:true}}));await expect(page.locator('[data-motion-kpis]').first()).toBeVisible();await expect(page.getByText('Contas e registros sintéticos')).toHaveCount(0);
 for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if([320,390,768,1440].includes(width))await shot(page,'admin',width);}
 for(const path of ['/admin/rede','/admin/usuarios','/admin/acessos','/admin/convites','/admin/convites-globais','/admin/auditoria','/admin/seguranca','/admin/pendencias','/notificacoes']){const response=await page.goto(path);expect(response?.status()).toBe(200);await expect(page.locator('main h1').first()).toBeVisible();}
 expect(errors).toEqual([]);
});
test('clinical Premium registration commits once, survives reload and feeds real records and four KPIs',async({page})=>{
 const f=await professional(),name='Paciente Sintética Unificada',errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));await cookie(page,f.token);
 const initial=await db.encounter.count({where:{organizationId:f.unit.id}});expect(initial).toBe(0);
 let lost=false;const keys:string[]=[];
 await page.route('**/api/clinical/registrations',async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;const response=await route.fetch();expect(response.status()).toBe(201);return route.abort('failed');}return route.continue();});
 await page.goto('/registro');await page.getByLabel('Nome completo',{exact:false}).fill(name);await page.getByLabel('Data de nascimento',{exact:false}).fill('1990-01-01');await page.getByRole('button',{name:'Próximo →',exact:true}).click();
 const dum=new Date(Date.now()-120*86400000).toISOString().slice(0,10);await page.getByLabel('Data da Última Menstruação (DUM)').fill(dum);await page.getByRole('button',{name:'Próximo →',exact:true}).click();
 for(const [id,value] of [['pa-sistolica','120'],['pa-diastolica','80'],['frequencia-cardiaca','80'],['frequencia-respiratoria','16'],['temperatura','36.5']])await page.locator('#'+id).fill(value);
 await page.getByRole('button',{name:'Próximo →',exact:true}).click();await page.locator('#bcf').fill('140');await page.getByRole('button',{name:'Ver Resultado →',exact:true}).click();await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await expect(page.getByText(/A resposta foi interrompida/)).toBeVisible();
 await page.getByRole('button',{name:'Salvar Registro',exact:true}).click();await expect(page.getByRole('button',{name:'Registro salvo',exact:true})).toBeDisabled();expect(keys.length).toBe(2);expect(keys[0]===keys[1]).toBe(true);
 expect(await db.encounter.count({where:{organizationId:f.unit.id}})).toBe(1);await page.reload();await expect(page.getByRole('button',{name:'Registro salvo',exact:true})).toBeDisabled();await expect(page.getByText('Validação clínica: não validado',{exact:true})).toBeVisible();
 for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Registro overflow at ${width}px`).toBe(true);if([320,390,768,1440].includes(width))await shot(page,'registro-real',width);}await page.goto('/pacientes');await page.getByRole('link').filter({has:page.getByRole('heading',{name,exact:true})}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await page.goto('/atendimentos');await page.getByRole('button',{name:/Detalhes do atendimento/}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Concluir atendimento',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.goto('/dashboard');expect(await page.locator('[data-metric-final]').evaluateAll(els=>els.map(e=>e.getAttribute('data-metric-final')))).toEqual(['1','1','1','0']);await expect(page.getByText(/DRAFT_UNVALIDATED/)).toBeVisible();
 for(const width of [320,375,390,430,768,1440]){await page.setViewportSize({width,height:1000});const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,header:[...document.querySelectorAll('.clinical-shell>div>header,.clinical-shell>div>header *')].map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,x:e.getBoundingClientRect().x,display:getComputedStyle(e).display,minWidth:getComputedStyle(e).minWidth,shrink:getComputedStyle(e).flexShrink})),overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,15)}));if(layout.width>width&&process.env.PAP_UNIFIED_ARTIFACTS)writeFileSync(join(process.env.PAP_UNIFIED_ARTIFACTS,'clinical-layout.json'),JSON.stringify(layout),{mode:0o600});expect(layout.width<=width,`Clinical overflow at ${width}px`).toBe(true);if([320,390,768,1440].includes(width))await shot(page,'clinical',width);}
 const encounter=await db.encounter.findFirstOrThrow({where:{organizationId:f.unit.id}});expect(encounter.status).toBe('COMPLETED');const vitalsBefore=await db.vitalSigns.findUniqueOrThrow({where:{encounterId:encounter.id}});const denied=await page.request.patch(`/api/clinical/encounters/${encounter.id}/vital-signs`,{headers:{origin,'x-organization-id':f.unit.id},data:{heartRate:99}});expect(denied.status()).toBe(409);expect((await db.vitalSigns.findUniqueOrThrow({where:{encounterId:encounter.id}})).heartRate).toBe(vitalsBefore.heartRate);const obstetricsBefore=await db.obstetricData.findUniqueOrThrow({where:{encounterId:encounter.id}});const obstetricDenied=await page.request.patch(`/api/clinical/encounters/${encounter.id}/obstetric-data`,{headers:{origin,'x-organization-id':f.unit.id},data:{weightKg:70}});expect(obstetricDenied.status()).toBe(409);expect((await db.obstetricData.findUniqueOrThrow({where:{encounterId:encounter.id}})).weightKg).toEqual(obstetricsBefore.weightKg);expect(await db.clinicalProvenanceEvent.count({where:{encounterId:encounter.id}})).toBe(2);
 const created=await page.request.post('/api/clinical/encounters',{headers:{origin,'x-organization-id':f.unit.id},data:{patientId:encounter.patientId,pregnancyId:encounter.pregnancyId,chiefComplaint:'Controle sintético de finalização'}});expect(created.status()).toBe(201);const next=(await created.json()).encounter;
 await page.goto('/atendimentos');await page.locator(`#encounter-${next.id}`).getByRole('button',{name:/Detalhes/}).click();await page.getByRole('button',{name:'Iniciar atendimento',exact:true}).click();await page.getByRole('button',{name:'Confirmar alteração',exact:true}).click();await expect(page.getByRole('button',{name:'Concluir atendimento',exact:true})).toBeVisible();await page.getByRole('button',{name:'Concluir atendimento',exact:true}).click();await page.getByRole('button',{name:'Confirmar alteração',exact:true}).click();await expect(page.getByText('Registro encerrado. Alterações incompatíveis são bloqueadas pelo servidor.',{exact:true})).toBeVisible();expect((await db.encounter.findUniqueOrThrow({where:{id:next.id}})).status).toBe('COMPLETED');
 expect(errors).toEqual([]);
});
test('server denies Admin/Commercial clinical access, no-MFA, tenant IDOR and revoked grants on HTML RSC and APIs',async({page})=>{
 const admin=await actor(),commercial=await actor('COMMERCIAL'),a=await professional(),b=await professional();
 for(const f of [admin,commercial]){await cookie(page,f.token);for(const route of ['/dashboard','/registro','/pacientes','/atendimentos']){const r=await page.request.get(route,{maxRedirects:0});expect(r.status()).toBe(307);const rsc=await page.request.get(route,{headers:{RSC:'1'},maxRedirects:0});expect(rsc.status()).toBe(307);}expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':a.unit.id}})).status()).toBe(403);}
 await cookie(page,commercial.token);await page.goto('/comercial');await expect(page.getByRole('link',{name:/Abrir vitrine demonstrativa/})).toBeVisible();await page.goto('/vitrine');await expect(page.locator('[data-vitrine-premium]')).toBeVisible();
 const primary=await createSession({userId:a.user.id});await cookie(page,primary.token);expect((await page.request.get('/dashboard',{maxRedirects:0})).status()).toBe(307);expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':a.unit.id}})).status()).toBe(403);
 await cookie(page,a.token);expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':b.unit.id}})).status()).toBe(403);
 await db.mfaFactor.updateMany({where:{userId:b.user.id,status:'ACTIVE'},data:{status:'REVOKED',revokedAt:new Date()}});await cookie(page,b.token);expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':b.unit.id}})).status()).toBe(403);await cookie(page,a.token);
 await db.roleAssignment.deleteMany({where:{userId:a.user.id}});expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':a.unit.id}})).status()).toBe(403);expect((await page.request.get('/dashboard',{headers:{RSC:'1'},maxRedirects:0})).status()).toBe(307);
});
test('operational keyboard drawer and reduced-motion use native navigation without synthetic state',async({page})=>{
 const f=await professional();await cookie(page,f.token);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/dashboard');
 const skip=page.getByRole('link',{name:'Ir para o conteúdo',exact:true});expect(await skip.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');await page.keyboard.press('Tab');await expect(skip).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#clinical-main')).toBeFocused();
 const opener=page.getByRole('button',{name:'Abrir menu',exact:true});await opener.click();await expect(page.getByRole('dialog',{name:'Navegação clínica'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Navegação clínica'})).toHaveCount(0);await expect(opener).toBeFocused();
 await opener.click();await page.getByRole('link',{name:'Pacientes',exact:true}).click();await expect(page).toHaveURL(/\/pacientes$/);await expect(page.getByRole('dialog',{name:'Navegação clínica'})).toHaveCount(0);
 expect(await page.locator('[data-premium-page]').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');expect(await page.locator('[data-demo-ready]').count()).toBe(0);
 await opener.click();await page.getByRole('button',{name:'Ajuda',exact:true}).click();
 for(const title of ['Seu espaço de trabalho','Indicadores operacionais','Pacientes','Registro e atendimentos','Recursos e segurança']){const dialog=page.getByRole('dialog',{name:title,exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:title==='Recursos e segurança'?'Concluir':'Próximo',exact:true}).click();}
 await expect.poll(async()=> (await db.userOnboardingProgress.findUnique({where:{userId_tourKey_tourVersion:{userId:f.user.id,tourKey:'clinical-core',tourVersion:1}}}))?.status).toBe('COMPLETED');

});

async function assertOperationalWcag(page:Page){
 for(const [f,path] of [[await actor(),'/admin'],[await professional(),'/dashboard']] as const){
  await cookie(page,f.token);await page.goto(path);await expect(page.locator('[data-motion-kpis]').first()).toBeVisible();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
 }
}
test('real Admin and clinical Premium surfaces satisfy automated WCAG AA checks',async({page})=>{
 await assertOperationalWcag(page);
});
test('Admin and clinical text retain WCAG AA contrast at the first frame of entry animations',async({page})=>{
 const motion=await page.context().newCDPSession(page);
 await motion.send('Animation.enable');
 await motion.send('Animation.setPlaybackRate',{playbackRate:0});
 try{await assertOperationalWcag(page);}finally{await motion.send('Animation.setPlaybackRate',{playbackRate:1});await motion.detach();}
});
