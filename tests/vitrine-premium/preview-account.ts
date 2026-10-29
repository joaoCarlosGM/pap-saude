// Test-only fixture, available solely in the guarded disposable preview harness.
import {execFileSync} from 'node:child_process'
import {writeFile} from 'node:fs/promises'
import {db} from '../../src/server/db/client'
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service'
import {assignSystemRole} from '../../src/server/iam/role-assignment.service'
import {fixture} from '../first-access/fixtures'
async function main(){
if(new URL(process.env.DATABASE_URL!).pathname!=='/pap_p0_full_tests'||!process.env.PAP_PREMIUM_CREDENTIAL_FILE?.startsWith('/tmp/pap-premium2-preview-'))throw Error('Disposable preview only')
const container=process.env.PAP_PREMIUM_OWNER_CONTAINER,owner=process.env.PAP_PREMIUM_OWNER_ID
if(!container||!owner)throw Error('Ownership required')
const observed=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0]
const binding=observed.NetworkSettings.Ports['5432/tcp'][0],url=new URL(process.env.DATABASE_URL!)
if(observed.Config.Labels['pap.owner']!==owner||observed.Config.Labels['pap.disposable']!=='premium2-integration'||binding.HostIp!=='127.0.0.1'||binding.HostPort!==url.port||url.hostname!=='127.0.0.1')throw Error('Disposable ownership mismatch')
try{await bootstrapSystemIam();const f=await fixture();await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await assignSystemRole({userId:f.user.id,roleKey:'COMMERCIAL'});await writeFile(process.env.PAP_PREMIUM_CREDENTIAL_FILE,JSON.stringify({email:f.user.email,password:f.password,note:'Disposable synthetic account. Enroll your own TOTP through the normal browser flow.'},null,2),{mode:0o600})}finally{await db.$disconnect()}

}
void main().catch(()=>{console.error("Owned preview fixture setup failed; inspect private test log.");process.exitCode=1})
