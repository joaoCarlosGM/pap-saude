import {lockCourseEnrollment,lockCoursePublication,lockCourseAudiences} from './transaction-locks';
import type {Prisma} from '@prisma/client';
import {progressSchema,attemptSchema,publicBlocks,type LessonBlock} from '@/lib/courses/schema';
import {PERMISSIONS} from '@/server/iam/permissions';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
import {AccessDeniedError} from '@/server/iam/authorization.errors';
import {withCourseActor,coursePermission,fail,audit,digest,CourseError} from './context';
import {contentInclude} from './authoring.service';
import {eligibleAudience,courseNotification} from './publication.service';
const enrollmentInclude={assignment:{include:{publication:true}},version:{include:contentInclude},progress:true,attempts:{orderBy:{attemptNo:'asc'}}} satisfies Prisma.CourseEnrollmentInclude;
type Enrollment=Prisma.CourseEnrollmentGetPayload<{include:typeof enrollmentInclude}>;
const lessons=(e:Enrollment)=>e.version.modules.flatMap(m=>m.lessons);
async function enrollment(tx:Prisma.TransactionClient,userId:string,id:string,write=false){
 await lockCourseEnrollment(tx,id,write);
 const e=await tx.courseEnrollment.findUnique({where:{id},include:enrollmentInclude});if(!e||e.learnerUserId!==userId||e.assignment.professionalUserId!==userId||e.courseVersionId!==e.assignment.publication.courseVersionId)fail('COURSE_ENROLLMENT_NOT_FOUND',404);
 await coursePermission(tx,userId,write?PERMISSIONS.COURSE_PROGRESS_OWN_WRITE:PERMISSIONS.COURSE_PROGRESS_OWN_READ,e.assignment.organizationId);
 await lockCoursePublication(tx,e.assignment.publicationId);
 await lockCourseAudiences(tx,e.assignment.publicationId);
 if(e.assignment.revokedAt||e.assignment.publication.revokedAt||!await eligibleAudience(tx,e.assignment.publicationId,e.assignment.organizationId))fail('COURSE_ENROLLMENT_UNAVAILABLE',403);
 return e;
}
function view(e:Enrollment){const all=lessons(e),done=e.progress.filter(p=>p.completedAt).length;return {id:e.id,asOf:new Date().toISOString(),title:e.version.title,description:e.version.description,category:e.version.category,thumbnail:e.version.thumbnail,versionNo:e.version.versionNo,estimatedMinutes:e.version.estimatedMinutes,revision:e.revision,lastLessonId:e.lastLessonId,startedAt:e.startedAt,completedAt:e.completedAt,deadlineAt:e.assignment.deadlineAt,obligation:e.assignment.obligation,isNew:!e.seenAt,progress:all.length?Math.floor(100*done/all.length):0,status:e.completedAt?'COMPLETED':e.assignment.deadlineAt&&e.assignment.deadlineAt<new Date()?'OVERDUE':e.startedAt?'IN_PROGRESS':'NOT_STARTED',certificationAvailable:false,modules:e.version.modules.map(m=>({id:m.id,title:m.title,lessons:m.lessons.map(l=>({id:l.id,title:l.title,estimatedMinutes:l.estimatedMinutes,contentBlocks:publicBlocks(l.contentBlocks as LessonBlock[]),completed:e.progress.some(p=>p.lessonId===l.id&&p.completedAt)}))})),assessment:e.version.assessment?{id:e.version.assessment.id,passingScore:e.version.assessment.passingScore,maxAttempts:e.version.assessment.maxAttempts,requiredForCompletion:e.version.assessment.requiredForCompletion,questions:e.version.assessment.questions.map(q=>({id:q.id,prompt:q.prompt,options:q.options as string[]}))}:null,attempts:e.attempts.map(a=>({id:a.id,attemptNo:a.attemptNo,score:a.scoreValidated,passed:a.passed,submittedAt:a.submittedAt}))};}
export async function getEnrollment(token:string,id:string){return withCourseActor(token,async(tx,userId)=>view(await enrollment(tx,userId,id)));}
export async function myCourses(token:string){return withCourseActor(token,async(tx,userId)=>{
 const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.roles.some(r=>r.permissions.includes(PERMISSIONS.COURSE_PROGRESS_OWN_READ)))fail('COURSE_LEARNER_PERMISSION_REQUIRED',403);
 const rows=await tx.courseEnrollment.findMany({where:{learnerUserId:userId},select:{id:true},orderBy:[{createdAt:'desc'},{id:'desc'}],take:50});const result=[];
 for(const row of rows){try{result.push(catalogView(await enrollment(tx,userId,row.id)));}catch(e){if(e instanceof AccessDeniedError||(e instanceof CourseError&&[403,404].includes(e.status)))continue;throw e;}}
 return result;
 });}
