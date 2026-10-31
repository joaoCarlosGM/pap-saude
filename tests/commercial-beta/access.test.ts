import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {actor,request} from '../mission04-b/fixtures';
import {createSession} from '../../src/server/auth/session.service';
import {requireCommercialSession,CommercialAccessError} from '../../src/server/demo/commercial-access.service';
import {resolveLoginNavigation} from '../../src/server/auth/login-navigation.service';
import {navigationFingerprint} from '../first-access/login-fixtures';
import {GET as organizations} from '../../src/app/api/admin/organizations/route';
import {GET as clinical} from '../../src/app/api/clinical/[[...path]]/route';
import {POST as logout} from '../../src/app/api/auth/logout/route';
let commercial:Awaited<ReturnType<typeof actor>>;
before(async()=>{const url=new URL(process.env.DATABASE_URL!);assert.equal(url.pathname,'/pap_beta1_test');assert.equal(url.hostname,'127.0.0.1');assert.ok(!['5432','15436'].includes(url.port));await bootstrapSystemIam();commercial=await actor('COMMERCIAL');});
after(()=>db.$disconnect());
test('real verified global Commercial enters workspace destination without repeating onboarding',async()=>{
 const before=await navigationFingerprint(commercial.user.id);assert.equal((await requireCommercialSession(commercial.token)).userId,commercial.user.id);
 assert.deepEqual(await resolveLoginNavigation(commercial.token,undefined),{view:'REDIRECT',destination:'/comercial'});assert.equal(await navigationFingerprint(commercial.user.id),before);
});
test('unauthenticated, primary and revoked MFA sessions never acquire operational commercial access',async()=>{
 await assert.rejects(requireCommercialSession(undefined),e=>e instanceof CommercialAccessError&&e.status===401);
 const primary=await createSession({userId:commercial.user.id});await assert.rejects(requireCommercialSession(primary.token),e=>e instanceof CommercialAccessError&&e.status===403);
 assert.deepEqual(await resolveLoginNavigation(primary.token,undefined),{view:'REDIRECT',destination:'/primeiros-passos'});
 const revoked=await actor('COMMERCIAL');await db.mfaFactor.updateMany({where:{userId:revoked.user.id},data:{status:'REVOKED',revokedAt:new Date()}});await assert.rejects(requireCommercialSession(revoked.token),CommercialAccessError);
});
test('Admin and Manager do not gain Commercial implicitly; scoped or permissionless Commercial is denied',async()=>{
 for(const role of ['PAP_ADMIN','PAP_MANAGER'] as const)await assert.rejects(requireCommercialSession((await actor(role)).token),CommercialAccessError);
 const scoped=await actor('COMMERCIAL');await db.roleAssignment.updateMany({where:{userId:scoped.user.id},data:{organizationId:scoped.unit.id}});await assert.rejects(requireCommercialSession(scoped.token),CommercialAccessError);
 const role=await db.role.findUniqueOrThrow({where:{key:'COMMERCIAL'}}),permission=await db.permission.findUniqueOrThrow({where:{key:'commercial.read'}});
 await db.rolePermission.deleteMany({where:{roleId:role.id,permissionId:permission.id}});try{await assert.rejects(requireCommercialSession(commercial.token),CommercialAccessError);}finally{await db.rolePermission.create({data:{roleId:role.id,permissionId:permission.id}});}
});
test('Commercial has no clinical or administrative API permission and logout terminates login navigation',async()=>{
 assert.equal((await organizations(request('/api/admin/organizations',commercial.token))).status,403);
 assert.equal((await clinical(request('/api/clinical/patients',commercial.token,undefined,'GET',{'x-organization-id':commercial.unit.id}),{params:Promise.resolve({path:['patients']})})).status,403);
 const disposable=await actor('COMMERCIAL');assert.equal((await logout(request('/api/auth/logout',disposable.token,{}))).status,204);
 await assert.rejects(requireCommercialSession(disposable.token),CommercialAccessError);assert.deepEqual(await resolveLoginNavigation(disposable.token,undefined),{view:'LOGIN'});
});
