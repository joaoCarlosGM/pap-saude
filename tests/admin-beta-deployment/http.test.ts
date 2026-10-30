import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import * as OTPAuth from 'otpauth';
import {db} from '../../src/server/db/client';import {actor} from '../mission04-b/fixtures';import {professional} from '../beta1/fixtures';import {createSession} from '../../src/server/auth/session.service';import {navigationFingerprint} from '../first-access/login-fixtures';
const base=process.env.PAP_BETA_TEST_URL!,origin='https://admin-beta.papsaude.com.br',key=process.env.PAP_ADMIN_BETA_PROXY_TOKEN!;
const statePath=process.env.PAP_BETA_TEST_STATE!;
function request(path:string,token?:string,body?:unknown,extra:Record<string,string>={}){return fetch(base+path,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{origin,'x-pap-beta-client-ip':'2001:db8::9','x-pap-beta-proxy-token':key,...(token?{cookie:'pap_session='+token}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function cookie(response:Response,name:string){const raw=response.headers.getSetCookie().find(c=>c.startsWith(name+'='));assert.ok(raw);assert.match(raw,/; Secure/i);assert.match(raw,/; HttpOnly/i);assert.doesNotMatch(raw,/; Domain=/i);return raw.split(';')[0].slice(name.length+1);}
async function login(email:string,password:string){const issued=await request('/api/auth/login/verification',undefined,{accessible:true});assert.equal(issued.status,200);const c=await issued.json(),match=/produto de (\d{3}) por (\d{3})/.exec(c.question);assert.ok(match);const binding=cookie(issued,'pap_login_verification');return request('/api/auth/login',undefined,{email,password,verificationId:c.id,verificationAnswer:String(Number(match[1])*Number(match[2]))},{cookie:'pap_login_verification='+binding});}
async function blocked(path:string,token:string,headers:Record<string,string>={}){let r=await request(path,token,undefined,headers);if([307,308].includes(r.status)){const next=new URL(r.headers.get('location')!,base);assert.equal(next.origin,base);assert.equal(next.pathname,new URL(path,base).pathname);assert.deepEqual([...next.searchParams],[['_rsc','']]);assert.equal(await r.text(),'');r=await request(next.pathname+next.search,token,undefined,headers);}assert.equal(r.status,404,path);assert.deepEqual(await r.json(),{error:'ADMIN_BETA_ROUTE_DISABLED'});}
after(()=>db.$disconnect());
test('production HTTP/RSC/API Beta gate; real initial login, TOTP, recovery, IAM and disabled operations',async()=>{
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/pap_admin_beta');assert.equal(new URL(process.env.DATABASE_URL!).hostname,'127.0.0.1');
 if(process.env.PAP_BETA_TEST_PHASE==='restart'){
  const s=JSON.parse(readFileSync(statePath,'utf8'));assert.equal(createHash('sha256').update(await navigationFingerprint(s.userId)).digest('hex'),s.fingerprint);assert.equal((await request('/api/admin/organizations',s.token)).status,200);return;
 }
 if(process.env.PAP_BETA_TEST_PHASE==='normal'){
  const s=JSON.parse(readFileSync(statePath,'utf8'));
  assert.equal((await request('/api/clinical/patients',s.professional,undefined,{'x-organization-id':s.unit})).status,200);
  const foreign=await actor();assert.equal((await request('/api/clinical/patients',s.professional,undefined,{'x-organization-id':foreign.unit.id})).status,403);
  assert.equal((await request('/api/clinical/patients',s.admin,undefined,{'x-organization-id':s.unit})).status,403);
  assert.equal((await request('/api/courses/editor',s.manager)).status,200);return;
 }
 const loginPage=await request('/login');assert.equal(loginPage.status,200);const html=await loginPage.text();const assets=[...new Set([...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]).filter(p=>p.startsWith('/_next/static/')||p.startsWith('/brand/')))];assert.ok(assets.length>0);for(const asset of assets)assert.equal((await request(asset)).status,200,'static asset must remain usable');
 const initial=JSON.parse(readFileSync(process.env.PAP_BETA_TEST_INITIAL!,'utf8'));
 let r=await login(initial.email,initial.password);assert.equal(r.status,200);const primary=cookie(r,'pap_session');
 assert.equal((await request('/api/admin/organizations',primary)).status,403);assert.equal((await request('/api/auth/security',primary)).status,200);
 r=await request('/api/auth/security',primary,{action:'START_MFA',password:initial.password});assert.equal(r.status,200);const setup=await r.json();const totp=OTPAuth.URI.parse(setup.provisioningUri);
 r=await request('/api/auth/security',primary,{action:'CONFIRM_MFA',password:initial.password,factorId:setup.factorId,code:totp.generate()});assert.equal(r.status,200);const recovery=(await r.json()).codes;
 assert.equal((await request('/api/auth/security',primary,{action:'ACK_RECOVERY',password:initial.password})).status,200);
 r=await login(initial.email,initial.password);assert.equal(r.status,200);assert.equal((await r.clone().json()).mfaRequired,true);const challenge=cookie(r,'pap_mfa_challenge');
 r=await request('/api/auth/mfa/verify',undefined,{code:recovery[0],recovery:true},{cookie:'pap_mfa_challenge='+challenge});assert.equal(r.status,200);let verified=cookie(r,'pap_session');
 await new Promise(resolve=>setTimeout(resolve,30050-(Date.now()%30000)));
 r=await login(initial.email,initial.password);assert.equal(r.status,200);const second=cookie(r,'pap_mfa_challenge');
 r=await request('/api/auth/mfa/verify',undefined,{code:totp.generate()},{cookie:'pap_mfa_challenge='+second});assert.equal(r.status,200);verified=cookie(r,'pap_session');
 assert.equal((await request('/api/auth/security',verified,{action:'COMPLETE_ONBOARDING'})).status,200);
 assert.equal((await request('/api/admin/organizations',verified)).status,200);
 const manager=await actor('PAP_MANAGER'),admin=await actor(),prof=await professional();
 assert.equal((await request('/api/admin/organizations',manager.token)).status,200);assert.equal((await request('/api/admin/security',manager.token)).status,403);
 assert.equal((await request('/api/admin/role-assignments',manager.token,{userId:prof.user.id,roleKey:'PAP_ADMIN'})).status,403);
 assert.equal((await request('/api/admin/organizations',verified,{}, {origin:'https://untrusted.invalid'})).status,403);
 for(const token of [verified,manager.token,admin.token,prof.token])for(const path of ['/dashboard','/pacientes','/registro','/atendimentos','/chat','/protocolos','/cursos','/aprender/unknown','/comercial','/vitrine','/admin/manager/cursos','/admin/manager/distribuicao','/api/clinical/patients','/api/courses/editor','/api/vitrine/dashboard','/api/organization-requests','/unknown']){await blocked(path,token);await blocked(path,token,{RSC:'1','Next-Router-Prefetch':'1'});}
 for(const path of ['/api/clinical/patients','/api/clinical/registrations','/api/courses/unit/assign'])assert.equal((await request(path,verified,{})).status,404);
 assert.equal((await fetch(base+'/login')).status,404);await blocked('/api/clinical/patients',prof.token,{'x-middleware-subrequest':'proxy'});
 assert.equal((await request('/api/email/resend/webhook',undefined,{})).status,404);
 const p=await createSession({userId:manager.user.id});assert.equal((await request('/api/admin/organizations',p.token)).status,403);
 const user=await db.user.findUniqueOrThrow({where:{email:initial.email}});
 writeFileSync(statePath,JSON.stringify({userId:user.id,token:verified,professional:prof.token,unit:prof.unit.id,admin:admin.token,manager:manager.token,fingerprint:createHash('sha256').update(await navigationFingerprint(user.id)).digest('hex')}),{mode:0o600});
});
