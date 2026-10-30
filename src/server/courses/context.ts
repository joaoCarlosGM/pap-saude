import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {db} from '@/server/db/client';
import {validateSession} from '@/server/auth/session.service';
import {requireOperationalMfa} from '@/server/auth/operational-mfa.service';
import {requirePermission} from '@/server/iam/authorization.service';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
import {betaRateLimit} from '@/server/admin-beta/policy';
import type {PermissionKey} from '@/server/iam/permissions';
export class CourseError extends Error{constructor(public code:string,public status=400){super(code);this.name='CourseError';}}
export function fail(code:string,status=400):never{throw new CourseError(code,status);}
function canonical(value:unknown):unknown{if(value instanceof Date)return value.toISOString();if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)]));return value;}
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export async function withCourseActor<T>(token:string,action:(tx:Prisma.TransactionClient,userId:string)=>Promise<T>){
 const preliminary=await validateSession(token,{updateLastSeen:false});
 return courseTransaction(async tx=>{
  const id=preliminary.user.id;
  // Hold the authorization inputs until commit. Concurrent revocation/suspension
  // serializes before or after this operation, never between check and write.
  await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM sessions WHERE id=${preliminary.session.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM mfa_factors WHERE "userId"=${id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM role_assignments WHERE "userId"=${id} FOR SHARE`;
  await tx.$queryRaw`SELECT "roleId" FROM role_permissions WHERE "roleId" IN (SELECT "roleId" FROM role_assignments WHERE "userId"=${id}) FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM memberships WHERE "userId"=${id} FOR SHARE`;
  const actor=await validateSession(token,{updateLastSeen:false,client:tx});await requireOperationalMfa(actor,tx);
  const result=await action(tx,id);await validateSession(token,{updateLastSeen:false,client:tx});return result;
 });
}
export async function coursePermission(tx:Prisma.TransactionClient,userId:string,permission:PermissionKey,organizationId?:string){
 if(organizationId){await tx.$queryRaw`SELECT id FROM organizations WHERE id=${organizationId} OR id=(SELECT "parentId" FROM organizations WHERE id=${organizationId}) OR id=(SELECT "parentId" FROM organizations WHERE id=(SELECT "parentId" FROM organizations WHERE id=${organizationId})) FOR SHARE`;const org=await tx.organization.findUnique({where:{id:organizationId},include:{parent:{include:{parent:true}}}});if(!org?.isActive||org.status!=='ACTIVE'||(org.parent&&(!org.parent.isActive||org.parent.status!=='ACTIVE'))||(org.parent?.parent&&(!org.parent.parent.isActive||org.parent.parent.status!=='ACTIVE')))fail('COURSE_SCOPE_UNAVAILABLE',403);}
 await requirePermission({userId,permission,organizationId},tx);
}
export async function requireUnit(tx:Prisma.TransactionClient,userId:string,organizationId:string,permission:PermissionKey){
 await coursePermission(tx,userId,permission,organizationId);
 const profile=await getEffectiveAccessProfile(userId,tx);
 if(!profile?.roles.some(r=>r.key==='HEALTH_UNIT_ADMIN'&&r.scope==='HEALTH_UNIT'&&r.organization?.id===organizationId&&r.permissions.includes(permission)))fail('COURSE_UNIT_PERMISSION_REQUIRED',403);
}
export async function audit(tx:Prisma.TransactionClient,userId:string,action:string,resourceId:string,organizationId?:string,metadata?:Prisma.InputJsonValue){return tx.auditEvent.create({data:{actorUserId:userId,action:'COURSE_'+action,resourceType:'COURSE',resourceId,organizationId,metadata}});}
export async function denyAudit(token:string,code:string){try{const actor=await validateSession(token,{updateLastSeen:false});await db.auditEvent.create({data:{actorUserId:actor.user.id,action:'COURSE_OPERATION_DENIED',resourceType:'COURSE',outcome:'FAILURE',reason:code}});}catch{/* Never disclose tokens or mask the original refusal. */}}
export async function courseWriteLimit(token:string){const actor=await validateSession(token,{updateLastSeen:false});await betaRateLimit('course-write',actor.user.id,300);}

async function courseTransaction<T>(action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<5;attempt++){
  try{return await db.$transaction(action,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});}
  catch(error){const retryable=error instanceof Prisma.PrismaClientKnownRequestError&&(["P2034","P2002"].includes(error.code)||(error.code==="P2010"&&(["40001","40P01"].includes(String(error.meta?.code))||/Raw query failed\. Code: `(?:40001|40P01)`/.test(error.message))));if(!retryable)throw error;if(attempt===4)fail("COURSE_CONCURRENT_OPERATION_RETRY",409);await new Promise(resolve=>setTimeout(resolve,10*(attempt+1)));}
 }
 return fail("COURSE_CONCURRENT_OPERATION_RETRY",409);
}
