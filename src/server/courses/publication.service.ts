import type {Prisma} from '@prisma/client';
import {releaseSchema} from '@/lib/courses/schema';
import {PERMISSIONS} from '@/server/iam/permissions';
import {authorize} from '@/server/iam/authorization.service';
import {withCourseActor,coursePermission,audit,fail} from './context';
import {ownedVersion} from './authoring.service';
export async function courseNotification(tx:Prisma.TransactionClient,userId:string,kind:string,resourceId:string,actorUserId:string){
 const dedupeKey=`course/${kind}/${resourceId}/${userId}`;
 const existing=await tx.userNotification.findUnique({where:{dedupeKey}});if(existing)return existing;
 const notification=await tx.userNotification.create({data:{userId,kind,dedupeKey,emailStatus:'NOT_REQUESTED',...(kind==='COURSE_RELEASED_TO_UNIT'?{coursePublicationId:resourceId}:{courseEnrollmentId:resourceId})}});
 // No transport confirmation: local in-app persistence only, external email untouched.
 await audit(tx,actorUserId,'NOTIFICATION_CREATED',notification.id);return notification;
}
export async function eligibleAudience(tx:Prisma.TransactionClient,publicationId:string,organizationId:string){
 const unit=await tx.organization.findUnique({where:{id:organizationId},include:{parent:true}});
 if(!unit||unit.type!=='HEALTH_UNIT'||!unit.isActive||unit.status!=='ACTIVE'||!unit.parent?.isActive||unit.parent.status!=='ACTIVE')return false;
 return !!await tx.courseAudience.findFirst({where:{publicationId,revokedAt:null,organizationId:{in:[unit.id,unit.parentId!]}}});
}
export async function editorOrganizations(token:string){return withCourseActor(token,async(tx,userId)=>{
 await coursePermission(tx,userId,PERMISSIONS.COURSE_DISTRIBUTE);
 return tx.organization.findMany({where:{isActive:true,status:'ACTIVE',type:{in:['MUNICIPALITY','HEALTH_UNIT']}},select:{id:true,name:true,type:true,parentId:true},orderBy:[{name:'asc'},{id:'asc'}],take:500});
 });}
export async function releaseCourse(token:string,id:string,input:unknown,municipal=false){const payload=releaseSchema.parse(input);return withCourseActor(token,async(tx,userId)=>{
 const pub=await tx.coursePublication.findUnique({where:{id},include:{version:true}});if(!pub||pub.revokedAt||pub.archivedAt)fail('COURSE_PUBLICATION_UNAVAILABLE',404);
 await tx.$queryRaw`SELECT id FROM course_publications WHERE id=${id} FOR UPDATE`;
 if(!municipal)await ownedVersion(tx,userId,pub.courseVersionId,PERMISSIONS.COURSE_DISTRIBUTE);
 let released=0;
 for(const organizationId of [...new Set(payload.organizationIds)].sort()){
  const org=await tx.organization.findUnique({where:{id:organizationId},include:{parent:true}});if(!org||!['MUNICIPALITY','HEALTH_UNIT'].includes(org.type))fail('COURSE_SCOPE_UNAVAILABLE',403);
  await coursePermission(tx,userId,municipal?PERMISSIONS.COURSE_FORWARD:PERMISSIONS.COURSE_DISTRIBUTE,organizationId);
  if(municipal){if(org.type!=='HEALTH_UNIT'||!org.parentId||!await tx.courseAudience.findFirst({where:{publicationId:id,organizationId:org.parentId,revokedAt:null}}))fail('COURSE_SCOPE_UNAVAILABLE',403);}
  const existing=await tx.courseAudience.findUnique({where:{publicationId_organizationId:{publicationId:id,organizationId}}});if(existing?.revokedAt)fail('COURSE_AUDIENCE_REVOKED',409);if(existing)continue;
  await tx.courseAudience.create({data:{publicationId:id,organizationId,releasedBy:userId}});released++;
  const units=org.type==='HEALTH_UNIT'?[org]:await tx.organization.findMany({where:{parentId:org.id,type:'HEALTH_UNIT',status:'ACTIVE',isActive:true}});
  for(const unit of units){const members=await tx.membership.findMany({where:{organizationId:unit.id,status:'ACTIVE',user:{isActive:true}},select:{userId:true},take:1000});for(const member of members)if((await authorize({userId:member.userId,permission:PERMISSIONS.COURSE_ASSIGN,organizationId:unit.id},tx)).allowed)await courseNotification(tx,member.userId,'COURSE_RELEASED_TO_UNIT',id,userId);}
 }
 if(released)await audit(tx,userId,'RELEASED',id,undefined,{organizationIds:payload.organizationIds});return {released,alreadyAvailable:payload.organizationIds.length-released};
 });}
export async function withdrawPublication(token:string,id:string,action:'ARCHIVE'|'REVOKE'){return withCourseActor(token,async(tx,userId)=>{
 await tx.$queryRaw`SELECT id FROM course_publications WHERE id=${id} FOR UPDATE`;
 const pub=await tx.coursePublication.findUnique({where:{id}});if(!pub)fail('COURSE_NOT_FOUND',404);await ownedVersion(tx,userId,pub.courseVersionId,PERMISSIONS.COURSE_PUBLISH);
 const changed=await tx.coursePublication.updateMany({where:{id,...(action==='REVOKE'?{revokedAt:null}:{archivedAt:null})},data:action==='REVOKE'?{revokedAt:new Date()}:{archivedAt:new Date()}});if(changed.count)await audit(tx,userId,action,id);return {status:action};
 });}
export async function editorDistribution(token:string){return withCourseActor(token,async(tx,userId)=>{
 await coursePermission(tx,userId,PERMISSIONS.COURSE_DISTRIBUTE);
 const profile=(await import('@/server/iam/effective-access-profile.service')).getEffectiveAccessProfile;const access=await profile(userId,tx),admin=access?.roles.some(r=>r.key==='PAP_ADMIN'&&r.scope==='GLOBAL');
 const rows=await tx.coursePublication.findMany({where:admin?{}:{version:{course:{creatorUserId:userId}}},select:{id:true,publishedAt:true,archivedAt:true,revokedAt:true,version:{select:{title:true,versionNo:true}},audiences:{where:{revokedAt:null},select:{organization:{select:{id:true,name:true,type:true}},releasedAt:true}},_count:{select:{assignments:true}}},orderBy:[{publishedAt:'desc'},{id:'asc'}],take:50});
 return rows.map(p=>({id:p.id,title:p.version.title,versionNo:p.version.versionNo,publishedAt:p.publishedAt,status:p.revokedAt?'Revogada':p.archivedAt?'Arquivada':'Disponível',audiences:p.audiences.map(a=>({organization:a.organization.name,type:a.organization.type,releasedAt:a.releasedAt})),assignments:p._count.assignments}));
 });}
