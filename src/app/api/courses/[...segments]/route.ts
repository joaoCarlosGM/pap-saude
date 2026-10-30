import {NextRequest,NextResponse} from 'next/server';
import {z,ZodError} from 'zod';
import {readSessionToken,assertTrustedRequestOrigin} from '@/server/auth/http-auth';
import {requireHttpSession} from '@/server/http/http-auth.guard';
import {HttpAuthenticationRequiredError,HttpAccessDeniedError} from '@/server/http/http-auth.errors';
import {InvalidRequestOriginError} from '@/server/auth/http-auth.errors';
import {OperationalMfaRequiredError} from '@/server/auth/operational-mfa.service';
import {AccessDeniedError} from '@/server/iam/authorization.errors';
import {ExpiredSessionError,InvalidSessionError,RevokedSessionError,InactiveSessionUserError} from '@/server/auth/session.errors';
import {readCourseJson} from '@/server/courses/read-json';
import {BetaRateLimitError} from '@/server/admin-beta/policy';
import {CourseError,courseWriteLimit,denyAudit} from '@/server/courses/context';
import {saveDraft,authorCatalog,getDraft,newVersion,publishVersion} from '@/server/courses/authoring.service';
import {editorOrganizations,releaseCourse,withdrawPublication} from '@/server/courses/publication.service';
import {availableCourses,unitMembers,assignCourse,unitProgress,municipalCourses,revokeAssignment} from '@/server/courses/assignment.service';
import {getEnrollment,myCourses,saveProgress,submitAttempt,courseBadge,markCoursesSeen,syncDeadlineNotifications} from '@/server/courses/progress.service';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{segments:string[]}>};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store, max-age=0'}});
const uuid=(value:string|null)=>z.string().uuid().parse(value);
async function handle(request:NextRequest,context:Context){
 const token=readSessionToken(request)||'';
 try{
  await requireHttpSession(request);
  const parts=(await context.params).segments,path=parts.join('/'),id=parts[1],method=request.method,org=request.nextUrl.searchParams.get('organizationId');
  if(method==='GET'){
   if(path==='editor')return json({courses:await authorCatalog(token)});
   if(path==='editor/organizations')return json({organizations:await editorOrganizations(token)});
   if(parts.length===2&&parts[0]==='drafts')return json({course:await getDraft(token,uuid(id))});
   if(['me','catalog'].includes(path))return json({courses:await myCourses(token)});
   if(path==='badge')return json(await courseBadge(token));
   if(path==='unit/available')return json({courses:await availableCourses(token,uuid(org))});
   if(path==='unit/members')return json({members:await unitMembers(token,uuid(org))});
   if(path==='unit/progress')return json({progress:await unitProgress(token,uuid(org),Number(request.nextUrl.searchParams.get('page')||1),{status:request.nextUrl.searchParams.get('status')||undefined,name:request.nextUrl.searchParams.get('name')||undefined,deadline:request.nextUrl.searchParams.get('deadline')||undefined})});
   if(path==='municipality')return json(await municipalCourses(token,uuid(org)));
   if(parts.length===2&&parts[0]==='enrollments')return json({enrollment:await getEnrollment(token,uuid(id))});
  }else{
   assertTrustedRequestOrigin(request);await courseWriteLimit(token);
   if(path==='notifications/sync'&&method==='POST')return json(await syncDeadlineNotifications(token));
   if(parts[0]==='unit'&&parts[1]==='enrollments'&&parts[3]==='revoke'&&parts.length===4&&method==='POST')return json(await revokeAssignment(token,uuid(parts[2])));
   if(path==='seen'&&method==='POST')return json(await markCoursesSeen(token));
   const body=await readCourseJson(request);
   if(path==='drafts'&&method==='POST')return json({course:await saveDraft(token,body)},201);
   if(parts[0]==='drafts'&&parts.length===2&&method==='PATCH')return json({course:await saveDraft(token,body,uuid(id))});
   if(method==='POST'&&parts.length===3&&parts[0]==='drafts'){
    if(parts[2]==='publish')return json(await publishVersion(token,uuid(id)));
    if(parts[2]==='new-version')return json({course:await newVersion(token,uuid(id))});
   }
   if(method==='POST'&&parts.length===3&&parts[0]==='publications'){
    if(parts[2]==='release'||parts[2]==='forward')return json(await releaseCourse(token,uuid(id),body,parts[2]==='forward'));
    if(parts[2]==='archive'||parts[2]==='revoke')return json(await withdrawPublication(token,uuid(id),parts[2]==='archive'?'ARCHIVE':'REVOKE'));
   }
   if(path==='unit/assign'&&method==='POST')return json(await assignCourse(token,body));
   if(parts[0]==='enrollments'&&parts.length===3&&method==='POST'){
    if(parts[2]==='progress')return json({enrollment:await saveProgress(token,uuid(id),body)});
    if(parts[2]==='attempts')return json({enrollment:await submitAttempt(token,uuid(id),body)});
   }
  }
  return json({error:{code:'COURSE_ENDPOINT_NOT_FOUND'}},404);
 }catch(error){
  let status=500,code='COURSE_REQUEST_FAILED';
  if(error instanceof CourseError){status=error.status;code=error.code;}
  else if(error instanceof ZodError||(error instanceof Error&&error.message==='INVALID_ADMIN_PAYLOAD')){status=400;code='COURSE_INVALID_PAYLOAD';}
  else if(error instanceof AccessDeniedError||error instanceof HttpAccessDeniedError||error instanceof OperationalMfaRequiredError||error instanceof InvalidRequestOriginError){status=403;code='COURSE_ACCESS_DENIED';}
  else if(error instanceof BetaRateLimitError){status=429;code='COURSE_RATE_LIMITED';}
  else if(error instanceof HttpAuthenticationRequiredError||error instanceof InvalidSessionError||error instanceof RevokedSessionError||error instanceof ExpiredSessionError||error instanceof InactiveSessionUserError){status=401;code='COURSE_AUTHENTICATION_REQUIRED';}
  if(status<500&&request.method!=='GET')await denyAudit(token,code);
  return json({error:{code}},status);
 }
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
