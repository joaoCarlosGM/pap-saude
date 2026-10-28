import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { requireAdminActor } from "@/server/admin/admin-session.service";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
export type PendingKind="REVIEW"|"ACTIVATE"|"ASSIGN"|"MEMBERSHIP";
type Row={id:string;kind:PendingKind;name:string;status:string;createdAt:Date};
const kinds=['REVIEW','ACTIVATE','ASSIGN','MEMBERSHIP'];
type Cursor={id:string;kind:string;createdAt:string};
function parseCursor(value?:string):Cursor|undefined{
 if(!value)return;
 try{if(value.length>400)throw Error();const c=JSON.parse(Buffer.from(value,'base64url').toString());if(!c||Object.keys(c).sort().join(',')!=='createdAt,id,kind'||typeof c.createdAt!=='string'||new Date(c.createdAt).toISOString()!==c.createdAt||!kinds.includes(c.kind)||typeof c.id!=='string'||!/^[0-9a-f-]{36}$/i.test(c.id))throw Error();return c;}catch{throw new RangeError('INVALID_CURSOR');}
}
/** Bounded keyset merge: at most 21 rows per source, fixed query count, no raw
 * SQL or per-row lookups. Cursor changes ordering only, never authorization. */
export async function pendingWork(userId:string,token:string,page=1,kind?:string,cursorValue?:string,focusId?:string){
 if(!Number.isInteger(page)||page<1||page>10000||(kind&&!kinds.includes(kind))||(page>1&&!cursorValue))throw new RangeError("INVALID_PAGE");
 if(focusId&&!/^[0-9a-f-]{36}$/i.test(focusId))throw new RangeError("INVALID_FOCUS");
 const cursor=parseCursor(cursorValue);
 function after(k:PendingKind){if(!cursor)return {};const time=new Date(cursor.createdAt);return {OR:[{createdAt:{lt:time}},...(k>cursor.kind?[{createdAt:time}]:k===cursor.kind?[{createdAt:time,id:{gt:cursor.id}}]:[])]};}
 return db.$transaction(async tx=>{
  await requireAdminActor(userId,token,tx);const profile=await getEffectiveAccessProfile(userId,tx);if(!profile?.canAccessAdmin)throw new AccessDeniedError();
  const adminGrant=(permission:string)=>profile.roles.some(r=>r.scope==='GLOBAL'&&r.key==='PAP_ADMIN'&&r.permissions.includes(permission));
  const canAssignAll=adminGrant('role.manage'),canActivate=adminGrant('organization.activate'),canManageAllMemberships=adminGrant('membership.manage');
  const reviewer=profile.roles.some(r=>r.scope==='GLOBAL'&&r.permissions.includes('organization.request.review'));
  const manager=profile.roles.some(r=>r.scope==='GLOBAL'&&r.key==='PAP_MANAGER'&&r.permissions.includes('role.assign_commercial'));
  const units=profile.roles.filter(r=>r.scope==='HEALTH_UNIT'&&r.organization&&r.permissions.includes('membership.manage')).map(r=>r.organization!.id);
  const cities=profile.roles.filter(r=>r.scope==='MUNICIPALITY'&&r.organization&&r.permissions.includes('membership.manage')).map(r=>r.organization!.id);
  const rows:Row[]=[],counts:{kind:PendingKind;total:number}[]=[];
  for(const k of ['REVIEW','ACTIVATE'] as const){if(k==='REVIEW'?!reviewer:!canActivate)continue;
   const where:Prisma.OrganizationCandidateWhereInput={status:k==='REVIEW'?'NEW':'READY_FOR_ACTIVATION',consentedAt:{not:null}};
   const total=await tx.organizationCandidate.count({where});counts.push({kind:k,total});if(!kind||kind===k){const found=await tx.organizationCandidate.findMany({where:{AND:[where,after(k),...(focusId?[{id:focusId}]:[])]},select:{id:true,name:true,status:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:21});rows.push(...found.map(r=>({...r,kind:k})));}
  }
  if(canAssignAll||manager){const k='ASSIGN' as const,where:Prisma.AccessInvitationWhereInput={status:'PENDING_ASSIGNMENT',...(canAssignAll?{}:{invitedByUserId:userId,proposedRoleKey:'COMMERCIAL'})};const total=await tx.accessInvitation.count({where});counts.push({kind:k,total});if(!kind||kind===k){const found=await tx.accessInvitation.findMany({where:{AND:[where,after(k),...(focusId?[{id:focusId}]:[])]},select:{id:true,displayName:true,status:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:21});rows.push(...found.map(r=>({id:r.id,name:r.displayName,status:r.status,createdAt:r.createdAt,kind:k})));}}
  if(canManageAllMemberships||units.length||cities.length){const k='MEMBERSHIP' as const,where:Prisma.MembershipWhereInput={status:'REQUESTED',user:{isActive:true},organization:{isActive:true,status:'ACTIVE',...(canManageAllMemberships?{}:{OR:[{id:{in:units}},{parentId:{in:cities}}]})}};const total=await tx.membership.count({where});counts.push({kind:k,total});if(!kind||kind===k){const found=await tx.membership.findMany({where:{AND:[where,after(k),...(focusId?[{id:focusId}]:[])]},select:{id:true,status:true,createdAt:true,user:{select:{displayName:true}},organization:{select:{name:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],take:21});rows.push(...found.map(r=>({id:r.id,name:`${r.user.displayName} · ${r.organization.name}`,status:r.status,createdAt:r.createdAt,kind:k})));}}
  rows.sort((a,b)=>+b.createdAt-+a.createdAt||(a.kind<b.kind?-1:a.kind>b.kind?1:0)||(a.id<b.id?-1:a.id>b.id?1:0));
  const selected=rows.slice(0,20),last=selected.at(-1);const nextCursor=rows.length>20&&last?Buffer.from(JSON.stringify({id:last.id,kind:last.kind,createdAt:last.createdAt.toISOString()})).toString('base64url'):null;
  return {rows:selected.map(r=>({...r,href:r.kind==='ASSIGN'?`/admin/convites-globais?item=${r.id}`:r.kind==='MEMBERSHIP'?'/admin/usuarios':`/admin/solicitacoes?item=${r.id}`})),total:counts.filter(c=>!kind||c.kind===kind).reduce((n,c)=>n+c.total,0),counts,page,pageSize:20,nextCursor};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
