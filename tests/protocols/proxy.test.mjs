import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{proxy}=require('../../src/proxy.ts'),{NextRequest}=require('next/server');
test('unchanged Beta proxy permits finite protocol GET dispatch only behind trusted proxy; rejects clinical APIs and mutation',()=>{
 const keys=['PAP_ADMIN_BETA_ONLY','PAP_BETA_COMMERCIAL_ENABLED','PAP_ADMIN_BETA_PROXY_TOKEN'],saved=keys.map(k=>process.env[k]);
 try{process.env.PAP_ADMIN_BETA_ONLY='1';process.env.PAP_BETA_COMMERCIAL_ENABLED='1';process.env.PAP_ADMIN_BETA_PROXY_TOKEN='disposable_test_proxy_identifier_123456789';
 const request=(path,method='GET',trusted=true)=>proxy(new NextRequest('http://localhost'+path,{method,headers:trusted?{'x-pap-beta-proxy-token':process.env.PAP_ADMIN_BETA_PROXY_TOKEN}:{}}));
 assert.equal(request('/vitrine/protocolos?protocolo=sepse-obstetrica&aba=checklist').status,200);assert.equal(request('/vitrine/protocolos','GET',false).status,404);
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(request('/vitrine/protocolos',method).status,404);
 for(const path of ['/vitrine/protocolos/unlisted','/api/clinical/patients','/api/courses/me','/dashboard','/registro'])assert.equal(request(path).status,404,path);
 // Outside Beta-only mode, operational LMS routing remains untouched (auth is a later server guard).
 process.env.PAP_ADMIN_BETA_ONLY='0';assert.equal(request('/cursos').status,200);
 }finally{keys.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]);}
});