async function finishIfEligible(tx:Prisma.TransactionClient,userId:string,e:Enrollment){
 if(e.completedAt||!lessons(e).length||e.progress.filter(p=>p.completedAt).length!==lessons(e).length)return;
 if(e.version.assessment?.requiredForCompletion&&!e.attempts.some(a=>a.passed&&a.assessmentId===e.version.assessment!.id))return;
 await tx.courseEnrollment.update({where:{id:e.id},data:{completedAt:new Date(),revision:{increment:1}}});await audit(tx,userId,'COMPLETED',e.id,e.assignment.organizationId);await courseNotification(tx,userId,'COURSE_COMPLETED',e.id,userId);
}
export async function saveProgress(token:string,id:string,input:unknown){const p=progressSchema.parse(input);return withCourseActor(token,async(tx,userId)=>{
 const e=await enrollment(tx,userId,id,true),all=lessons(e),index=all.findIndex(l=>l.id===p.lessonId);if(index<0)fail('COURSE_LESSON_NOT_FOUND',404);
 if(all.slice(0,index).some(l=>!e.progress.some(row=>row.lessonId===l.id&&row.completedAt)))fail('COURSE_PREVIOUS_LESSON_REQUIRED',409);
 const current=e.progress.find(row=>row.lessonId===p.lessonId),hash=digest({acknowledged:p.acknowledged,answers:p.answers});
 if(p.action==='VISIT'&&e.lastLessonId===p.lessonId&&current)return view(e);
 if(p.action==='COMPLETE'&&current?.completedAt){if(current.checkpointDigest!==hash)fail('COURSE_PROGRESS_REPLAY_CONFLICT',409);return view(e);}
 if(p.revision!==e.revision)fail('COURSE_REVISION_CONFLICT',409);
 if(p.action==='COMPLETE'){
  if(!p.acknowledged)fail('COURSE_ACKNOWLEDGEMENT_REQUIRED');const blocks=all[index].contentBlocks as LessonBlock[],checkpoints=blocks.filter(b=>b.type==='checkpoint'||b.type==='multipleChoice');
  if(Object.keys(p.answers).some(k=>!checkpoints.some(b=>b.id===k)))fail('COURSE_INVALID_CHECKPOINT');
  for(const b of checkpoints){if((b.type==='multipleChoice'&&p.answers[b.id]!==b.correctIndex)||(b.type==='checkpoint'&&p.answers[b.id]!==b.expected))fail('COURSE_CHECKPOINT_NOT_PASSED',422);}
 }
 const now=new Date();if(!e.startedAt)await audit(tx,userId,'OPENED',id,e.assignment.organizationId);await tx.courseProgress.upsert({where:{enrollmentId_lessonId:{enrollmentId:id,lessonId:p.lessonId}},create:{enrollmentId:id,lessonId:p.lessonId,lastVisitedAt:now,...(p.action==='COMPLETE'?{completedAt:now,checkpointDigest:hash}:{})},update:{lastVisitedAt:now,revision:{increment:1},...(p.action==='COMPLETE'?{completedAt:now,checkpointDigest:hash}:{})}});
 await tx.courseEnrollment.update({where:{id},data:{lastLessonId:p.lessonId,startedAt:e.startedAt??now,seenAt:e.seenAt??now,revision:{increment:1}}});await audit(tx,userId,p.action==='COMPLETE'?'LESSON_COMPLETED':'LESSON_VISITED',id,e.assignment.organizationId,{lessonId:p.lessonId});
 let updated=await tx.courseEnrollment.findUniqueOrThrow({where:{id},include:enrollmentInclude});await finishIfEligible(tx,userId,updated);updated=await tx.courseEnrollment.findUniqueOrThrow({where:{id},include:enrollmentInclude});return view(updated);
 });}
