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
