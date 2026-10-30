import {appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const e=process.env,sha=e.GITHUB_SHA,repo='joaoCarlosGM/pap-saude';
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==repo||e.GITHUB_REF!=='refs/heads/feature/admin-beta-isolated-deployment'||!/^([a-f0-9]{40})$/.test(sha||'')||e.PAP_BETA_VALIDATED_SHA!==sha||!e.GH_TOKEN||!e.GITHUB_ACTOR)throw Error('BETA_PUBLICATION_CONTEXT_REQUIRED');
const pairs=[['web','pap-saude-admin-beta'],['migrator','pap-saude-admin-beta-migrator'],['tools','pap-saude-admin-beta-tools']];
async function main(){
 // Check all immutable targets BEFORE publishing any. Network/auth ambiguity aborts.
 for(const [kind,pkg]of pairs){const label=execFileSync('docker',['image','inspect','--format','{{index .Config.Labels "org.opencontainers.image.revision"}}',`pap-admin-beta-${kind}:${sha}`],{encoding:'utf8'}).trim();if(label!==sha)throw Error('IMAGE_REVISION_MISMATCH');const name='joaocarlosgm/'+pkg;
  const tokenResponse=await fetch('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:'+name+':pull,push'),{headers:{Authorization:'Basic '+Buffer.from(e.GITHUB_ACTOR+':'+e.GH_TOKEN).toString('base64')}});if(!tokenResponse.ok)throw Error('REGISTRY_AUTH_FAILED');const {token}=await tokenResponse.json();if(!token)throw Error('REGISTRY_AUTH_FAILED');const head=await fetch(`https://ghcr.io/v2/${name}/manifests/sha-${sha}`,{method:'HEAD',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'}});if(head.status!==404)throw Error(head.ok?'IMMUTABLE_TAG_ALREADY_EXISTS':'REGISTRY_STATE_UNCONFIRMED');
 }
 for(const [kind,pkg]of pairs){const local=`pap-admin-beta-${kind}:${sha}`,remote=`ghcr.io/joaocarlosgm/${pkg}:sha-${sha}`;execFileSync('docker',['tag',local,remote]);execFileSync('docker',['push',remote],{stdio:'inherit'});const digests=JSON.parse(execFileSync('docker',['image','inspect','--format','{{json .RepoDigests}}',remote],{encoding:'utf8'}));const digest=digests.find(x=>x.startsWith('ghcr.io/joaocarlosgm/'+pkg+'@sha256:'));if(!digest)throw Error('PUBLISHED_DIGEST_UNCONFIRMED');console.log('::notice title=Beta immutable digest::'+digest);if(e.GITHUB_STEP_SUMMARY)appendFileSync(e.GITHUB_STEP_SUMMARY,'\n- `'+digest+'`\n');}
}
main().catch(()=>{console.error('BETA_PUBLISH_REFUSED: no prod tags, overwrite or deployment permitted; inspect registry status');process.exitCode=1;});
