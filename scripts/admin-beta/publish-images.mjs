import {appendFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const toolsName='joaocarlosgm/pap-saude-admin-beta-tools';
const knownCodes=new Set(['BETA_PUBLICATION_CONTEXT_REQUIRED','IMAGE_REVISION_MISMATCH','REGISTRY_AUTH_FAILED','IMMUTABLE_TAG_ALREADY_EXISTS','REGISTRY_STATE_UNCONFIRMED','TOOLS_PACKAGE_ACTIONS_WRITE_REQUIRED','TOOLS_UPLOAD_START_FAILED','TOOLS_UPLOAD_LOCATION_INVALID','TOOLS_UPLOAD_CANCEL_FAILED','REGISTRY_PUSH_DENIED','DOCKER_PUSH_FAILED','PUBLISHED_DIGEST_UNCONFIRMED']);
function failure(code,status){return Object.assign(new Error(code),{httpStatus:status});}

/** A new tag being absent proves no write permission. Probe ONLY the tools package;
 * cancel our empty upload, without publishing a manifest or changing existing tags. */
export async function assertToolsPackageWrite(fetcher,token){
  const endpoint=`https://ghcr.io/v2/${toolsName}/blobs/uploads/`;
  const headers={Authorization:'Bearer '+token};
  const response=await fetcher(endpoint,{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  if([401,403].includes(response.status))throw failure('TOOLS_PACKAGE_ACTIONS_WRITE_REQUIRED',response.status);
  if(response.status!==202)throw failure('TOOLS_UPLOAD_START_FAILED',response.status);
  let location;
  try{location=new URL(response.headers.get('location')||'',endpoint);}catch{throw failure('TOOLS_UPLOAD_LOCATION_INVALID');}
  const prefix=`/v2/${toolsName}/blobs/uploads/`;
  // Registry upload identifiers are opaque, not necessarily UUID/base64url.
  let opaque='';try{opaque=decodeURIComponent(location.pathname.slice(prefix.length));}catch{}
  const validOpaque=opaque.length>0&&!/[\\/\u0000-\u0020%]/.test(opaque)&&!['.','..'].includes(opaque);
  if(!response.headers.get('location')||location.origin!=='https://ghcr.io'||location.username||location.password||location.hash||!location.pathname.startsWith(prefix)||!validOpaque){
    const error=failure('TOOLS_UPLOAD_LOCATION_INVALID');
    error.locationShape={sameOrigin:location.origin==='https://ghcr.io',sameUploadScope:location.pathname.startsWith(prefix),opaqueLength:Math.min(opaque.length,4096),hasQuery:!!location.search,uuidHeader:!!response.headers.get('docker-upload-uuid')};
    throw error;
  }
  const canceled=await fetcher(location.href,{method:'DELETE',headers,redirect:'error',signal:AbortSignal.timeout(30000)});
  if(canceled.status!==204)throw failure('TOOLS_UPLOAD_CANCEL_FAILED',canceled.status);
}

export function sanitizedPublicationFailure(error,phase,pkg){
  const code=knownCodes.has(error?.message)?error.message:'PUBLICATION_OPERATION_FAILED';
  const shape=code==='TOOLS_UPLOAD_LOCATION_INVALID'&&error?.locationShape;
  const safeShape=shape&&['sameOrigin','sameUploadScope','hasQuery','uuidHeader'].every(k=>typeof shape[k]==='boolean')&&Number.isInteger(shape.opaqueLength)&&shape.opaqueLength>=0&&shape.opaqueLength<=4096?`;locationShape=${JSON.stringify({sameOrigin:shape.sameOrigin,sameUploadScope:shape.sameUploadScope,opaqueLength:shape.opaqueLength,hasQuery:shape.hasQuery,uuidHeader:shape.uuidHeader})}`:'';
  return `phase=${phase};package=${pkg};code=${code}`+(Number.isInteger(error?.httpStatus)?`;HTTP=${error.httpStatus}`:'')+safeShape;
}

async function main(){
  const e=process.env,sha=e.GITHUB_SHA,repo='joaoCarlosGM/pap-saude';
  let phase='context',activePackage='none';
  try{
    if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==repo||e.GITHUB_REF!=='refs/heads/feature/admin-beta-isolated-deployment'||!/^([a-f0-9]{40})$/.test(sha||'')||e.PAP_BETA_VALIDATED_SHA!==sha||!e.GH_TOKEN||!e.GITHUB_ACTOR)throw failure('BETA_PUBLICATION_CONTEXT_REQUIRED');
    const pairs=[['web','pap-saude-admin-beta'],['migrator','pap-saude-admin-beta-migrator'],['tools','pap-saude-admin-beta-tools']];
    // Check all immutable targets AND tools package write access BEFORE any push.
    for(const [kind,pkg]of pairs){
      phase='immutable-preflight';activePackage=pkg;
      const label=execFileSync('docker',['image','inspect','--format','{{index .Config.Labels "org.opencontainers.image.revision"}}',`pap-admin-beta-${kind}:${sha}`],{encoding:'utf8'}).trim();
      if(label!==sha)throw failure('IMAGE_REVISION_MISMATCH');
      const name='joaocarlosgm/'+pkg;
      const auth=await fetch('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:'+name+':pull,push'),{headers:{Authorization:'Basic '+Buffer.from(e.GITHUB_ACTOR+':'+e.GH_TOKEN).toString('base64')},redirect:'error',signal:AbortSignal.timeout(30000)});
      if(!auth.ok)throw failure('REGISTRY_AUTH_FAILED',auth.status);
      const {token}=await auth.json();if(!token)throw failure('REGISTRY_AUTH_FAILED');
      const head=await fetch(`https://ghcr.io/v2/${name}/manifests/sha-${sha}`,{method:'HEAD',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'},redirect:'error',signal:AbortSignal.timeout(30000)});
      if(head.status!==404)throw failure(head.ok?'IMMUTABLE_TAG_ALREADY_EXISTS':'REGISTRY_STATE_UNCONFIRMED',head.status);
      if(kind==='tools'){phase='tools-package-write-preflight';await assertToolsPackageWrite(fetch,token);console.log('::notice title=Beta tools scoped write::Empty upload created and canceled; tools package accepts the repository Actions token.');}
    }
    for(const [kind,pkg]of pairs){
      phase='push';activePackage=pkg;
      const local=`pap-admin-beta-${kind}:${sha}`,remote=`ghcr.io/joaocarlosgm/${pkg}:sha-${sha}`;
      execFileSync('docker',['tag',local,remote]);
      const pushed=spawnSync('docker',['push',remote],{encoding:'utf8',maxBuffer:4*1024*1024});
      if(pushed.status!==0){const dir=mkdtempSync('/tmp/pap-beta-publish-');writeFileSync(dir+'/private-push.log',String(pushed.stdout||'')+String(pushed.stderr||''),{mode:0o600});throw failure(/\bdenied\b|\bunauthorized\b/i.test(String(pushed.stderr||'')+String(pushed.stdout||''))?'REGISTRY_PUSH_DENIED':'DOCKER_PUSH_FAILED');}
      phase='digest';
      const digests=JSON.parse(execFileSync('docker',['image','inspect','--format','{{json .RepoDigests}}',remote],{encoding:'utf8'}));
      const digest=digests.find(x=>x.startsWith('ghcr.io/joaocarlosgm/'+pkg+'@sha256:'));if(!digest)throw failure('PUBLISHED_DIGEST_UNCONFIRMED');
      console.log('::notice title=Beta immutable digest::'+digest);
      if(e.GITHUB_STEP_SUMMARY)appendFileSync(e.GITHUB_STEP_SUMMARY,'\n- `'+digest+'`\n');
    }
  }catch(error){console.error('::error title=Beta publication refused::'+sanitizedPublicationFailure(error,phase,activePackage));process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
