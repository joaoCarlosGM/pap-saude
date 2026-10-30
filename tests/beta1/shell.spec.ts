import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {assignSystemRole} from '../../src/server/iam/role-assignment.service';
import {actor} from '../mission04-b/fixtures';
const origin='http://127.0.0.1:3711';
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_beta1_test');await bootstrapSystemIam();});
test.afterAll(()=>db.$disconnect());
test('operational shell has grouped native navigation, decorative hero, accessible drawer and no fictional identity',async({page})=>{
 const f=await actor();await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await db.membership.create({data:{userId:f.user.id,organizationId:f.unit.id,status:'ACTIVE'}});await assignSystemRole({userId:f.user.id,organizationId:f.unit.id,roleKey:'PROFESSIONAL'});
 await page.context().addCookies([{name:'pap_session',value:f.token,url:origin,httpOnly:true,sameSite:'Lax'}]);await page.goto('/dashboard');await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Visão geral',exact:true})).toBeVisible();await expect(page.locator('main h1')).toHaveCount(1);
 const shots=process.env.PAP_BETA1_SCREENSHOTS;if(shots)await mkdir(shots,{recursive:true});
 const nav=page.getByRole('navigation',{name:'Módulos clínicos'});await expect(nav.getByRole('link').first()).toHaveAttribute('href','/dashboard');expect(await page.locator('.premium-active-indicator').count()).toBe(0);
 for(const width of [320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(width<768){const opener=page.getByRole('button',{name:'Abrir menu',exact:true});await opener.click();await expect(page.getByRole('dialog',{name:'Navegação clínica'})).toBeVisible();await page.keyboard.press('Escape');await expect(opener).toBeFocused();}if(shots)await page.screenshot({path:join(shots,`clinical-light-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});await page.getByText('Precisa de ajuda?',{exact:true}).click();await expect(page.getByRole('button',{name:'Solicitar suporte de TI'})).toBeDisabled();
 for(const theme of ['light','dark'] as const){await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);if(shots&&theme==='dark')for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:join(shots,`clinical-dark-${width}.png`),fullPage:true});}}
});
