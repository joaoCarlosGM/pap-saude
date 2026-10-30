import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor} from '../mission04-b/fixtures';
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
