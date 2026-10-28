import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor,request} from '../mission04-b/fixtures';
import {issuePasswordReset} from '../../src/server/auth/password-security.service';
import {POST} from '../../src/app/api/auth/password/reset/route';
import {authenticateLogin} from '../../src/server/auth/login.service';
before(async()=>{assert.equal(new URL(process.env.DATABASE_URL!).pathname,'/pap_p0_full_tests');await bootstrapSystemIam();});after(()=>db.$disconnect());
test('reset HTTP requires matching confirmation without spending token on mismatch, preserves MFA and rejects replay',async()=>{
 const f=await actor('COMMERCIAL');const factors=await db.mfaFactor.findMany({where:{userId:f.user.id}});let token='';await issuePasswordReset({email:f.user.email,origin:'p0-full-reset-http',deliver:async(_email,value)=>{token=value;}});assert.ok(token);const password='Synthetic-reset-new-password-920!';
 for(const extra of [{},{confirmPassword:'Synthetic-mismatch-password-92!'},{confirmPassword:password,userId:'forbidden'}])assert.equal((await POST(request('/api/auth/password/reset',undefined,{token,newPassword:password,...extra}))).status,400);
 assert.equal((await POST(request('/api/auth/password/reset',undefined,{token,newPassword:password,confirmPassword:password}))).status,200);
 assert.equal((await POST(request('/api/auth/password/reset',undefined,{token,newPassword:password,confirmPassword:password}))).status,400);assert.deepEqual(await db.mfaFactor.findMany({where:{userId:f.user.id}}),factors);assert.equal((await authenticateLogin({email:f.user.email,password,origin:'p0-full-reset-http-login'})).status,'MFA_REQUIRED');
});
