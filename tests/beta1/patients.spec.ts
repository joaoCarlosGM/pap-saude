import {test,expect} from '@playwright/test';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {professional} from './fixtures';
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_beta1_test');await bootstrapSystemIam();});
test.afterAll(()=>db.$disconnect());
test('real scoped patient card opens correct record by keyboard; other unit remains denied',async({page})=>{
 const f=await professional(),foreign=await professional();
 const patient=await db.patient.create({data:{fullName:'Paciente sintética Beta1',birthDate:new Date('1990-01-01T00:00:00Z'),organizations:{create:{organizationId:f.unit.id}}}});
 await page.context().addCookies([{name:'pap_session',value:f.token,url:'http://127.0.0.1:3711',httpOnly:true,sameSite:'Lax'}]);
 await page.goto('/pacientes');const card=page.getByRole('link').filter({has:page.getByRole('heading',{name:patient.fullName,exact:true})});await expect(card).toBeVisible();await card.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp('/pacientes/'+patient.id+'$'));await expect(page.getByRole('heading',{name:patient.fullName,exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Seções do prontuário'})).toBeVisible();await expect(page.getByText('Sem gestação ativa registrada.',{exact:true})).toBeVisible();
 expect((await page.request.get('/api/clinical/patients',{headers:{'x-organization-id':foreign.unit.id}})).status()).toBe(403);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
