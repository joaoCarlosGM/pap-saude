import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import pg from 'pg';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
let phase='connect';
try{
 await client.connect();
 phase='identity';const identity=await client.query("SELECT current_database() db,current_user role,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()");
 if(process.env.PAP_ADMIN_BETA_ONLY!=='1'||identity.rows[0]?.db!=='pap_admin_beta'||identity.rows[0]?.role!=='pap_beta_migrator'||!identity.rows[0]?.marker?.startsWith('pap-admin-beta:'))throw Error('BETA_IDENTITY_REQUIRED');
 phase='history';const raw=readFileSync('/beta/migration-manifest.json'),manifest=JSON.parse(raw);
 const {rows}=await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name');
 if(rows.length!==manifest.migrations.length||rows.some((r,i)=>r.migration_name!==manifest.migrations[i].name||r.checksum!==manifest.migrations[i].sha256||!r.finished_at||r.rolled_back_at))throw Error('MIGRATION_INTEGRITY_FAILED');
 phase='files';for(const item of manifest.migrations)if(createHash('sha256').update(readFileSync('/app/prisma/migrations/'+item.name+'/migration.sql')).digest('hex')!==item.sha256)throw Error('IMAGE_MIGRATION_MISMATCH');
 phase='roles';const {rows:roles}=await client.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolreplication,rolcanlogin FROM pg_roles WHERE rolname IN ('pap_beta_runtime','pap_beta_migrator')");
 if(roles.length!==2||roles.some(r=>r.rolsuper||r.rolcreatedb||r.rolcreaterole||r.rolbypassrls||r.rolreplication||!r.rolcanlogin))throw Error('PRIVILEGED_DATABASE_ROLE');
 phase='memberships';const {rows:memberships}=await client.query("SELECT count(*)::int count FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('pap_beta_runtime','pap_beta_migrator'))");
 if(memberships[0].count!==0)throw Error('DATABASE_ROLE_MEMBERSHIP_FORBIDDEN');
 phase='acl';const {rows:acl}=await client.query("SELECT has_schema_privilege('pap_beta_runtime','public','CREATE') ddl,has_table_privilege('pap_beta_runtime','_prisma_migrations','SELECT') ledger,has_table_privilege('pap_beta_runtime','audit_events','UPDATE,DELETE') audit_rewrite");
 if(acl[0].ddl||acl[0].ledger||acl[0].audit_rewrite)throw Error('RUNTIME_ACL_UNSAFE');
 phase='marker';const ready='pap-admin-beta:ready:'+createHash('sha256').update(raw).digest('hex');
 await client.query("SELECT format('COMMENT ON DATABASE pap_admin_beta IS %L',$1::text) AS statement",[ready]).then(async r=>client.query(r.rows[0].statement));
 console.log(`PASS Beta isolated identity, ${rows.length} migration checksums, roles and runtime ACL; web may start after manual provisioning.`);
}catch(error){const known=['BETA_IDENTITY_REQUIRED','MIGRATION_INTEGRITY_FAILED','IMAGE_MIGRATION_MISMATCH','PRIVILEGED_DATABASE_ROLE','DATABASE_ROLE_MEMBERSHIP_FORBIDDEN','RUNTIME_ACL_UNSAFE'];const code=known.includes(error?.message)?error.message:/^[A-Z0-9]{5}$/.test(error?.code||'')?error.code:'UNCLASSIFIED';console.error('BETA_VERIFY_FAILED '+code+' phase='+phase+': keep web stopped');process.exitCode=1;}finally{await client.end();}
