import {Prisma} from '@prisma/client';
import {assignmentSchema} from '@/lib/courses/schema';
import {PERMISSIONS} from '@/server/iam/permissions';
import {authorize} from '@/server/iam/authorization.service';
import {withCourseActor,coursePermission,requireUnit,audit,fail} from './context';
import {eligibleAudience,courseNotification} from './publication.service';
export async function availableCourses(token:string,organizationId:string){return withCourseActor(token,async(tx,userId)=>{
 await coursePermission(tx,userId,PERMISSIONS.COURSE_READ,organizationId);
 const unit=await tx.organization.findUnique({where:{id:organizationId}});if(!unit||unit.type!=='HEALTH_UNIT')fail('COURSE_SCOPE_UNAVAILABLE',403);
 const pubs=await tx.coursePublication.findMany({where:{archivedAt:null,revokedAt:null,version:{course:{archivedAt:null}},audiences:{some:{revokedAt:null,organizationId:{in:[unit.id,...(unit.parentId?[unit.parentId]:[])]}}}},include:{version:{include:{modules:{include:{lessons:{select:{id:true}}}}}}},orderBy:[{publishedAt:'desc'},{id:'desc'}],take:50});
 return pubs.map(p=>({id:p.id,versionId:p.courseVersionId,title:p.version.title,description:p.version.description,category:p.version.category,thumbnail:p.version.thumbnail,estimatedMinutes:p.version.estimatedMinutes,lessonCount:p.version.modules.reduce((n,m)=>n+m.lessons.length,0),versionNo:p.version.versionNo}));
 });}
export async function eligibleMembers(tx:Prisma.TransactionClient,userId:string,organizationId:string){
 await requireUnit(tx,userId,organizationId,PERMISSIONS.COURSE_ASSIGN);
 const rows=await tx.membership.findMany({where:{organizationId,status:'ACTIVE',userId:{not:userId},user:{isActive:true,roleAssignments:{some:{organizationId,role:{key:'PROFESSIONAL',system:true}}}}},select:{userId:true,user:{select:{displayName:true}}},orderBy:{userId:'asc'},take:1001});
 if(rows.length>1000)fail('COURSE_TEAM_TOO_LARGE');
 const result=[];for(const row of rows)if((await authorize({userId:row.userId,permission:PERMISSIONS.COURSE_PROGRESS_OWN_READ,organizationId},tx)).allowed)result.push({id:row.userId,name:row.user.displayName});return result;
}
export async function unitMembers(token:string,organizationId:string){return withCourseActor(token,(tx,userId)=>eligibleMembers(tx,userId,organizationId));}
export async function assignCourse(token:string,input:unknown){const payload=assignmentSchema.parse(input);return withCourseActor(token,async(tx,userId)=>{
 const eligible=await eligibleMembers(tx,userId,payload.organizationId),recipients=payload.all?eligible.map(m=>m.id):[...new Set(payload.userIds)];if(!recipients.length||recipients.some(id=>!eligible.some(m=>m.id===id)))fail('COURSE_RECIPIENT_NOT_ELIGIBLE',403);
 await tx.$queryRaw`SELECT id FROM course_publications WHERE id=${payload.publicationId} FOR SHARE`;
 const pub=await tx.coursePublication.findUnique({where:{id:payload.publicationId},include:{version:{include:{course:true}}}});if(!pub||pub.archivedAt||pub.revokedAt||pub.version.course.archivedAt||!await eligibleAudience(tx,payload.publicationId,payload.organizationId))fail('COURSE_PUBLICATION_UNAVAILABLE',403);
 const deadline=payload.deadlineAt?new Date(payload.deadlineAt):null;
 let assigned=0,alreadyAssigned=0;const enrollmentIds:string[]=[];
 for(const recipient of recipients.sort()){
  await tx.$queryRaw`SELECT id FROM users WHERE id=${recipient} FOR SHARE`;await tx.$queryRaw`SELECT id FROM memberships WHERE "userId"=${recipient} AND "organizationId"=${payload.organizationId} FOR SHARE`;await tx.$queryRaw`SELECT id FROM role_assignments WHERE "userId"=${recipient} FOR SHARE`;await tx.$queryRaw`SELECT "roleId" FROM role_permissions WHERE "roleId" IN (SELECT "roleId" FROM role_assignments WHERE "userId"=${recipient}) FOR SHARE`;
  if(!(await authorize({userId:recipient,permission:PERMISSIONS.COURSE_PROGRESS_OWN_READ,organizationId:payload.organizationId},tx)).allowed)fail('COURSE_RECIPIENT_NOT_ELIGIBLE',403);
  const key={publicationId:payload.publicationId,organizationId:payload.organizationId,professionalUserId:recipient},existing=await tx.courseAssignment.findUnique({where:{publicationId_organizationId_professionalUserId:key},include:{enrollment:true}});
  if(existing){if(existing.revokedAt)fail('COURSE_ASSIGNMENT_REVOKED',409);if(existing.obligation!==payload.obligation||existing.deadlineAt?.toISOString()!==deadline?.toISOString())fail('COURSE_ASSIGNMENT_CONFLICT',409);alreadyAssigned++;if(existing.enrollment)enrollmentIds.push(existing.enrollment.id);continue;}
  if(deadline&&deadline<=new Date())fail('COURSE_DEADLINE_MUST_BE_FUTURE');
  const assignment=await tx.courseAssignment.create({data:{...key,assignedBy:userId,obligation:payload.obligation,deadlineAt:deadline,enrollment:{create:{learnerUserId:recipient,courseVersionId:pub.courseVersionId}}},include:{enrollment:true}});
  const enrollment=assignment.enrollment!;await courseNotification(tx,recipient,'COURSE_ASSIGNED_TO_USER',enrollment.id,userId);await tx.courseAssignment.update({where:{id:assignment.id},data:{notifiedAt:new Date()}});await audit(tx,userId,'ASSIGNED',enrollment.id,payload.organizationId,{recipientUserId:recipient,publicationId:pub.id,obligation:payload.obligation,deadlineAt:deadline?.toISOString()??null});assigned++;enrollmentIds.push(enrollment.id);
 }
 return {assigned,alreadyAssigned,enrollmentIds};
 });}
