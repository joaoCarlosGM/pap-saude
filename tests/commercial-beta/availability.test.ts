import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NextRequest} from 'next/server';
import {betaCommercialEnabled,BETA_COMMERCIAL_PAGES,BETA_COMMERCIAL_PATTERNS} from '../../src/lib/beta-commercial-availability';
import {adminBetaPathAllowed} from '../../src/lib/admin-beta-policy';
import {nginxRouteMap} from '../../scripts/admin-beta/render-nginx';
import {proxy} from '../../src/proxy';
test('commercial availability requires explicit opt-in and never changes the default Admin Beta',()=>{
 for(const value of [undefined,'','0','true','unexpected'])assert.equal(betaCommercialEnabled(value),false);
 assert.equal(betaCommercialEnabled('1'),true);
 for(const method of ['GET','HEAD']){assert.equal(adminBetaPathAllowed('/comercial',method,false,false),false);assert.equal(adminBetaPathAllowed('/comercial',method,false,true),true);}
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS'])assert.equal(adminBetaPathAllowed('/comercial',method,false,true),false);
 for(const path of ['/dashboard','/pacientes','/api/clinical/patients','/api/courses/me','/api/vitrine/dashboard','/vitrine/unknown','/admin/unknown'])assert.equal(adminBetaPathAllowed(path,'GET',false,true),false,path);
});
test('both generated Nginx maps and the Next availability contract stay synchronized',()=>{
 assert.equal(readFileSync('deploy/admin-beta/routes.map.conf','utf8'),nginxRouteMap());
 const expanded=nginxRouteMap({commercialEnabled:true});assert.equal(readFileSync('deploy/admin-beta/routes.commercial.map.conf','utf8'),expanded);
 for(const path of BETA_COMMERCIAL_PAGES)for(const method of ['GET','HEAD']){assert.ok(expanded.includes(`"${method}:${path}" 1;`));assert.equal(adminBetaPathAllowed(path,method,false,true),true);}
 for(const pattern of BETA_COMMERCIAL_PATTERNS)assert.ok(expanded.includes(`"~^(?:GET|HEAD):${pattern}$" 1;`));
 assert.equal(expanded.includes('"GET:/api/vitrine/'),false);
});
test('proxy opt-in preserves private proxy identity and method/clinical restrictions',()=>{
 const previous={flag:process.env.PAP_ADMIN_BETA_ONLY,key:process.env.PAP_ADMIN_BETA_PROXY_TOKEN,commercial:process.env.PAP_BETA_COMMERCIAL_ENABLED};
 try{process.env.PAP_ADMIN_BETA_ONLY='1';process.env.PAP_ADMIN_BETA_PROXY_TOKEN='x'.repeat(48);const headers={'x-pap-beta-proxy-token':'x'.repeat(48)};
 delete process.env.PAP_BETA_COMMERCIAL_ENABLED;assert.equal(proxy(new NextRequest('http://beta.invalid/comercial',{headers})).status,404);
 process.env.PAP_BETA_COMMERCIAL_ENABLED='1';assert.equal(proxy(new NextRequest('http://beta.invalid/comercial',{headers})).status,200);assert.equal(proxy(new NextRequest('http://beta.invalid/comercial')).status,404);
 assert.equal(proxy(new NextRequest('http://beta.invalid/comercial',{method:'POST',headers})).status,404);
 for(const path of ['/dashboard','/api/clinical/patients','/api/courses/editor'])assert.equal(proxy(new NextRequest('http://beta.invalid'+path,{headers:{...headers,RSC:'1'}})).status,404);
 }finally{for(const [key,value]of [['PAP_ADMIN_BETA_ONLY',previous.flag],['PAP_ADMIN_BETA_PROXY_TOKEN',previous.key],['PAP_BETA_COMMERCIAL_ENABLED',previous.commercial]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
});

test('showcase routes are finite, synthetic-only and read-only, including dynamic records and lessons',async()=>{
 const {BETA_DEMO_PATIENT_IDS,BETA_DEMO_COURSE_IDS}=await import('../../src/lib/beta-commercial-availability');
 const {initialDemo}=await import('../../src/features/vitrine-premium/lib/demo/data');const {demoCourses}=await import('../../src/features/vitrine-premium/courses/data');
 assert.deepEqual([...BETA_DEMO_PATIENT_IDS].sort(),initialDemo().patients.map(p=>p.id).sort());assert.deepEqual([...BETA_DEMO_COURSE_IDS].sort(),demoCourses.map(c=>c.id).sort());
 const paths=[...BETA_COMMERCIAL_PAGES,...BETA_DEMO_PATIENT_IDS.map(id=>'/vitrine/pacientes/'+id),...BETA_DEMO_COURSE_IDS.map(id=>'/vitrine/aprender/'+id),'/vitrine/pacientes/demo-patient-1'];
 for(const path of paths){for(const method of ['GET','HEAD'])assert.equal(adminBetaPathAllowed(path,method,false,true),true,path);for(const method of ['POST','PATCH','PUT','DELETE'])assert.equal(adminBetaPathAllowed(path,method,false,true),false,path);assert.equal(adminBetaPathAllowed(path,'GET',false,false),false,path);}
 for(const path of ['/vitrine/private','/vitrine/admin','/vitrine/pacientes/550e8400-e29b-41d4-a716-446655440000','/vitrine/aprender/unknown','/vitrine/registro/unknown','/vitrine/pacientes/demo-patient-0','/vitrine/pacientes/demo-patient-999999999','/vitrine/%252e%252e/dashboard'])assert.equal(adminBetaPathAllowed(path,'GET',false,true),false,path);
});
test('Nginx and Next agree on canonical route/method matrix in both modes; legacy internal exceptions remain closed',()=>{
 const match=(map:string,method:string,path:string)=>{const key=method+':'+path;return [...map.matchAll(/^\s*"([^"]+)" 1;/gm)].some(([,value])=>value.startsWith('~')?new RegExp(value.slice(1)).test(key):value===key);};
 const paths=[...BETA_COMMERCIAL_PAGES,'/admin','/api/admin/organizations','/api/auth/login','/api/account/profile','/api/vitrine/dashboard','/vitrine/unknown','/vitrine/pacientes/maria-gracas','/vitrine/pacientes/demo-patient-9','/vitrine/aprender/pre-natal','/vitrine/aprender/unknown','/dashboard','/api/clinical/patients','/api/courses/me','/brand/logo.svg','/brand/unknown.avif','/favicon.ico','/faviconXico','/_next/static/chunks/one.js'];
 for(const commercialEnabled of [false,true]){const map=nginxRouteMap({commercialEnabled});for(const path of paths)for(const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'])assert.equal(match(map,method,path),adminBetaPathAllowed(path,method,false,commercialEnabled),`${commercialEnabled} ${method} ${path}`);assert.equal(match(map,'GET','/api/health'),false);assert.equal(match(map,'POST','/api/email/resend/webhook'),true);assert.equal(adminBetaPathAllowed('/api/email/resend/webhook','POST',false,commercialEnabled),false);}
});

test('Commercial CI cannot publish images or deploy and keeps the three scanner inputs intact',()=>{
 const workflow=readFileSync('.github/workflows/admin-beta-commercial.yml','utf8');assert.ok(workflow.includes('branches: [feature/admin-beta-commercial-b1]'));assert.doesNotMatch(workflow,/packages:\s*write|docker\/login-action|scripts\/admin-beta\/publish-images\.mjs|\bssh\b|docker push/);const scan=workflow.split('\n').find(l=>l.includes('scripts/admin-beta/scan-images.mjs'))!;assert.equal((scan.match(/"pap-admin-beta-/g)||[]).length,3);assert.ok(!scan.includes('--commercial'));
});