export async function submitAttempt(token:string,id:string,input:unknown){const p=attemptSchema.parse(input);return withCourseActor(token,async(tx,userId)=>{
 const e=await enrollment(tx,userId,id,true),assessment=e.version.assessment,hash=digest(p.answers);if(!assessment)fail('COURSE_ASSESSMENT_NOT_FOUND',404);
 const existing=e.attempts.find(a=>a.requestKey===p.requestKey);if(existing){if(existing.requestHash!==hash)fail('COURSE_ATTEMPT_REPLAY_CONFLICT',409);return view(e);}
 if(e.completedAt)fail('COURSE_ALREADY_COMPLETED',409);
 if(e.progress.filter(row=>row.completedAt).length!==lessons(e).length)fail('COURSE_LESSONS_REQUIRED',409);
 const attempts=e.attempts.filter(a=>a.assessmentId===assessment.id);if(attempts.length>=assessment.maxAttempts)fail('COURSE_ATTEMPT_LIMIT',429);
 if(Object.keys(p.answers).length!==assessment.questions.length||Object.keys(p.answers).some(k=>!assessment.questions.some(q=>q.id===k)))fail('COURSE_ANSWERS_REQUIRED');
 const correct=assessment.questions.filter(q=>p.answers[q.id]===q.correctIndex).length,score=Math.floor(correct*100/assessment.questions.length),passed=score>=assessment.passingScore;
 await tx.courseAttempt.create({data:{enrollmentId:id,assessmentId:assessment.id,requestKey:p.requestKey,requestHash:hash,attemptNo:attempts.length+1,scoreValidated:score,passed,answersDigest:hash}});await audit(tx,userId,'ASSESSMENT_SUBMITTED',id,e.assignment.organizationId,{score,passed,attemptNo:attempts.length+1});
 await finishIfEligible(tx,userId,await tx.courseEnrollment.findUniqueOrThrow({where:{id},include:enrollmentInclude}));return view(await tx.courseEnrollment.findUniqueOrThrow({where:{id},include:enrollmentInclude}));
 });}
