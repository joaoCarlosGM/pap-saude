import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertToolsPackageWrite,sanitizedPublicationFailure} from '../../scripts/admin-beta/publish-images.mjs';
const endpoint='https://ghcr.io/v2/joaocarlosgm/pap-saude-admin-beta-tools/blobs/uploads/';
const location=endpoint+'owned-upload-1?_state=synthetic-private-state';
test('tools package permission probe starts and cancels only its own empty upload',async()=>{
  const calls=[];
  await assertToolsPackageWrite(async(url,options)=>{calls.push({url,options});return calls.length===1?new Response(null,{status:202,headers:{Location:location,'Docker-Upload-UUID':'owned-upload-1'}}):new Response(null,{status:204});},'synthetic-bearer');
  assert.equal(calls.length,2);assert.equal(calls[0].url,endpoint);assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.body,undefined);
  assert.equal(calls[1].url,location);assert.equal(calls[1].options.method,'DELETE');assert.equal(calls[1].options.headers.Authorization,'Bearer synthetic-bearer');
  assert.ok(calls.every(c=>c.options.redirect==='error'));
});
test('denied tools permission aborts before any image publication',async()=>{
  for(const status of [401,403]){let count=0;await assert.rejects(assertToolsPackageWrite(async()=>{count++;return new Response(null,{status});},'synthetic-bearer'),{message:'TOOLS_PACKAGE_ACTIONS_WRITE_REQUIRED',httpStatus:status});assert.equal(count,1);}
});
test('ambiguous upload state fails closed',async()=>{
  for(const status of [200,404,429,500])await assert.rejects(assertToolsPackageWrite(async()=>new Response(null,{status}),'synthetic-bearer'),{message:'TOOLS_UPLOAD_START_FAILED',httpStatus:status});
});
test('upload Location cannot exfiltrate the bearer or cancel unrelated resources',async()=>{
  for(const target of ['https://untrusted.invalid/upload','https://ghcr.io/v2/another/package/blobs/uploads/id','https://ghcr.io/v2/joaocarlosgm/pap-saude-admin-beta-tools/blobs/uploads/','https://user:password@ghcr.io/v2/joaocarlosgm/pap-saude-admin-beta-tools/blobs/uploads/id']){let count=0;await assert.rejects(assertToolsPackageWrite(async()=>{count++;return new Response(null,{status:202,headers:{Location:target,'Docker-Upload-UUID':decodeURIComponent(target.split('?')[0].split('/').at(-1))}});},'synthetic-bearer'),{message:'TOOLS_UPLOAD_LOCATION_INVALID'});assert.equal(count,1);}
});
test('failed cancellation blocks publication and error diagnostics omit private content',async()=>{
  let count=0;await assert.rejects(assertToolsPackageWrite(async()=>++count===1?new Response(null,{status:202,headers:{Location:location,'Docker-Upload-UUID':'owned-upload-1'}}):new Response(null,{status:403}),'synthetic-bearer'),{message:'TOOLS_UPLOAD_CANCEL_FAILED',httpStatus:403});
  const output=sanitizedPublicationFailure(new Error('private-token-and-upload-state'),'push','pap-saude-admin-beta-tools');assert.equal(output,'phase=push;package=pap-saude-admin-beta-tools;code=PUBLICATION_OPERATION_FAILED');
});

test('opaque registry upload identifiers may include dots and base64 padding without escaping the package',async()=>{
  for(const id of ['opaque.part==','opaque+token=','opaque%2Btoken%3D']){const calls=[];const target=endpoint+id+'?_state=synthetic-private-state';await assertToolsPackageWrite(async(url,options)=>{calls.push({url,options});return calls.length===1?new Response(null,{status:202,headers:{Location:target,'Docker-Upload-UUID':decodeURIComponent(target.split('?')[0].split('/').at(-1))}}):new Response(null,{status:204});},'synthetic-bearer');assert.equal(calls[1].url,target);}
  for(const id of ['%2Fother','%5Cother','%252Fother','%00'])await assert.rejects(assertToolsPackageWrite(async()=>new Response(null,{status:202,headers:{Location:endpoint+id}}),'synthetic-bearer'),{message:'TOOLS_UPLOAD_LOCATION_INVALID'});
});

test('global GHCR upload URLs require the UUID from our own POST; foreign repositories and UUIDs remain denied',async()=>{
  for(const target of ['https://ghcr.io/v2/blobs/uploads/owned-upload-1','https://ghcr.io/v2/blobs/upload/owned-upload-1','https://ghcr.io//v2/joaoCarlosGM/pap-saude-admin-beta-tools/blobs/uploads/owned-upload-1']){let count=0;await assertToolsPackageWrite(async()=>++count===1?new Response(null,{status:202,headers:{Location:target,'Docker-Upload-UUID':'owned-upload-1'}}):new Response(null,{status:204}),'synthetic-bearer');assert.equal(count,2);}
  for(const [target,uuid]of [[location,'foreign-uuid'],[location,''],['https://ghcr.io/v2/another/package/blobs/uploads/owned-upload-1','owned-upload-1']]){let count=0;await assert.rejects(assertToolsPackageWrite(async()=>{count++;return new Response(null,{status:202,headers:{Location:target,'Docker-Upload-UUID':uuid}});},'synthetic-bearer'),{message:'TOOLS_UPLOAD_LOCATION_INVALID'});assert.equal(count,1);}
});

test('GHCR405 cancellation is replaced by verified finalization of our own zero-byte upload',async()=>{
  const calls=[],digest='sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const result=await assertToolsPackageWrite(async(url,options)=>{calls.push({url,options});return calls.length===1?new Response(null,{status:202,headers:{Location:location,'Docker-Upload-UUID':'owned-upload-1'}}):calls.length===2?new Response(null,{status:405}):new Response(null,{status:201,headers:{'Docker-Content-Digest':digest}});},'synthetic-bearer');
  assert.equal(result,'finalized-empty');assert.equal(calls.length,3);assert.equal(calls[2].options.method,'PUT');assert.equal(calls[2].options.body.length,0);assert.equal(new URL(calls[2].url).searchParams.get('digest'),digest);assert.equal(new URL(calls[2].url).searchParams.get('_state'),'synthetic-private-state');assert.equal(new URL(calls[2].url).pathname,new URL(location).pathname);
});
test('unsupported cancellation never bypasses failed or unverified empty-upload finalization',async()=>{
  for(const [status,digest]of [[403,''],[500,''],[201,'sha256:incorrect']]){let count=0;await assert.rejects(assertToolsPackageWrite(async()=>++count===1?new Response(null,{status:202,headers:{Location:location,'Docker-Upload-UUID':'owned-upload-1'}}):count===2?new Response(null,{status:405}):new Response(null,{status,headers:{'Docker-Content-Digest':digest}}),'synthetic-bearer'),{message:'TOOLS_EMPTY_UPLOAD_FINALIZE_FAILED',httpStatus:status});assert.equal(count,3);}
});
