import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
export function betaConfiguration(env, operation) {
  if (env.PAP_ADMIN_BETA_ONLY !== '1' || env.NODE_ENV !== 'production') throw Error('BETA_MODE_REQUIRED');
  if (env.PAP_PUBLIC_URL !== 'https://admin-beta.papsaude.com.br' || env.AUTH_ALLOWED_ORIGINS !== env.PAP_PUBLIC_URL || env.AUTH_TRUSTED_CLIENT_IP_HEADER !== 'x-pap-beta-client-ip') throw Error('BETA_ORIGIN_REQUIRED');
  if (Object.keys(env).some(k => k.startsWith('PAP_LOCAL_') && env[k])) throw Error('LOCAL_LAB_FORBIDDEN');
  const provider=env.PAP_EMAIL_PROVIDER||'disabled';
  if(provider!=='disabled'&&(provider!=='resend'||env.PAP_BETA_EMAIL_APPROVED!=='1'||env.PAP_EMAIL_EXTERNAL_ENABLED!=='1'||(operation==='web'&&(!env.RESEND_API_KEY||!env.RESEND_WEBHOOK_SECRET))))throw Error('EXTERNAL_EMAIL_REQUIRES_SEPARATE_APPROVAL');
  const url = new URL(env.DATABASE_URL || '');
  const role = operation === 'web' ? 'pap_beta_runtime' : 'pap_beta_migrator';
  if (url.protocol !== 'postgresql:' || url.hostname !== 'beta-db' || url.port !== '5432' || url.pathname !== '/pap_admin_beta' || url.username !== role || !url.password || url.hash || !['','?schema=public'].includes(url.search)) throw Error('BETA_DATABASE_REQUIRED');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(env.PAP_ADMIN_BETA_PROXY_TOKEN || '') || !/^[A-Za-z0-9_-]{43}$/.test(env.MFA_SECRET_ENCRYPTION_KEY || '') || Buffer.from(env.MFA_SECRET_ENCRYPTION_KEY || '', 'base64url').length !== 32) throw Error('BETA_SECRETS_REQUIRED');
  return role;
}
async function main() {
  const operation = process.argv[2];
  if (!['web','migrate','drift','verify','provision'].includes(operation)) throw Error('UNKNOWN_OPERATION');
  for (const key of ['DATABASE_URL','MFA_SECRET_ENCRYPTION_KEY','PAP_ADMIN_BETA_PROXY_TOKEN']) {
    if (process.env[key] || !process.env[key+'_FILE']) throw Error('SECRET_FILE_REQUIRED');
    process.env[key] = readFileSync(process.env[key+'_FILE'],'utf8').trim();
  }
  for(const key of ['RESEND_API_KEY','RESEND_WEBHOOK_SECRET'])if(process.env[key+'_FILE']){if(process.env[key])throw Error('SECRET_FILE_REQUIRED');process.env[key]=readFileSync(process.env[key+'_FILE'],'utf8').trim();}
  const role = betaConfiguration(process.env, operation);
  const {Client} = createRequire('/app/package.json')('pg');
  const client = new Client({connectionString:process.env.DATABASE_URL});
  await client.connect();
  try {
    const {rows} = await client.query("SELECT current_database() db,current_user role,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()");
    const ready = 'pap-admin-beta:ready:'+createHash('sha256').update(readFileSync('/beta/migration-manifest.json')).digest('hex');
    if(rows[0]?.db!=='pap_admin_beta'||rows[0]?.role!==role||!(rows[0]?.marker==='pap-admin-beta:new:v1'||/^pap-admin-beta:ready:[a-f0-9]{64}$/.test(rows[0]?.marker||'')))throw Error('BETA_DATABASE_MARKER_REQUIRED');
    if(['web','provision'].includes(operation)&&rows[0].marker!==ready)throw Error('BETA_VERIFICATION_REQUIRED');
  } finally {await client.end();}
  const command = {
    web:['/app/server.js'], migrate:['/app/migrate.mjs'],
    drift:['/app/node_modules/prisma/build/index.js','migrate','diff','--from-config-datasource','--to-schema','/app/prisma/schema.prisma','--exit-code'],
    verify:['/app/verify.mjs'], provision:['/app/provision.cjs'],
  }[operation];
  const child = spawn(process.execPath,command,{stdio:'inherit',env:process.env});
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
  child.on('error',()=>{console.error('BETA_PROCESS_FAILED');process.exitCode=1;});
  child.on('exit',code=>{process.exitCode=code??1;});
}
if(process.argv[1]?.endsWith('/entrypoint.mjs'))main().catch(error=>{const known=['BETA_MODE_REQUIRED','BETA_ORIGIN_REQUIRED','LOCAL_LAB_FORBIDDEN','EXTERNAL_EMAIL_REQUIRES_SEPARATE_APPROVAL','BETA_DATABASE_REQUIRED','BETA_SECRETS_REQUIRED','SECRET_FILE_REQUIRED','BETA_DATABASE_MARKER_REQUIRED','BETA_VERIFICATION_REQUIRED','UNKNOWN_OPERATION'];const code=known.includes(error?.message)?error.message:['28P01','3D000','ECONNREFUSED','ENOTFOUND'].includes(error?.code)?error.code:'CONNECTION_OR_CONFIG_ERROR';console.error('BETA_START_REFUSED '+code);process.exitCode=1;});
