/** Local synthetic database only. Not imported by any production route. */
import {Pool} from 'pg';import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {initialDemo} from '../../src/features/vitrine-premium/lib/demo/data';
import {demoLedgerSchema,type DemoLedger} from '../../src/features/vitrine-premium/lib/pap-id';
export type Profile={kind:'PAP_ID_REVIEW_PG_V1';project:string;owner:string;database:string;user:string;password:string;port:number}
export async function readProfile(file:string):Promise<Profile>{
 const p=JSON.parse(await readFile(file,'utf8')) as Profile
 if(p.kind!=='PAP_ID_REVIEW_PG_V1'||!/^pap-id-review-[a-f0-9]{12}$/.test(p.project)||!/^pap_id_review_[a-f0-9]{12}$/.test(p.database)||p.user!=='review_owner'||!Number.isInteger(p.port)||p.port<1024||[5432,15436].includes(p.port)||!/^\w{64}$/.test(p.password)||!/^\w{32}$/.test(p.owner))throw Error('OWNED_PROFILE_REQUIRED')
 const info=JSON.parse(execFileSync('docker',['inspect',p.project+'-db'],{encoding:'utf8'}))[0]
 if(info.Config.Labels?.['pap.id.review.owner']!==p.owner||info.Config.Labels?.['com.docker.compose.project']!==p.project||(info.State.Running&&(info.NetworkSettings.Ports?.['5432/tcp']?.length!==1||info.NetworkSettings.Ports['5432/tcp'][0].HostIp!=='127.0.0.1'||Number(info.NetworkSettings.Ports['5432/tcp'][0].HostPort)!==p.port)))throw Error('RESOURCE_OWNERSHIP_FAILED')
 const mount=info.Mounts?.find((m:{Destination:string})=>m.Destination==='/var/lib/postgresql/data');if(mount?.Name!==p.project+'-data')throw Error('OWNED_VOLUME_REQUIRED')
 const volume=JSON.parse(execFileSync('docker',['volume','inspect',p.project+'-data'],{encoding:'utf8'}))[0];if(volume.Labels?.['pap.id.review.owner']!==p.owner)throw Error('VOLUME_OWNERSHIP_FAILED')
 return p
}
export function connect(p:Profile){return new Pool({host:'127.0.0.1',port:p.port,database:p.database,user:p.user,password:p.password,max:4,connectionTimeoutMillis:3000})}
export async function initialize(pool:Pool,p:Profile){
 if((await pool.query('select current_database() as name')).rows[0].name!==p.database)throw Error('WRONG_DATABASE')
 await pool.query(`CREATE TABLE IF NOT EXISTS review_meta (id boolean PRIMARY KEY DEFAULT true CHECK(id),owner text NOT NULL);
 CREATE TABLE IF NOT EXISTS review_people (subject uuid PRIMARY KEY, patient_id text UNIQUE NOT NULL, identity jsonb NOT NULL, revision integer NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS review_cards (hash text PRIMARY KEY CHECK(length(hash)=64), subject uuid NOT NULL REFERENCES review_people(subject), expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false, operation_id uuid UNIQUE NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS one_active_review_card ON review_cards(subject) WHERE NOT revoked;`)
 await pool.query('INSERT INTO review_meta(id,owner) VALUES(true,$1) ON CONFLICT DO NOTHING',[p.owner])
 if((await pool.query('SELECT owner FROM review_meta')).rows[0]?.owner!==p.owner)throw Error('DATABASE_OWNER_MISMATCH')
 for(const row of initialDemo().patients){const subject=randomUUID(),hex=subject.replaceAll('-','').slice(0,6).toUpperCase();await pool.query('INSERT INTO review_people(subject,patient_id,identity) VALUES($1,$2,$3) ON CONFLICT(patient_id) DO NOTHING',[subject,row.id,{subject,patientId:row.id,name:row.nome,birthDate:row.dataNascimento,document:row.cpf.replace(/\D/g,''),rg:{number:'DEMO-'+hex,uf:'PA',issuer:'DEMO'}}])}
}
export async function ledgers(pool:Pool):Promise<DemoLedger[]>{const people=(await pool.query('SELECT * FROM review_people ORDER BY patient_id')).rows;const result:DemoLedger[]=[];for(const p of people){const cards=(await pool.query('SELECT hash,expires_at,revoked FROM review_cards WHERE subject=$1 ORDER BY expires_at,hash',[p.subject])).rows;if(cards.length)result.push(demoLedgerSchema.parse({kind:'PAP_ID_DEMO_V1',revision:p.revision,patient:p.identity,cards:cards.map(c=>({hash:c.hash,expiresAt:c.expires_at.toISOString(),revoked:c.revoked}))}))}return result}
export async function issue(pool:Pool,patientId:string,operationId:string,token:string){
 if(!/^[a-z0-9-]{1,64}$/.test(patientId)||!/^\w{8}-\w{4}-4\w{3}-[89ab]\w{3}-\w{12}$/i.test(operationId)||!/^PAP-ID-DEMO-1\.[A-Za-z0-9_-]{43}$/.test(token))throw Error('INVALID_REQUEST')
 const hash=createHash('sha256').update(token).digest('hex'),db=await pool.connect()
 try{await db.query('BEGIN');const person=(await db.query('SELECT * FROM review_people WHERE patient_id=$1 FOR UPDATE',[patientId])).rows[0];if(!person)throw Error('UNKNOWN_SYNTHETIC_PERSON')
 const prior=(await db.query('SELECT subject,hash FROM review_cards WHERE operation_id=$1',[operationId])).rows[0]
 if(prior){if(prior.hash!==hash||prior.subject!==person.subject)throw Error('OPERATION_CONFLICT')}else{const count=Number((await db.query('SELECT count(*) FROM review_cards WHERE subject=$1',[person.subject])).rows[0].count);if(count>=50)throw Error('LOCAL_HISTORY_LIMIT');await db.query('UPDATE review_cards SET revoked=true WHERE subject=$1 AND NOT revoked',[person.subject]);await db.query(`INSERT INTO review_cards(hash,subject,expires_at,operation_id) VALUES($1,$2,now()+interval '24 hours',$3)`,[hash,person.subject,operationId]);await db.query('UPDATE review_people SET revision=revision+1 WHERE subject=$1',[person.subject])}
 await db.query('COMMIT');return (await ledgers(pool)).find(l=>l.patient.subject===person.subject)!
 }catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}
}
export async function revoke(pool:Pool,subject:string){const db=await pool.connect();try{await db.query('BEGIN');const row=await db.query('SELECT subject FROM review_people WHERE subject=$1 FOR UPDATE',[subject]);if(!row.rowCount)throw Error('UNKNOWN_SYNTHETIC_PERSON');await db.query('UPDATE review_cards SET revoked=true WHERE subject=$1 AND NOT revoked',[subject]);await db.query('UPDATE review_people SET revision=revision+1 WHERE subject=$1',[subject]);await db.query('COMMIT')}catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}}
