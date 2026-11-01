import {assertPublicRscMetadata} from './rsc-metadata';
import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {db} from '../../src/server/db/client';
import {commercialIdentity,notificationFor} from './fixtures';
import {createSession} from '../../src/server/auth/session.service';
import {actor} from '../mission04-b/fixtures';
import {mkdir} from 'node:fs/promises';
const browserErrors=new WeakMap<Page,number>();
test.beforeEach(({page})=>{browserErrors.set(page,0);page.on('pageerror',()=>browserErrors.set(page,(browserErrors.get(page)||0)+1));});
test.afterEach(({page})=>expect(browserErrors.get(page)||0).toBe(0));
test.beforeAll(async()=>{expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/pap_beta1_test');await bootstrapSystemIam();});
test.afterAll(()=>db.$disconnect());
test('workspace edits its real profile, reads its notification, supports dark theme and logs out',async({page,context,baseURL})=>{
 const f=await commercialIdentity();await notificationFor(f);await context.addCookies([{name:'pap_session',value:f.token,url:baseURL!}]);await page.setViewportSize({width:1440,height:1000});
 await page.goto('/login');await expect(page).toHaveURL(/\/comercial$/);await expect(page.getByRole('heading',{name:/Olá,/})).toBeVisible();await expect(page.getByLabel('E-mail de login')).toHaveValue(f.user.email);await page.getByLabel('Nome completo',{exact:true}).fill('Nome Comercial Atualizado');await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(page.getByRole('status')).toContainText('Nome atualizado e salvo');await expect(page.getByRole('heading',{name:/Olá, Nome Comercial Atualizado/})).toBeVisible();
 await expect(page.getByText('Seu acesso foi liberado',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Marcar como lida'}).click();await expect(page.getByText('Lida',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Alternar tema claro e escuro'}).click();await expect(page.locator('[data-commercial-workspace]')).toHaveAttribute('data-theme','dark');
 expect((await new AxeBuilder({page}).include('.pap-commercial').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations.map(v=>v.id)).toEqual([]);
 const artifacts=process.env.PAP_COMMERCIAL_ARTIFACTS!;await mkdir(artifacts,{recursive:true});await page.screenshot({path:artifacts+'/commercial-1440-dark.png',fullPage:true,mask:[page.locator('[data-sensitive]'),page.getByLabel('E-mail de login')]});
 await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect((await context.request.get('/api/account/profile')).status()).toBe(401);
});
for(const width of [320,768])test(`responsive navigation at ${width}px preserves keyboard focus and has no overflow`,async({page,context,baseURL})=>{
 const f=await commercialIdentity();await context.addCookies([{name:'pap_session',value:f.token,url:baseURL!}]);await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});await page.goto('/comercial');await expect(page.getByLabel('E-mail de login')).toBeVisible();
 if(width===320){await expect(page.getByRole('navigation',{name:'Navegação comercial'})).not.toBeVisible();await page.getByRole('button',{name:'Abrir menu comercial'}).click();await expect(page.getByRole('dialog',{name:'Menu comercial'})).toBeVisible();await expect(page.getByRole('button',{name:'Fechar menu comercial',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Sair da conta',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Abrir menu comercial'})).toBeFocused();}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).include('.pap-commercial').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations.map(v=>v.id)).toEqual([]);
 await page.screenshot({path:process.env.PAP_COMMERCIAL_ARTIFACTS!+`/commercial-${width}-light.png`,fullPage:true,mask:[page.locator('[data-sensitive]'),page.getByLabel('E-mail de login')]});
});
test('MFA primary, missing session and unauthorized Admin never mount the workspace; real challenge resumes without loops',async({page,context,baseURL})=>{
 const f=await commercialIdentity(),primary=await createSession({userId:f.user.id});await context.addCookies([{name:'pap_session',value:primary.token,url:baseURL!}]);await page.goto('/comercial');await expect(page.getByRole('heading',{name:'Confirme a segurança desta sessão'})).toBeVisible();await expect(page.getByLabel('Nome completo',{exact:true})).toHaveCount(0);expect((await context.request.get('/api/account/profile')).status()).toBe(403);await page.getByRole('button',{name:'Encerrar esta sessão e validar MFA'}).click();await expect(page).toHaveURL(/\/login$/);
 const issued=await context.request.post('/api/auth/login/verification',{data:{accessible:true},headers:{origin:baseURL!}});expect(issued.status()).toBe(200);const challenge=await issued.json(),numbers=/produto de (\d{3}) por (\d{3})/.exec(challenge.question);expect(!!numbers).toBe(true);
 const login=await context.request.post('/api/auth/login',{headers:{origin:baseURL!},data:{email:f.user.email,password:f.password,verificationId:challenge.id,verificationAnswer:String(Number(numbers![1])*Number(numbers![2]))}});expect(login.status()).toBe(200);expect((await login.json()).mfaRequired).toBe(true);
 const verified=await context.request.post('/api/auth/mfa/verify',{headers:{origin:baseURL!},data:{code:f.codes[1],recovery:true}});expect(verified.status()).toBe(200);await page.goto('/login');await expect(page).toHaveURL(/\/comercial$/);await expect(page.getByRole('heading',{name:/Olá,/})).toBeVisible();
 await context.clearCookies();await page.goto('/comercial');await expect(page).toHaveURL(/\/login$/);const admin=await actor();await context.addCookies([{name:'pap_session',value:admin.token,url:baseURL!}]);const response=await context.request.get('/comercial',{maxRedirects:0});expect(response.status()).toBe(307);expect(response.headers().location).toContain('/login');
});
test('profile transport failure offers retry and then loads persisted data',async({page,context,baseURL})=>{
 const f=await commercialIdentity();await context.addCookies([{name:'pap_session',value:f.token,url:baseURL!}]);let unavailable=true;await page.route('**/api/account/profile',async route=>{if(unavailable&&route.request().method()==='GET'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"TEMPORARY_UNAVAILABLE"}'});}else await route.continue();});await page.goto('/comercial');const retry=page.getByRole('button',{name:'Tentar novamente carregar perfil'});await expect(retry).toBeVisible();unavailable=false;await retry.click();await expect(page.getByLabel('E-mail de login')).toHaveValue(f.user.email);
});

test('production RSC prefetch never exposes workspace or private data to denied identities',async({context,baseURL})=>{
 const admin=await actor(),manager=await actor('PAP_MANAGER'),commercial=await commercialIdentity(),primary=await createSession({userId:commercial.user.id}),unassigned=await commercialIdentity();
 await db.roleAssignment.deleteMany({where:{userId:unassigned.user.id}});
 for(const [kind,token]of [['ANONYMOUS',undefined],['NO_COMMERCIAL',unassigned.token],['PAP_ADMIN',admin.token],['PAP_MANAGER',manager.token],['MFA_PENDING',primary.token]] as const)for(const path of ['/comercial','/vitrine','/vitrine/registro','/vitrine/pacientes/maria-gracas']){
  const headers={RSC:'1','Next-Router-Prefetch':'1',...(token?{cookie:'pap_session='+token}:{})};let response=await context.request.get(path,{headers,maxRedirects:0});
  if(response.status()===307&&response.headers().location){const next=new URL(response.headers().location,baseURL);if(next.origin===baseURL&&next.pathname===path&&next.searchParams.has('_rsc')){expect([...next.searchParams.keys()]).toEqual(['_rsc']);response=await context.request.get(next.pathname+next.search,{headers,maxRedirects:0});}}
  if(response.status()===200){const body=await response.text();expect(response.headers()['content-type']).toContain('text/x-component');expect((response.headers().vary||'').toLowerCase()).not.toContain('next-url');assertPublicRscMetadata(body,path);expect(body).not.toContain('data-commercial-workspace');if(token)expect(body).not.toContain(token);}
  else{expect(response.status()).toBe(307);const target=new URL(response.headers().location,baseURL);expect(target.origin).toBe(baseURL);expect(target.pathname).toBe(kind==='MFA_PENDING'?'/comercial':'/login');}
 }
});
