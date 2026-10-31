import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {db} from '../../src/server/db/client';
import {bootstrapSystemIam} from '../../src/server/iam/bootstrap.service';
import {commercialIdentity,notificationFor} from './fixtures';
import {request} from '../mission04-b/fixtures';
import {createSession} from '../../src/server/auth/session.service';
import * as profile from '../../src/app/api/account/profile/route';
import * as notifications from '../../src/app/api/account/notifications/route';
let own:Awaited<ReturnType<typeof commercialIdentity>>,other:typeof own;
before(async()=>{const url=new URL(process.env.DATABASE_URL!);assert.equal(url.pathname,'/pap_beta1_test');assert.equal(url.hostname,'127.0.0.1');await bootstrapSystemIam();own=await commercialIdentity();other=await commercialIdentity();});
after(()=>db.$disconnect());
test('own profile uses persisted identity and audited name editing without changing grants',async()=>{
 const response=await profile.GET(request('/api/account/profile',own.token));assert.equal(response.status,200);const body=await response.json();assert.equal(body.id,own.user.id);assert.equal(body.email,own.user.email);assert.ok(!('passwordHash' in body));
 const grants=JSON.stringify(await db.roleAssignment.findMany({where:{userId:own.user.id},orderBy:{id:'asc'}}));
 const updated=await profile.PATCH(request('/api/account/profile',own.token,{displayName:'Nome Comercial de Teste'},'PATCH'));assert.equal(updated.status,200);
 assert.equal((await db.user.findUniqueOrThrow({where:{id:own.user.id}})).displayName,'Nome Comercial de Teste');assert.equal((await db.user.findUniqueOrThrow({where:{id:other.user.id}})).displayName,other.user.displayName);assert.equal(JSON.stringify(await db.roleAssignment.findMany({where:{userId:own.user.id},orderBy:{id:'asc'}})),grants);
 assert.equal(await db.auditEvent.count({where:{actorUserId:own.user.id,action:'OWN_PROFILE_UPDATED'}}),1);
 for(const extra of [{userId:other.user.id},{roleKey:'PAP_ADMIN'}])assert.equal((await profile.PATCH(request('/api/account/profile',own.token,{displayName:'Outro Nome',...extra},'PATCH'))).status,400);
 const primary=await createSession({userId:own.user.id});assert.equal((await profile.GET(request('/api/account/profile',primary.token))).status,403);assert.equal((await profile.PATCH(request('/api/account/profile',own.token,{displayName:'Outro Nome'},'PATCH',{origin:'https://untrusted.invalid'}))).status,403);
});
test('notifications list and read operations are real and limited to the current identity',async()=>{
 const mine=await notificationFor(own),foreign=await notificationFor(other);
 const response=await notifications.GET(request('/api/account/notifications',own.token));assert.equal(response.status,200);const body=await response.json();assert.equal(body.unread,1);assert.deepEqual(body.notifications.map((n:{id:string})=>n.id),[mine.id]);
 assert.equal((await notifications.PATCH(request('/api/account/notifications',own.token,{id:foreign.id},'PATCH'))).status,404);
 assert.equal((await notifications.PATCH(request('/api/account/notifications',own.token,{id:mine.id},'PATCH'))).status,200);
 assert.ok((await db.userNotification.findUniqueOrThrow({where:{id:mine.id}})).readAt);assert.equal((await db.userNotification.findUniqueOrThrow({where:{id:foreign.id}})).readAt,null);
 assert.equal((await notifications.PATCH(request('/api/account/notifications',own.token,{id:mine.id,userId:other.user.id},'PATCH'))).status,400);
});
