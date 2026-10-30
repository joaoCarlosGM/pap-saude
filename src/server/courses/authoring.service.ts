import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {draftSchema,draftStorageSchema,type DraftPayload,type LessonBlock} from '@/lib/courses/schema';
import {type PermissionKey,PERMISSIONS} from '@/server/iam/permissions';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
import {withCourseActor,coursePermission,audit,fail,digest} from './context';
export const contentInclude={course:true,publication:true,modules:{orderBy:{sortOrder:'asc'},include:{lessons:{orderBy:{sortOrder:'asc'}}}},assessment:{include:{questions:{orderBy:{sortOrder:'asc'}}}}} satisfies Prisma.CourseVersionInclude;
export type LoadedVersion=Prisma.CourseVersionGetPayload<{include:typeof contentInclude}>;
export function draftPayload(v:LoadedVersion):DraftPayload{return {title:v.title,description:v.description,category:v.category,level:v.level as DraftPayload['level'],language:v.language as DraftPayload['language'],thumbnail:v.thumbnail as DraftPayload['thumbnail'],estimatedMinutes:v.estimatedMinutes,modules:v.modules.map(m=>({title:m.title,lessons:m.lessons.map(l=>({title:l.title,estimatedMinutes:l.estimatedMinutes,contentBlocks:l.contentBlocks as LessonBlock[]}))})),assessment:v.assessment?{passingScore:v.assessment.passingScore,maxAttempts:v.assessment.maxAttempts,requiredForCompletion:v.assessment.requiredForCompletion,questions:v.assessment.questions.map(q=>({prompt:q.prompt,options:q.options as string[],correctIndex:q.correctIndex}))}:null};}
export async function ownedVersion(tx:Prisma.TransactionClient,userId:string,id:string,permission:PermissionKey=PERMISSIONS.COURSE_EDIT){
 await coursePermission(tx,userId,permission);
 const version=await tx.courseVersion.findUnique({where:{id},include:contentInclude});if(!version)fail('COURSE_NOT_FOUND',404);
 const profile=await getEffectiveAccessProfile(userId,tx),admin=profile?.roles.some(r=>r.key==='PAP_ADMIN'&&r.scope==='GLOBAL');
 if(version.course.creatorUserId!==userId&&!admin)fail('COURSE_NOT_FOUND',404);
 return version;
}
const dto=(v:LoadedVersion)=>({id:v.id,courseId:v.courseId,versionNo:v.versionNo,revision:v.revision,publishedAt:v.publishedAt,archivedAt:v.course.archivedAt,publication:v.publication?{id:v.publication.id,archivedAt:v.publication.archivedAt,revokedAt:v.publication.revokedAt}:null,payload:draftPayload(v)});
async function writeContent(tx:Prisma.TransactionClient,id:string,payload:DraftPayload){
 await tx.courseModule.deleteMany({where:{courseVersionId:id}});await tx.courseAssessment.deleteMany({where:{courseVersionId:id}});
 for(const [sortOrder,module]of payload.modules.entries())await tx.courseModule.create({data:{courseVersionId:id,title:module.title,sortOrder,lessons:{create:module.lessons.map((lesson,index)=>({title:lesson.title,sortOrder:index,estimatedMinutes:lesson.estimatedMinutes,contentBlocks:lesson.contentBlocks as Prisma.InputJsonValue}))}}});
 if(payload.assessment)await tx.courseAssessment.create({data:{courseVersionId:id,passingScore:payload.assessment.passingScore,maxAttempts:payload.assessment.maxAttempts,requiredForCompletion:payload.assessment.requiredForCompletion,questions:{create:payload.assessment.questions.map((q,sortOrder)=>({...q,sortOrder,options:q.options as Prisma.InputJsonValue}))}}});
}
export async function saveDraft(token:string,input:unknown,id?:string){const payload=draftStorageSchema.parse(input);return withCourseActor(token,async(tx,userId)=>{
 await coursePermission(tx,userId,PERMISSIONS.COURSE_EDIT);
 let versionId=id;
 if(id){await tx.$queryRaw`SELECT id FROM course_versions WHERE id=${id} FOR UPDATE`;const v=await ownedVersion(tx,userId,id);if(v.publishedAt)fail('COURSE_PUBLISHED_IMMUTABLE',409);if(payload.revision!==v.revision)fail('COURSE_REVISION_CONFLICT',409);await tx.courseVersion.update({where:{id},data:{title:payload.title,description:payload.description,category:payload.category,level:payload.level,language:payload.language,thumbnail:payload.thumbnail,estimatedMinutes:payload.estimatedMinutes,revision:{increment:1}}});}
 else{if(payload.requestKey){const existing=await tx.course.findUnique({where:{creationKey:payload.requestKey}});if(existing){if(existing.creatorUserId!==userId||existing.creationHash!==digest(payload))fail('COURSE_DRAFT_REQUEST_CONFLICT',409);return dto(await tx.courseVersion.findFirstOrThrow({where:{courseId:existing.id},include:contentInclude,orderBy:{versionNo:'asc'}}));}}const course=await tx.course.create({data:{slug:`curso-${randomUUID()}`,creatorUserId:userId,...(payload.requestKey?{creationKey:payload.requestKey,creationHash:digest(payload)}:{})}});const v=await tx.courseVersion.create({data:{courseId:course.id,versionNo:1,title:payload.title,description:payload.description,category:payload.category,level:payload.level,language:payload.language,thumbnail:payload.thumbnail,estimatedMinutes:payload.estimatedMinutes}});versionId=v.id;}
 await writeContent(tx,versionId!,payload);await audit(tx,userId,'DRAFT_SAVED',versionId!);return dto(await tx.courseVersion.findUniqueOrThrow({where:{id:versionId},include:contentInclude}));
 });}