export async function unitProgress(token:string,organizationId:string,page=1,filter:{status?:string;name?:string;deadline?:string}={}){return withCourseActor(token,async(tx,userId)=>{
 await requireUnit(tx,userId,organizationId,PERMISSIONS.COURSE_PROGRESS_UNIT_READ);if(!Number.isInteger(page)||page<1||page>10000)fail('COURSE_INVALID_PAGE');
 const status=filter.status||'ALL',deadline=filter.deadline||'ALL',name=(filter.name||'').trim();if(!['ALL','PENDING','COMPLETED'].includes(status)||!['ALL','OVERDUE','SOON'].includes(deadline)||name.length>120)fail('COURSE_INVALID_FILTER');const now=new Date();
 const where:Prisma.CourseEnrollmentWhereInput={assignment:{organizationId,...(status==='PENDING'||deadline!=='ALL'?{revokedAt:null}:{}),...(deadline==='OVERDUE'?{deadlineAt:{lt:now}}:deadline==='SOON'?{deadlineAt:{gte:now,lte:new Date(now.getTime()+7*86400000)}}:{})},...(status==='COMPLETED'?{completedAt:{not:null}}:status==='PENDING'||deadline!=='ALL'?{completedAt:null}:{}),...(name?{learner:{displayName:{contains:name,mode:'insensitive'}}}:{})};
 const rows=await tx.courseEnrollment.findMany({where,select:{id:true,startedAt:true,completedAt:true,learner:{select:{displayName:true}},version:{select:{title:true}},assignment:{select:{deadlineAt:true,obligation:true,revokedAt:true}},progress:{select:{completedAt:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*20,take:20});
 return rows.map(e=>({id:e.id,title:e.version.title,learner:e.learner.displayName,completedAt:e.completedAt,deadlineAt:e.assignment.deadlineAt,obligation:e.assignment.obligation,status:e.assignment.revokedAt?'REVOKED':e.completedAt?'COMPLETED':e.assignment.deadlineAt&&e.assignment.deadlineAt<new Date()?'OVERDUE':e.startedAt?'IN_PROGRESS':'NOT_STARTED',completedLessons:e.progress.filter(p=>p.completedAt).length}));
 });}
export async function municipalCourses(token:string,organizationId:string){return withCourseActor(token,async(tx,userId)=>{
 await coursePermission(tx,userId,PERMISSIONS.COURSE_PROGRESS_MUNICIPALITY_READ,organizationId);const org=await tx.organization.findUnique({where:{id:organizationId}});if(org?.type!=='MUNICIPALITY')fail('COURSE_SCOPE_UNAVAILABLE',403);
 const pubs=await tx.coursePublication.findMany({where:{audiences:{some:{organizationId,revokedAt:null}},revokedAt:null,archivedAt:null,version:{course:{archivedAt:null}}},select:{id:true,version:{select:{title:true,category:true}}},take:50});
 const units=await tx.organization.findMany({where:{parentId:organizationId,isActive:true,status:'ACTIVE',type:'HEALTH_UNIT'},select:{id:true,name:true}});
 const counts=pubs.length&&units.length?await tx.$queryRaw<{organizationId:string;assigned:number;completed:number}[]>`SELECT a."organizationId",count(*)::int AS assigned,(count(*) FILTER (WHERE e."completedAt" IS NOT NULL))::int AS completed FROM course_enrollments e JOIN course_assignments a ON a.id=e."assignmentId" WHERE a."organizationId" IN (${Prisma.join(units.map(u=>u.id))}) AND a."publicationId" IN (${Prisma.join(pubs.map(p=>p.id))}) AND a."revokedAt" IS NULL GROUP BY a."organizationId"`:[];
 return {publications:pubs.map(p=>({id:p.id,title:p.version.title,category:p.version.category})),units:units.map(u=>{const c=counts.find(c=>c.organizationId===u.id);return {...u,progress:{assigned:c&&c.assigned>=5?c.assigned:null,completed:c&&c.assigned>=5?c.completed:null,suppressed:!c||c.assigned<5}};})};
 });}
export async function revokeAssignment(token:string,enrollmentId:string){return withCourseActor(token,async(tx,userId)=>{
 await tx.$queryRaw`SELECT id FROM course_enrollments WHERE id=${enrollmentId} FOR UPDATE`;
 const enrollment=await tx.courseEnrollment.findUnique({where:{id:enrollmentId},include:{assignment:true}});if(!enrollment)fail('COURSE_ENROLLMENT_NOT_FOUND',404);
 await requireUnit(tx,userId,enrollment.assignment.organizationId,PERMISSIONS.COURSE_ASSIGN);
 const changed=await tx.courseAssignment.updateMany({where:{id:enrollment.assignmentId,revokedAt:null},data:{revokedAt:new Date()}});
 if(changed.count){await audit(tx,userId,'ASSIGNMENT_REVOKED',enrollmentId,enrollment.assignment.organizationId);await courseNotification(tx,enrollment.learnerUserId,'COURSE_ASSIGNMENT_REVOKED',enrollmentId,userId);}return {revoked:true};
 });}
