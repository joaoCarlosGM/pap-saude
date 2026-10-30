import {notFound} from 'next/navigation';import {AccessDeniedError} from '@/server/iam/authorization.errors';import {PERMISSIONS} from '@/server/iam/permissions';import {coursePermission} from './context';
import {cookies} from 'next/headers';import {redirect} from 'next/navigation';
import {requireOwnPageSession} from '@/server/auth/require-page-session';import {SESSION_COOKIE_NAME} from '@/server/security/constants';import {OperationalMfaRequiredError} from '@/server/auth/operational-mfa.service';import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';import {withCourseActor} from './context';
export async function coursePageSession(){
 const session=await requireOwnPageSession(),token=(await cookies()).get(SESSION_COOKIE_NAME)?.value||'';
 try{return await withCourseActor(token,async(tx,userId)=>{const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.permissions.some(p=>p.startsWith('course.')))redirect('/minha-seguranca');return {...session,profile};});}
 catch(error){if(error instanceof OperationalMfaRequiredError)redirect('/primeiros-passos');throw error;}
}

export async function authorPageSession(){const actor=await coursePageSession(),token=(await cookies()).get(SESSION_COOKIE_NAME)?.value||'';try{await withCourseActor(token,(tx,userId)=>coursePermission(tx,userId,PERMISSIONS.COURSE_EDIT));}catch(error){if(error instanceof AccessDeniedError)notFound();throw error;}return actor;}
