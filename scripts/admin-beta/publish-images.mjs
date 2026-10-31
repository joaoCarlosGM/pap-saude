import {appendFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const repository='joaoCarlosGM/pap-saude',source='https://github.com/'+repository;
const pairs=[['tools','pap-saude-admin-beta-tools'],['web','pap-saude-admin-beta'],['migrator','pap-saude-admin-beta-migrator']];
const knownCodes=new Set(['BETA_PUBLICATION_CONTEXT_REQUIRED','IMAGE_REVISION_MISMATCH','IMAGE_SOURCE_REPOSITORY_MISMATCH','REGISTRY_AUTH_FAILED','IMMUTABLE_TAG_ALREADY_EXISTS','REGISTRY_STATE_UNCONFIRMED','REGISTRY_PUSH_DENIED','DOCKER_PUSH_FAILED','PUBLISHED_DIGEST_UNCONFIRMED']);
function failure(code,status){return Object.assign(new Error(code),{httpStatus:status});}
export function sanitizedPublicationFailure(error,phase,pkg){
  return `phase=${phase};package=${pkg};code=${knownCodes.has(error?.message)?error.message:'PUBLICATION_OPERATION_FAILED'}`+(Number.isInteger(error?.httpStatus)?`;HTTP=${error.httpStatus}`:'');
}
function privatePushFailure(error){const dir=mkdtempSync('/tmp/pap-beta-publish-');writeFileSync(dir+'/private-push.log',String(error?.stdout||'')+String(error?.stderr||''),{mode:0o600});}

export async function publishBetaImages(env,options={}){
  const {fetcher=globalThis.fetch,exec=execFileSync,notice=console.log,recordFailure=privatePushFailure,append=appendFileSync}=options;
  const sha=env.GITHUB_SHA;let phase='context',activePackage='none';
  try{
    if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/feature/admin-beta-isolated-deployment'||!/^([a-f0-9]{40})$/.test(sha||'')||env.PAP_BETA_VALIDATED_SHA!==sha||!env.GH_TOKEN||!env.GITHUB_ACTOR)throw failure('BETA_PUBLICATION_CONTEXT_REQUIRED');
    // Absence is mandatory for ALL new SHA tags, before ANY publication.
    for(const [kind,pkg]of pairs){
      phase='immutable-preflight';activePackage=pkg;
      const local=`pap-admin-beta-${kind}:${sha}`;
      const revision=exec('docker',['image','inspect','--format','{{index .Config.Labels "org.opencontainers.image.revision"}}',local],{encoding:'utf8'}).trim();
      if(revision!==sha)throw failure('IMAGE_REVISION_MISMATCH');
      const linkedSource=exec('docker',['image','inspect','--format','{{index .Config.Labels "org.opencontainers.image.source"}}',local],{encoding:'utf8'}).trim();
      if(linkedSource!==source)throw failure('IMAGE_SOURCE_REPOSITORY_MISMATCH');
      const name='joaocarlosgm/'+pkg;
      const auth=await fetcher('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:'+name+':pull,push'),{headers:{Authorization:'Basic '+Buffer.from(env.GITHUB_ACTOR+':'+env.GH_TOKEN).toString('base64')},redirect:'error',signal:AbortSignal.timeout(30000)});
      if(!auth.ok)throw failure('REGISTRY_AUTH_FAILED',auth.status);
      const {token}=await auth.json();if(!token)throw failure('REGISTRY_AUTH_FAILED');
      const head=await fetcher(`https://ghcr.io/v2/${name}/manifests/sha-${sha}`,{method:'HEAD',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'},redirect:'error',signal:AbortSignal.timeout(30000)});
      if(head.status!==404)throw failure(head.ok?'IMMUTABLE_TAG_ALREADY_EXISTS':'REGISTRY_STATE_UNCONFIRMED',head.status);
    }
    const published=[];
    // The real, validated tools image is the write-permission test. No synthetic
    // registry uploads/cancellation APIs; if denied, web/migrator are never pushed.
    for(const [kind,pkg]of pairs){
      phase='push';activePackage=pkg;
      const local=`pap-admin-beta-${kind}:${sha}`,remote=`ghcr.io/joaocarlosgm/${pkg}:sha-${sha}`;
      exec('docker',['tag',local,remote]);
      try{exec('docker',['push',remote],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});}
      catch(error){recordFailure(error);throw failure(/\bdenied\b|\bunauthorized\b/i.test(String(error?.stderr||'')+String(error?.stdout||''))?'REGISTRY_PUSH_DENIED':'DOCKER_PUSH_FAILED');}
      phase='digest';
      const digests=JSON.parse(exec('docker',['image','inspect','--format','{{json .RepoDigests}}',remote],{encoding:'utf8'}));
      const prefix='ghcr.io/joaocarlosgm/'+pkg+'@sha256:';
      const digest=Array.isArray(digests)&&digests.find(x=>typeof x==='string'&&x.startsWith(prefix)&&/^[a-f0-9]{64}$/.test(x.slice(prefix.length)));
      if(!digest)throw failure('PUBLISHED_DIGEST_UNCONFIRMED');
      notice('::notice title=Beta immutable digest::'+digest);published.push(digest);
      if(env.GITHUB_STEP_SUMMARY)append(env.GITHUB_STEP_SUMMARY,'\n- `'+digest+'`\n');
    }
    return published;
  }catch(error){throw Object.assign(new Error(sanitizedPublicationFailure(error,phase,activePackage)),{code:knownCodes.has(error?.message)?error.message:'PUBLICATION_OPERATION_FAILED'});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{await publishBetaImages(process.env);}catch(error){console.error('::error title=Beta publication refused::'+error.message);process.exitCode=1;}
}
