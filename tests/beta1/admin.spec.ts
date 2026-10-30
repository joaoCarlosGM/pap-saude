import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor} from '../mission04-b/fixtures';
import {graph} from './lms-fixtures';
import {createSession} from '../../src/server/auth/session.service';
import {assignSystemRole} from '../../src/server/iam/role-assignment.service';
import {mkdir} from 'node:fs/promises';import {join} from 'node:path';
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_beta1_test');await bootstrapSystemIam();});
test.afterAll(()=>db.$disconnect());
test('Admin teal hierarchy remains real and Manager workbench has no metric or clinical grant',async({page})=>{
 const admin=await actor(),manager=await actor('PAP_MANAGER');
 for(const f of [admin,manager]){
  await page.context().clearCookies();await page.context().addCookies([{name:'pap_session',value:f.token,url:'http://127.0.0.1:3711',httpOnly:true,sameSite:'Lax'}]);const isManager=f.user.id===manager.user.id;
  await page.goto(isManager?'/admin/manager':'/admin/rede');await expect(page.getByRole('heading',{name:isManager?'Bancada de gestão':'Rede de Saúde',exact:true})).toBeVisible();
  if(isManager){expect(await page.locator('[data-motion-kpis]').count()).toBe(0);expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':admin.unit.id}})).status()).toBe(403);}
  else{await page.getByRole('searchbox',{name:'Buscar município ou unidade'}).fill(admin.unit.name);await page.getByRole('link',{name:'Organização e responsáveis autorizados →'}).filter({hasText:'Organização'}).first().click();await expect(page.getByRole('heading',{name:'Responsáveis, profissionais e vínculos'})).toBeVisible();}
  for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);if(process.env.PAP_BETA1_SCREENSHOTS){await mkdir(process.env.PAP_BETA1_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.PAP_BETA1_SCREENSHOTS,`${isManager?'manager':'admin'}-${theme}.png`),fullPage:true});}}
 }
});

test('verified login respects delegated and course-only destinations without granting clinical access',async({page})=>{
 const origin='http://127.0.0.1:3711',g=await graph(),admin=await actor();
 const cookie=async(token:string)=>{await page.context().clearCookies();await page.context().addCookies([{name:'pap_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);};
 for(const [token,path]of [[admin.token,'/admin'],[g.manager.token,'/admin/manager'],[g.learner.token,'/dashboard']]as const){
  await cookie(token);await page.goto('/login');await expect(page).toHaveURL(origin+path);
  await expect(page.getByRole('heading',{name:'Seu cuidado começa com segurança'})).toHaveCount(0);
 }
 const role=await db.role.findUniqueOrThrow({where:{key:'HEALTH_UNIT_ADMIN'}}),assign=await db.permission.findUniqueOrThrow({where:{key:'course.assign'}});
 const grants=await db.rolePermission.findMany({where:{roleId:role.id}});
 try{
  await db.rolePermission.deleteMany({where:{roleId:role.id,permissionId:{not:assign.id}}});
  await cookie(g.unit.token);await page.goto('/login');await expect(page).toHaveURL(origin+'/cursos');
  expect((await page.request.get('/cursos')).status()).toBe(200);
  expect(await page.getByRole('link',{name:'Pacientes',exact:true}).count()).toBe(0);
  const assignment={publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'RECOMMENDED',deadlineAt:null};
  const assigned=await page.request.post('/api/courses/unit/assign',{headers:{origin},data:assignment});expect(assigned.status()).toBe(200);expect((await assigned.json()).assigned).toBe(1);
  expect((await page.request.post('/api/courses/unit/assign',{headers:{origin},data:{...assignment,organizationId:admin.unit.id}})).status()).toBe(403);
  expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':g.learner.unit.id}})).status()).toBe(403);
  const variants:Record<string,string>[]=[{},{RSC:'1','Next-Router-Prefetch':'1'}];
  for(const headers of variants)expect([307,308]).toContain((await page.request.get('/dashboard',{headers,maxRedirects:0})).status());
  await assignSystemRole({userId:g.unit.user.id,roleKey:'PROFESSIONAL',organizationId:g.learner.unit.id});
  await page.goto('/login');await expect(page).toHaveURL(origin+'/dashboard');
  expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':g.learner.unit.id}})).status()).toBe(200);
  expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':admin.unit.id}})).status()).toBe(403);
  await db.roleAssignment.deleteMany({where:{userId:g.unit.user.id,role:{key:'PROFESSIONAL'}}});
  const primary=await createSession({userId:g.unit.user.id});await cookie(primary.token);
  const setup=await page.request.get('/login',{maxRedirects:0});expect(setup.status()).toBe(307);expect(new URL(setup.headers().location,origin).pathname).toBe('/primeiros-passos');
  expect((await page.request.post('/api/courses/unit/assign',{headers:{origin},data:{publicationId:g.pub.publicationId,organizationId:g.learner.unit.id,all:true,obligation:'RECOMMENDED',deadlineAt:null}})).status()).toBe(403);
  await cookie(g.unit.token);await db.rolePermission.deleteMany({where:{roleId:role.id}});
  await page.goto('/login');await expect(page.getByRole('heading',{name:'Acesso restrito',exact:true})).toBeVisible();
  expect((await page.request.get('/cursos',{maxRedirects:0})).status()).toBe(307);
 }finally{await db.rolePermission.createMany({data:grants,skipDuplicates:true});}
});
