import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,lstatSync,writeFileSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {prepareBetaDirectory} from '../../scripts/admin-beta/prepare.mjs';
import {betaConfiguration} from '../../deploy/admin-beta/entrypoint.mjs';
import {nginxRouteMap} from '../../scripts/admin-beta/render-nginx';
test('preparation generates independent secrets once; existing directories and symlinks are never overwritten',()=>{
 const parent=mkdtempSync('/tmp/pap-admin-beta-unit-'),target=join(parent,'pap-saude-beta');
 try{const previousUmask=process.umask(0o077);try{prepareBetaDirectory(target,'a'.repeat(40));}finally{process.umask(previousUmask);}assert.equal(lstatSync(join(target,'secrets/owner_password')).mode&0o777,0o444);assert.equal(lstatSync(join(target,'init-db.sh')).mode&0o777,0o644);assert.equal(lstatSync(join(target,'entrypoint.mjs')).mode&0o777,0o644);const key=readFileSync(join(target,'secrets/mfa_key'),'utf8');assert.equal(Buffer.from(key.trim(),'base64url').length,32);assert.equal(lstatSync(target).mode&0o777,0o700);assert.equal(lstatSync(join(target,'secrets')).mode&0o777,0o700);
 assert.throws(()=>prepareBetaDirectory(target,'b'.repeat(40)));assert.equal(readFileSync(join(target,'secrets/mfa_key'),'utf8'),key);
 assert.notEqual(readFileSync(join(target,'secrets/runtime_password'),'utf8'),readFileSync(join(target,'secrets/migrator_password'),'utf8'));
 const outside=join(parent,'outside');writeFileSync(outside,'preserved');const link=join(parent,'link');symlinkSync(parent,link);assert.throws(()=>prepareBetaDirectory(join(link,'pap-saude-beta'),'a'.repeat(40)));assert.equal(readFileSync(outside,'utf8'),'preserved');
 const config=JSON.parse(execFileSync('docker',['compose','--project-name','pap-admin-beta-unit','--env-file',join(target,'.env'),'-f',join(target,'compose.yml'),'config','--format','json'],{encoding:'utf8'}));
 assert.equal(config.services['beta-db'].ports,undefined);assert.equal(config.services.web.ports[0].host_ip,'127.0.0.1');assert.equal(String(config.services.web.ports[0].published),'3101');assert.equal(config.services.web.environment.PAP_ADMIN_BETA_ONLY,'1');assert.equal(config.networks['beta-private'].internal,true);assert.ok(Object.values(config.networks).every((n:unknown)=>!(n as {external?:boolean}).external));assert.ok(config.services.web.environment.DATABASE_URL_FILE);assert.equal(config.services.web.environment.DATABASE_URL,undefined);
 }finally{rmSync(parent,{recursive:true,force:true});}
});
test('Beta entrypoint rejects old/local databases, unsafe origins, missing flags and unapproved mail',()=>{
 const env={PAP_ADMIN_BETA_ONLY:'1',NODE_ENV:'production',PAP_PUBLIC_URL:'https://admin-beta.papsaude.com.br',AUTH_ALLOWED_ORIGINS:'https://admin-beta.papsaude.com.br',AUTH_TRUSTED_CLIENT_IP_HEADER:'x-pap-beta-client-ip',DATABASE_URL:'postgresql://pap_beta_runtime:synthetic@beta-db:5432/pap_admin_beta',PAP_ADMIN_BETA_PROXY_TOKEN:'x'.repeat(48),MFA_SECRET_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64url')};
 assert.equal(betaConfiguration(env,'web'),'pap_beta_runtime');
 for(const override of [{PAP_ADMIN_BETA_ONLY:'0'},{DATABASE_URL:'postgresql://pap_beta_runtime:synthetic@pap-postgres:5432/pap_admin_beta'},{DATABASE_URL:'postgresql://pap_beta_runtime:synthetic@127.0.0.1:15436/pap_p0_unified_rc'},{PAP_LOCAL_PROFILE:'unified'},{PAP_EMAIL_PROVIDER:'resend'},{PAP_PUBLIC_URL:'http://admin-beta.papsaude.com.br'}])assert.throws(()=>betaConfiguration({...env,...override},'web'));
});
test('migration manifest is exact; existing infrastructure and deployment pipeline are unchanged',()=>{
 const manifest=JSON.parse(readFileSync('deploy/admin-beta/migration-manifest.json','utf8'));assert.equal(manifest.migrations.length,36);
 for(const item of manifest.migrations){const path=`prisma/migrations/${item.name}/migration.sql`;assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),item.sha256);assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show',`ea6b5f969701:${path}`],{encoding:'utf8'}));}
 assert.equal(readFileSync('deploy/admin-beta/runtime-acl.psql','utf8'),readFileSync('scripts/db/f04-role-separation.sql','utf8'));
 for(const path of ['Dockerfile','.github/workflows/ci.yml','docker-compose.yml'])assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show',`ea6b5f969701:${path}`],{encoding:'utf8'}));
 assert.equal(readFileSync('deploy/admin-beta/routes.map.conf','utf8'),nginxRouteMap());
 const nginx=readFileSync('deploy/admin-beta/nginx.conf','utf8');assert.ok(nginx.includes('proxy_set_header X-PAP-Beta-Client-IP $remote_addr'));assert.ok(!nginx.includes('$proxy_add_x_forwarded_for'));const log=nginx.match(/log_format[^;]+;/)![0];assert.doesNotMatch(log,/\$(?:request|request_uri|uri|args|http_cookie|http_referer|http_authorization)\b/);
});
