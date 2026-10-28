import { NextRequest } from "next/server";
import { requireAdminSession,adminErrorResponse } from "@/server/admin/admin-http";
import { readSessionToken } from "@/server/auth/http-auth";
import { pendingWork } from "@/server/admin-pending/pending.service";
import { securityJson } from "@/server/auth/security-http";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{
 const p=request.nextUrl.searchParams;if([...p.keys()].some(k=>!['page','kind','cursor'].includes(k)||p.getAll(k).length!==1))return securityJson({error:'INVALID_QUERY'},400);
 const actor=await requireAdminSession(request);return securityJson(await pendingWork(actor.user.id,readSessionToken(request)!,Number(p.get('page')||1),p.get('kind')||undefined,p.get('cursor')||undefined));
}catch(error){if(error instanceof RangeError)return securityJson({error:'INVALID_QUERY'},400);return adminErrorResponse(error);}}
