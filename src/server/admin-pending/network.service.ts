import {Prisma} from "@prisma/client";
import {db} from "@/server/db/client";
import {requireAdminActor} from "@/server/admin/admin-session.service";
import {authorize,requirePermission} from "@/server/iam/authorization.service";
import {PERMISSIONS} from "@/server/iam/permissions";
import {uuid} from "@/server/admin-beta/policy";
export async function networkUnit(userId:string,token:string,id:string,page=1){
 uuid(id);if(!Number.isInteger(page)||page<1||page>10000)throw new RangeError();
 return db.$transaction(async tx=>{
  await requireAdminActor(userId,token,tx);await requirePermission({userId,permission:PERMISSIONS.ORGANIZATION_READ,organizationId:id},tx);
  const organization=await tx.organization.findUniqueOrThrow({where:{id},select:{id:true,name:true,type:true,status:true,city:true,state:true}});
  const canReadPeople=(await authorize({userId,permission:PERMISSIONS.USER_READ,organizationId:id},tx)).allowed && (await authorize({userId,permission:PERMISSIONS.MEMBERSHIP_READ,organizationId:id},tx)).allowed;
  if(!canReadPeople)return {organization,people:[],total:0,page,pageSize:20,canReadPeople:false};
  const [people,total]=await Promise.all([tx.membership.findMany({where:{organizationId:id},select:{id:true,status:true,user:{select:{displayName:true,roleAssignments:{where:{organizationId:id},select:{role:{select:{name:true}}}}}}},orderBy:{id:'asc'},take:20,skip:(page-1)*20}),tx.membership.count({where:{organizationId:id}})]);
  return {organization,people,total,page,pageSize:20,canReadPeople:true};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
