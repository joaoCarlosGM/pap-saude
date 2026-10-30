import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,existsSync,readdirSync,lstatSync,realpathSync,writeFileSync,copyFileSync,chmodSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export function prepareBetaDirectory(directory,sha){
 const target=resolve(directory);
 if(basename(target)!=='pap-saude-beta'||!/^([a-f0-9]{40})$/.test(sha)||realpathSync(dirname(target))!==dirname(target))throw Error('INVALID_BETA_DESTINATION');
 if(existsSync(target)&&(lstatSync(target).isSymbolicLink()||!lstatSync(target).isDirectory()||readdirSync(target).length))throw Error('BETA_DESTINATION_NOT_EMPTY');
 if(!existsSync(target))mkdirSync(target,{mode:0o700});chmodSync(target,0o700);
 const source=resolve(dirname(fileURLToPath(import.meta.url)),'../../deploy/admin-beta');
 writeFileSync(join(target,'ownership.json'),JSON.stringify({purpose:'pap-admin-beta',nonce:randomUUID(),sha},null,2)+'\n',{flag:'wx',mode:0o600});
 mkdirSync(join(target,'secrets'),{mode:0o700});mkdirSync(join(target,'nginx'),{mode:0o700});mkdirSync(join(target,'.docker'),{mode:0o700});
 const owner=randomBytes(32).toString('hex'),runtime=randomBytes(32).toString('hex'),migrator=randomBytes(32).toString('hex'),proxy=randomBytes(48).toString('base64url');
 const secrets={owner_password:owner,runtime_password:runtime,migrator_password:migrator,runtime_url:`postgresql://pap_beta_runtime:${runtime}@beta-db:5432/pap_admin_beta?schema=public`,migrator_url:`postgresql://pap_beta_migrator:${migrator}@beta-db:5432/pap_admin_beta?schema=public`,mfa_key:randomBytes(32).toString('base64url'),proxy_token:proxy,resend_api_key:'',resend_webhook_secret:''};
 // Files are Docker secrets, mounted separately. The host parent is private0700;
 // readable mounts support PostgreSQL70 / Node1000 / web1001 without changing users.
 for(const [name,value]of Object.entries(secrets)){const file=join(target,'secrets',name);writeFileSync(file,value+'\n',{flag:'wx',mode:0o444});chmodSync(file,0o444);}
 for(const name of ['compose.yml','entrypoint.mjs','init-db.sh','migration-manifest.json','runtime-acl.psql']){copyFileSync(join(source,name),join(target,name));chmodSync(join(target,name),0o644);}
 for(const name of ['nginx.conf','routes.map.conf']){copyFileSync(join(source,name),join(target,'nginx',name));chmodSync(join(target,'nginx',name),0o644);}
 writeFileSync(join(target,'nginx/proxy-secret.conf'),`proxy_set_header X-PAP-Beta-Proxy-Token "${proxy}";\n`,{flag:'wx',mode:0o600});
 writeFileSync(join(target,'.env'),`BETA_SHA=${sha}\nBETA_WEB_IMAGE=ghcr.io/joaocarlosgm/pap-saude-admin-beta:sha-${sha}\nBETA_MIGRATOR_IMAGE=ghcr.io/joaocarlosgm/pap-saude-admin-beta-migrator:sha-${sha}\nBETA_TOOLS_IMAGE=ghcr.io/joaocarlosgm/pap-saude-admin-beta-tools:sha-${sha}\nPAP_EMAIL_PROVIDER=disabled\nPAP_EMAIL_EXTERNAL_ENABLED=0\nPAP_BETA_EMAIL_APPROVED=0\nPAP_EMAIL_FROM=\nPAP_EMAIL_ALLOWED_SENDERS=\n`,{flag:'wx',mode:0o600});
 return {directory:target,sha};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const a=process.argv.slice(2);if(a.length!==5||a[0]!=='--directory'||a[2]!=='--sha'||a[4]!=='--new-isolated-beta')throw Error();prepareBetaDirectory(a[1],a[3]);console.log('Novo diretório Beta preparado. Segredos não exibidos. Nenhum Docker, banco ou serviço foi iniciado.');}
 catch{console.error('BETA_PREPARATION_REFUSED: requires explicit SHA and a new empty, non-symlink pap-saude-beta directory; existing files preserved');process.exitCode=1;}
}