export async function authorCatalog(token:string){return withCourseActor(token,async(tx,userId)=>{await coursePermission(tx,userId,PERMISSIONS.COURSE_EDIT);const profile=await getEffectiveAccessProfile(userId,tx),admin=profile?.roles.some(r=>r.key==='PAP_ADMIN'&&r.scope==='GLOBAL');const rows=await tx.courseVersion.findMany({where:admin?{}:{course:{creatorUserId:userId}},include:contentInclude,orderBy:[{createdAt:'desc'},{id:'desc'}],take:50});return rows.map(dto);});}
export async function getDraft(token:string,id:string){return withCourseActor(token,async(tx,userId)=>dto(await ownedVersion(tx,userId,id)));}
export async function newVersion(token:string,id:string){return withCourseActor(token,async(tx,userId)=>{
 const old=await ownedVersion(tx,userId,id);await tx.$queryRaw`SELECT id FROM courses WHERE id=${old.courseId} FOR UPDATE`;
 if(!old.publishedAt)return dto(old);const latest=await tx.courseVersion.findFirstOrThrow({where:{courseId:old.courseId},orderBy:{versionNo:'desc'},include:contentInclude});if(!latest.publishedAt)return dto(latest);
 const payload=draftPayload(old),v=await tx.courseVersion.create({data:{courseId:old.courseId,versionNo:latest.versionNo+1,title:payload.title,description:payload.description,category:payload.category,level:payload.level,language:payload.language,thumbnail:payload.thumbnail,estimatedMinutes:payload.estimatedMinutes}});await writeContent(tx,v.id,payload);await audit(tx,userId,'VERSION_CREATED',v.id);return dto(await tx.courseVersion.findUniqueOrThrow({where:{id:v.id},include:contentInclude}));
 });}
export async function publishVersion(token:string,id:string){return withCourseActor(token,async(tx,userId)=>{
 await tx.$queryRaw`SELECT id FROM course_versions WHERE id=${id} FOR UPDATE`;const v=await ownedVersion(tx,userId,id,PERMISSIONS.COURSE_PUBLISH);if(v.publication)return {publicationId:v.publication.id,versionId:id,hash:v.immutableContentHash};if(v.course.archivedAt)fail('COURSE_ARCHIVED',409);
 const payload=draftSchema.parse(draftPayload(v)),hash=digest(payload);const publication=await tx.coursePublication.create({data:{courseVersionId:id,publishedBy:userId}});await tx.courseVersion.update({where:{id},data:{publishedAt:new Date(),immutableContentHash:hash}});await audit(tx,userId,'PUBLISHED',publication.id,undefined,{versionId:id,hash});return {publicationId:publication.id,versionId:id,hash};
 });}
