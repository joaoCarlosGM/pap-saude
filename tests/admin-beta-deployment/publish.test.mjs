import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishBetaImages,sanitizedPublicationFailure} from '../../scripts/admin-beta/publish-images.mjs';
const sha='a'.repeat(40),source='https://github.com/joaoCarlosGM/pap-saude';
const base={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'joaoCarlosGM/pap-saude',GITHUB_REF:'refs/heads/feature/admin-beta-isolated-deployment',GITHUB_SHA:sha,PAP_BETA_VALIDATED_SHA:sha,GH_TOKEN:'synthetic-private-token',GITHUB_ACTOR:'synthetic-actor'};
function fixture(overrides={}){
 const calls=[],requests=[],notices=[];
 const options={notice:n=>notices.push(n),recordFailure:()=>{},fetcher:async(url,init)=>{requests.push({url,init});return url.includes('/token?')?Response.json({token:'synthetic-registry-bearer'}):new Response(null,{status:overrides.head??404});},exec:(_command,args)=>{
  calls.push(args);
  if(args.includes('push')){if(overrides.denyPush)throw Object.assign(new Error('private raw registry failure'),{stderr:'error from registry: denied synthetic-private-token'});return '';}
  if(args[0]==='tag')return '';
  if(args.includes('{{json .RepoDigests}}'))return JSON.stringify(overrides.noDigest?[]:[args.at(-1).split(':sha-')[0]+'@sha256:'+'b'.repeat(64)]);
  return args.some(a=>a.includes('image.revision'))?(overrides.revision??sha):(overrides.source??source);
 }};return {calls,requests,notices,options};
}
test('validated tools is published first; three fresh SHA references and confirmed digests',async()=>{
 const f=fixture();const digests=await publishBetaImages(base,f.options);const pushes=f.calls.filter(c=>c[0]==='push').map(c=>c[1]);
 assert.deepEqual(pushes,['pap-saude-admin-beta-tools','pap-saude-admin-beta','pap-saude-admin-beta-migrator'].map(p=>'ghcr.io/joaocarlosgm/'+p+':sha-'+sha));assert.equal(digests.length,3);assert.equal(f.notices.length,3);
 assert.equal(f.requests.length,6);assert.ok(f.requests.every(r=>r.init.redirect==='error'));assert.ok(f.requests.every(r=>!r.init.method||r.init.method==='HEAD'));assert.ok(f.requests.every(r=>new URL(r.url).origin==='https://ghcr.io'));
});
test('tools write denial blocks web and migrator without exposing registry output',async()=>{
 const f=fixture({denyPush:true});await assert.rejects(publishBetaImages(base,f.options),e=>{assert.equal(e.code,'REGISTRY_PUSH_DENIED');assert.match(e.message,/package=pap-saude-admin-beta-tools/);assert.ok(!e.message.includes('synthetic-private-token'));return true;});
 assert.equal(f.calls.filter(c=>c[0]==='push').length,1);assert.equal(f.calls.filter(c=>c[0]==='tag').length,1);assert.equal(f.notices.length,0);
});
test('any existing immutable tag or ambiguous registry state blocks every push',async()=>{
 for(const head of [200,401,403,429,500]){const f=fixture({head});await assert.rejects(publishBetaImages(base,f.options),{code:head===200?'IMMUTABLE_TAG_ALREADY_EXISTS':'REGISTRY_STATE_UNCONFIRMED'});assert.equal(f.calls.filter(c=>c[0]==='push'||c[0]==='tag').length,0);}
});
test('wrong source linkage or revision blocks publication',async()=>{
 for(const override of [{source:'https://github.com/another/repository'},{revision:'c'.repeat(40)}]){const f=fixture(override);await assert.rejects(publishBetaImages(base,f.options),{code:override.source?'IMAGE_SOURCE_REPOSITORY_MISMATCH':'IMAGE_REVISION_MISMATCH'});assert.equal(f.requests.length,0);assert.equal(f.calls.filter(c=>c[0]==='push').length,0);}
});
test('only the exact repository branch and validated SHA may publish',async()=>{
 for(const override of [{GITHUB_REF:'refs/heads/prod'},{GITHUB_REF:'refs/heads/PROD'},{GITHUB_ACTIONS:'false'},{GITHUB_REPOSITORY:'another/repo'},{PAP_BETA_VALIDATED_SHA:'c'.repeat(40)},{GH_TOKEN:''}]){const f=fixture();await assert.rejects(publishBetaImages({...base,...override},f.options),{code:'BETA_PUBLICATION_CONTEXT_REQUIRED'});assert.equal(f.calls.length,0);assert.equal(f.requests.length,0);}
});
test('auth denial, transport failure and missing confirmed tools digest remain FAIL',async()=>{
 const auth=fixture();auth.options.fetcher=async()=>new Response(null,{status:403});await assert.rejects(publishBetaImages(base,auth.options),{code:'REGISTRY_AUTH_FAILED'});assert.equal(auth.calls.filter(c=>c[0]==='push').length,0);
 const network=fixture();network.options.fetcher=async()=>{throw Error('private network token');};await assert.rejects(publishBetaImages(base,network.options),e=>{assert.equal(e.code,'PUBLICATION_OPERATION_FAILED');assert.ok(!e.message.includes('private network token'));return true;});
 const digest=fixture({noDigest:true});await assert.rejects(publishBetaImages(base,digest.options),{code:'PUBLISHED_DIGEST_UNCONFIRMED'});assert.equal(digest.calls.filter(c=>c[0]==='push').length,1);
 assert.equal(sanitizedPublicationFailure(Error('private secret'),'push','pap-saude-admin-beta-tools'),'phase=push;package=pap-saude-admin-beta-tools;code=PUBLICATION_OPERATION_FAILED');
});
