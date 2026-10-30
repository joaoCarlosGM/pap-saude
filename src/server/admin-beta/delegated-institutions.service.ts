import {z} from 'zod';
import {withCourseActor as withLockedActor,coursePermission,fail} from '@/server/courses/context';
import {getEffectiveAccessProfile} from '@/server/iam/effective-access-profile.service';
import {createOrganization} from '@/server/organizations/organization.service';
import {PERMISSIONS} from '@/server/iam/permissions';
const inputSchema=z.object({parentId:z.string().uuid(),name:z.string().trim().min(2).max(200),code:z.string().regex(/^\d{7}$/),city:z.string().trim().min(2).max(120),state:z.enum(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])}).strict();
async function permitted(tx:Parameters<Parameters<typeof withLockedActor>[1]>[0],userId:string){await coursePermission(tx,userId,PERMISSIONS.ORGANIZATION_MUNICIPALITY_CREATE);const p=await getEffectiveAccessProfile(userId,tx);if(!p?.roles.some(r=>r.scope==='GLOBAL'&&['PAP_ADMIN','PAP_MANAGER'].includes(r.key)&&r.permissions.includes(PERMISSIONS.ORGANIZATION_MUNICIPALITY_CREATE)))fail('INSTITUTION_PERMISSION_REQUIRED',403);}
export async function inclusionParents(token:string){return withLockedActor(token,async(tx,userId)=>{await permitted(tx,userId);return tx.organization.findMany({where:{type:'PAP',status:'ACTIVE',isActive:true},select:{id:true,name:true},orderBy:{id:'asc'},take:20});});}
export async function createDelegatedMunicipality(token:string,input:unknown){const payload=inputSchema.parse(input);return withLockedActor(token,async(tx,userId)=>{
 await permitted(tx,userId);
 await tx.$queryRaw`SELECT id FROM organizations WHERE id=${payload.parentId} FOR SHARE`;
 const parent=await tx.organization.findUnique({where:{id:payload.parentId}});if(!parent||parent.type!=='PAP'||parent.status!=='ACTIVE'||!parent.isActive)fail('INSTITUTION_PARENT_UNAVAILABLE',403);
 const existing=await tx.organization.findUnique({where:{code:payload.code}});
 if(existing){const own=await tx.auditEvent.findFirst({where:{actorUserId:userId,action:'DELEGATED_MUNICIPALITY_CREATED',resourceId:existing.id}});if(!own||existing.type!=='MUNICIPALITY'||existing.name!==payload.name||existing.city!==payload.city||existing.state!==payload.state||existing.parentId!==payload.parentId)fail('INSTITUTION_CODE_CONFLICT',409);return {id:existing.id,name:existing.name,status:existing.status,replayed:true};}
 const organization=await createOrganization({...payload,type:'MUNICIPALITY',status:'PENDING_VERIFICATION'},tx);
 await tx.auditEvent.create({data:{actorUserId:userId,organizationId:organization.id,action:'DELEGATED_MUNICIPALITY_CREATED',resourceType:'ORGANIZATION',resourceId:organization.id,metadata:{status:'PENDING_VERIFICATION',source:'BETA1_DELEGATED_INCLUSION'}}});
 return {id:organization.id,name:organization.name,status:organization.status,replayed:false};
 });}
