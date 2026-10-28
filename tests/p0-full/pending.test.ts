import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {db} from "../../src/server/db/client";
import {bootstrapSystemIam} from "../../src/server/iam/bootstrap.service";
import {actor,request} from "../mission04-b/fixtures";
import {pendingWork} from "../../src/server/admin-pending/pending.service";
import {GET} from "../../src/app/api/admin/pending/route";
import {createSession} from "../../src/server/auth/session.service";
import {sha256} from "../../src/server/security/crypto";
before(async()=>{assert.equal(new URL(process.env.DATABASE_URL!).pathname,"/pap_p0_full_tests");await bootstrapSystemIam();});after(()=>db.$disconnect());
test("pending queue excludes sent invitations and scopes Manager to own accepted Commercial grants",async()=>{
 const admin=await actor(),manager=await actor("PAP_MANAGER"),other=await actor("PAP_MANAGER");
 async function invitation(sender:string,role:string,status:"PENDING_ASSIGNMENT"|"PENDING_ACCEPTANCE"="PENDING_ASSIGNMENT") { const user=await db.user.create({data:{email:`${randomUUID()}@synthetic.invalid`,displayName:"Pessoa convidada sintética"}});return db.accessInvitation.create({data:{email:user.email,displayName:user.displayName,proposedRoleKey:role,status,invitedByUserId:sender,expiresAt:new Date(Date.now()+86400000),...(status==='PENDING_ASSIGNMENT'?{userId:user.id,acceptedAt:new Date()}:{tokenHash:sha256(randomUUID())})}}); }
 const own=await invitation(manager.user.id,'COMMERCIAL'),foreign=await invitation(other.user.id,'COMMERCIAL'),escalation=await invitation(manager.user.id,'PAP_MANAGER'),sent=await invitation(manager.user.id,'COMMERCIAL','PENDING_ACCEPTANCE');
 const m=await pendingWork(manager.user.id,manager.token);assert.ok(m.rows.some(r=>r.id===own.id));assert.ok(m.rows.every(r=>![foreign.id,escalation.id,sent.id].includes(r.id)));const all=await pendingWork(admin.user.id,admin.token);assert.ok(all.rows.some(r=>r.id===foreign.id));assert.ok(all.rows.every(r=>r.id!==sent.id));
 const before=await db.roleAssignment.count();await pendingWork(manager.user.id,manager.token);assert.equal(await db.roleAssignment.count(),before);await assert.rejects(pendingWork(manager.user.id,manager.token,0));await assert.rejects(pendingWork(manager.user.id,manager.token,1,'unknown'));
});
test("only PAP Admin sees activation work, queue is visible without a filter and primary sessions fail",async()=>{
 const admin=await actor(),manager=await actor("PAP_MANAGER");async function candidate(status:"NEW"|"READY_FOR_ACTIVATION"){const key=randomUUID();return db.organizationCandidate.create({data:{name:`UBS sintética ${key}`,normalizedName:key,dedupeKey:key,type:"HEALTH_UNIT",status,consentedAt:new Date()}});}
 const review=await candidate('NEW'),ready=await candidate('READY_FOR_ACTIVATION');const m=await pendingWork(manager.user.id,manager.token);assert.ok(m.rows.some(r=>r.id===review.id));assert.ok(!m.rows.some(r=>r.id===ready.id));const a=await pendingWork(admin.user.id,admin.token);assert.ok(a.rows.some(r=>r.id===ready.id));assert.ok(a.counts.some(c=>c.kind==='ACTIVATE'&&c.total>0));
 const primary=await createSession({userId:admin.user.id});await assert.rejects(pendingWork(admin.user.id,primary.token));assert.equal((await GET(request('/api/admin/pending',primary.token))).status,403);assert.equal((await GET(request('/api/admin/pending?page=-1',admin.token))).status,400);assert.equal((await GET(request('/api/admin/pending?page=1&page=2',admin.token))).status,400);
});
test("accepted invitation notifies only valid decision-makers, replay creates no duplicate and revoked roles see no work",async()=>{
 const admin=await actor(),manager=await actor('PAP_MANAGER'),foreign=await actor('PAP_MANAGER');const {acceptAccessInvitation,hashAccessToken}=await import('../../src/server/access-invitations/access-invitation.service');const {randomBytes}=await import('node:crypto');const bearer=randomBytes(32).toString('base64url');const row=await db.accessInvitation.create({data:{email:`${randomUUID()}@synthetic.invalid`,displayName:'Identidade sintética pendente',proposedRoleKey:'COMMERCIAL',invitedByUserId:manager.user.id,tokenHash:hashAccessToken(bearer),expiresAt:new Date(Date.now()+600000)}});
 await acceptAccessInvitation({token:bearer,password:'Synthetic-acceptance-password-92!'});const notices=await db.userNotification.findMany({where:{invitationId:row.id,kind:'ACCESS_PENDING_DECISION'}});assert.ok(notices.some(n=>n.userId===admin.user.id));assert.ok(notices.some(n=>n.userId===manager.user.id));assert.ok(notices.every(n=>n.userId!==foreign.user.id));const before=notices.length;await assert.rejects(acceptAccessInvitation({token:bearer,password:'Synthetic-acceptance-password-92!'}));assert.equal(await db.userNotification.count({where:{invitationId:row.id}}),before);
 await db.roleAssignment.deleteMany({where:{userId:manager.user.id}});await assert.rejects(pendingWork(manager.user.id,manager.token));
});
test("network detail keeps Manager on public directory and denies private people across units",async()=>{
 const admin=await actor(),manager=await actor('PAP_MANAGER');const {networkUnit}=await import('../../src/server/admin-pending/network.service');const m=await networkUnit(manager.user.id,manager.token,admin.unit.id);assert.equal(m.canReadPeople,false);assert.deepEqual(m.people,[]);const a=await networkUnit(admin.user.id,admin.token,admin.unit.id);assert.equal(a.canReadPeople,true);
});
test("keyset pagination has no duplication at equal timestamps and notification focus stays authorized",async()=>{
 const manager=await actor('PAP_MANAGER'),other=await actor('PAP_MANAGER'),time=new Date();
 await db.accessInvitation.createMany({data:Array.from({length:23},()=>({id:randomUUID(),email:`${randomUUID()}@synthetic.invalid`,displayName:'Fila sintética paginada',proposedRoleKey:'COMMERCIAL',status:'PENDING_ASSIGNMENT' as const,invitedByUserId:manager.user.id,userId:other.user.id,expiresAt:new Date(Date.now()+600000),acceptedAt:time,createdAt:time}))});
 const one=await pendingWork(manager.user.id,manager.token,1,'ASSIGN');assert.equal(one.rows.length,20);assert.equal(one.total,23);assert.ok(one.nextCursor);const two=await pendingWork(manager.user.id,manager.token,2,'ASSIGN',one.nextCursor!);assert.equal(two.rows.length,3);assert.equal(new Set([...one.rows,...two.rows].map(r=>r.id)).size,23);assert.equal(two.nextCursor,null);
 const id=two.rows[0].id;assert.equal((await pendingWork(manager.user.id,manager.token,1,'ASSIGN',undefined,id)).rows[0].id,id);assert.deepEqual((await pendingWork(other.user.id,other.token,1,'ASSIGN',undefined,id)).rows,[]);
});
