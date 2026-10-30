import {betaRateLimit,BetaRateLimitError} from '@/server/admin-beta/policy';
import {NextRequest,NextResponse} from 'next/server';import {ZodError} from 'zod';
import {readSessionToken,assertTrustedRequestOrigin} from '@/server/auth/http-auth';
import {requireAdminSession,adminErrorResponse} from '@/server/admin/admin-http';
import {readCourseJson} from '@/server/courses/read-json';import {CourseError,denyAudit} from '@/server/courses/context';
import {createDelegatedMunicipality,inclusionParents} from '@/server/admin-beta/delegated-institutions.service';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handle(request:NextRequest){const token=readSessionToken(request)||'';try{const session=await requireAdminSession(request);if(request.method==='GET')return NextResponse.json({parents:await inclusionParents(token)},{headers:{'Cache-Control':'no-store'}});assertTrustedRequestOrigin(request);await betaRateLimit('beta1-municipality-create',session.user.id,20);const row=await createDelegatedMunicipality(token,await readCourseJson(request));return NextResponse.json({organization:row},{status:row.replayed?200:201,headers:{'Cache-Control':'no-store'}});}catch(e){if(request.method!=='GET')await denyAudit(token,'INSTITUTION_OPERATION_DENIED');if(e instanceof CourseError)return NextResponse.json({error:e.code},{status:e.status,headers:{'Cache-Control':'no-store'}});if(e instanceof BetaRateLimitError)return NextResponse.json({error:'INSTITUTION_RATE_LIMITED'},{status:429,headers:{'Cache-Control':'no-store'}});if(e instanceof ZodError)return NextResponse.json({error:'INVALID_INSTITUTION_PAYLOAD'},{status:400,headers:{'Cache-Control':'no-store'}});return adminErrorResponse(e);}}
export const GET=handle;export const POST=handle;
