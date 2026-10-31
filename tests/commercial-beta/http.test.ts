import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../../src/server/db/client';
import {actor} from '../mission04-b/fixtures';
import {createSession} from '../../src/server/auth/session.service';
import {BETA_COMMERCIAL_PAGES,BETA_DEMO_PATIENT_IDS,BETA_DEMO_COURSE_IDS} from '../../src/lib/beta-commercial-availability';
import {assertPublicRscMetadata} from './rsc-metadata';
const base=process.env.PAP_BETA_TEST_URL!,origin='https://admin-beta.papsaude.com.br',key=process.env.PAP_ADMIN_BETA_PROXY_TOKEN!;
function request(path:string,token?:string,method='GET',headers:Record<string,string>={}){return fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{origin,'x-pap-beta-client-ip':'2001:db8::c3','x-pap-beta-proxy-token':key,...(token?{cookie:'pap_session='+token}:{}),...headers}});}
after(()=>db.$disconnect());
test('production Beta Commercial HTTP/RSC/API and read-only synthetic isolation',{timeout:180000},async()=>{
 assert.equal(new URL(process.env.DATABASE_URL!).hostname,'127.0.0.1');assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/pap_admin_beta');
 const f=await actor('COMMERCIAL');
 if(process.env.PAP_BETA_TEST_PHASE==='commercial-readonly'){
  const [acl]=await db.$queryRaw<{clinical:boolean;organizations:boolean;lms:boolean}[]>`SELECT has_table_privilege('pap_beta_showcase','patients','SELECT') clinical,has_table_privilege('pap_beta_showcase','organizations','SELECT') organizations,has_table_privilege('pap_beta_showcase','courses','SELECT') lms`;assert.deepEqual(acl,{clinical:false,organizations:false,lms:false});
  for(const path of [...BETA_COMMERCIAL_PAGES.filter(p=>p.startsWith('/vitrine')),...BETA_DEMO_PATIENT_IDS.map(id=>'/vitrine/pacientes/'+id),...BETA_DEMO_COURSE_IDS.map(id=>'/vitrine/aprender/'+id)])assert.equal((await request(path,f.token)).status,200,'read-only synthetic route '+path);return;
 }
 assert.equal((await request('/comercial',f.token)).status,200);
 const primary=await createSession({userId:f.user.id});const notice=await request('/comercial',primary.token);assert.equal(notice.status,200);const noticeBody=await notice.text();assert.ok(noticeBody.includes('Confirme a segurança desta sessão'));assert.ok(!noticeBody.includes('data-commercial-workspace'));assert.equal((await request('/api/account/profile',primary.token)).status,403);
 const denied=[undefined,(await actor()).token,(await actor('PAP_MANAGER')).token,primary.token];
 for(const token of denied)for(const path of ['/comercial','/vitrine','/vitrine/registro','/vitrine/pacientes/maria-gracas']){
  if(!(token===primary.token&&path==='/comercial')){const html=await request(path,token);assert.equal(html.status,307);assert.ok(['/login','/comercial'].some(p=>html.headers.get('location')?.endsWith(p)));}
  const headers={RSC:'1','Next-Router-Prefetch':'1'};let r=await request(path,token,'GET',headers);if(r.status===307&&r.headers.get('location')){const next=new URL(r.headers.get('location')!,base);if(next.origin===base&&next.pathname===path&&next.searchParams.has('_rsc')){assert.deepEqual([...next.searchParams.keys()],['_rsc']);r=await request(next.pathname+next.search,token,'GET',headers);}}
  if(r.status===200){const body=await r.text();assert.ok(!body.includes('data-commercial-workspace'));if(token)assert.ok(!body.includes(token));assertPublicRscMetadata(body,path);}else{assert.equal(r.status,307);assert.ok(['/login','/comercial'].some(p=>r.headers.get('location')?.endsWith(p)));}
 }
 assert.equal((await request('/api/admin/organizations',f.token)).status,403);assert.equal((await request('/api/admin/security',f.token)).status,403);
 for(const path of ['/dashboard','/pacientes','/registro','/api/clinical/patients','/api/courses/me','/api/vitrine/dashboard','/vitrine/private','/vitrine/pacientes/'+randomUUID(),'/vitrine/aprender/'+randomUUID()])for(const headers of [{},{RSC:'1','Next-Router-Prefetch':'1'}])assert.equal((await request(path,f.token,'GET',headers as Record<string,string>)).status,404,path);
 for(const path of ['/comercial','/vitrine','/vitrine/registro','/vitrine/pacientes/maria-gracas','/vitrine/aprender/pre-natal'])for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await request(path,f.token,method)).status,404);
 await db.roleAssignment.deleteMany({where:{userId:f.user.id}});assert.equal((await request('/comercial',f.token)).status,307);
});