async function visibleReleases(tx:Prisma.TransactionClient,userId:string,profile:NonNullable<Awaited<ReturnType<typeof getEffectiveAccessProfile>>>){
 const releases=await tx.userNotification.findMany({where:{userId,kind:'COURSE_RELEASED_TO_UNIT',readAt:null},select:{id:true,coursePublicationId:true},take:100}),visible:{id:string;publicationId:string}[]=[];
 for(const n of releases){if(!n.coursePublicationId)continue;await lockCoursePublication(tx,n.coursePublicationId);const p=await tx.coursePublication.findUnique({where:{id:n.coursePublicationId},include:{version:{select:{course:{select:{archivedAt:true}}}}}});if(!p||p.revokedAt||p.archivedAt||p.version.course.archivedAt)continue;
  for(const role of profile.roles){if(role.key!=='HEALTH_UNIT_ADMIN'||!role.organization||!role.permissions.includes(PERMISSIONS.COURSE_ASSIGN))continue;try{await coursePermission(tx,userId,PERMISSIONS.COURSE_ASSIGN,role.organization.id);if(await eligibleAudience(tx,p.id,role.organization.id)){visible.push({id:n.id,publicationId:p.id});break;}}catch(e){if(!(e instanceof AccessDeniedError)&&!(e instanceof CourseError&&e.status===403))throw e;}}
 }return visible;
}
async function visibleUnseenEnrollments(tx:Prisma.TransactionClient,userId:string){
 const rows=await tx.courseEnrollment.findMany({where:{learnerUserId:userId,seenAt:null},select:{id:true},take:50}),ids:string[]=[];
 for(const row of rows){try{await enrollment(tx,userId,row.id);ids.push(row.id);}catch(e){if(!(e instanceof AccessDeniedError)&&!(e instanceof CourseError&&[403,404].includes(e.status)))throw e;}}return ids;
}
export async function markCoursesSeen(token:string){return withCourseActor(token,async(tx,userId)=>{
 const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.permissions.some(p=>[PERMISSIONS.COURSE_PROGRESS_OWN_READ,PERMISSIONS.COURSE_ASSIGN].includes(p as typeof PERMISSIONS.COURSE_ASSIGN)))fail('COURSE_PERMISSION_REQUIRED',403);
 const ids=await visibleUnseenEnrollments(tx,userId),releases=await visibleReleases(tx,userId,profile),now=new Date();await tx.courseEnrollment.updateMany({where:{id:{in:ids},learnerUserId:userId,seenAt:null},data:{seenAt:now}});
 const changed=await tx.userNotification.updateMany({where:{userId,readAt:null,OR:[{kind:'COURSE_ASSIGNED_TO_USER',courseEnrollmentId:{in:ids}},{kind:'COURSE_RELEASED_TO_UNIT',id:{in:releases.map(n=>n.id)}}]},data:{readAt:now}});if(changed.count)await audit(tx,userId,'NOTIFICATIONS_SEEN',userId);return {seen:true};
 });}
export async function courseBadge(token:string){return withCourseActor(token,async(tx,userId)=>{
 const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.permissions.some(p=>p.startsWith('course.')))fail('COURSE_PERMISSION_REQUIRED',403);
 const ids=await visibleUnseenEnrollments(tx,userId),releases=await visibleReleases(tx,userId,profile);return {newCourses:ids.length+new Set(releases.map(n=>n.publicationId)).size};
 });}
export type LearningView=ReturnType<typeof view>;

function catalogView(e:Enrollment){const v=view(e);return {id:v.id,asOf:v.asOf,title:v.title,description:v.description,category:v.category,thumbnail:v.thumbnail,versionNo:v.versionNo,estimatedMinutes:v.estimatedMinutes,lessonCount:lessons(e).length,progress:v.progress,status:v.status,isNew:v.isNew,deadlineAt:v.deadlineAt,obligation:v.obligation,completedAt:v.completedAt};}

export async function syncDeadlineNotifications(token:string){return withCourseActor(token,async(tx,userId)=>{
 const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.permissions.includes(PERMISSIONS.COURSE_PROGRESS_OWN_READ))fail('COURSE_LEARNER_PERMISSION_REQUIRED',403);
 const rows=await tx.courseEnrollment.findMany({where:{learnerUserId:userId,completedAt:null,assignment:{deadlineAt:{not:null},revokedAt:null}},select:{id:true},take:100});const now=new Date();let considered=0;
 for(const row of rows){let e:Enrollment;try{e=await enrollment(tx,userId,row.id);}catch(error){if(error instanceof AccessDeniedError||(error instanceof CourseError&&[403,404].includes(error.status)))continue;throw error;}const deadline=e.assignment.deadlineAt;if(!deadline)continue;const kind=deadline<now?'COURSE_OVERDUE':deadline.getTime()-now.getTime()<=7*86400000?'COURSE_DEADLINE_APPROACHING':null;if(kind){await courseNotification(tx,userId,kind,e.id,userId);considered++;}}
 return {considered};
 });}
