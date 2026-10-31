import {randomUUID} from 'node:crypto';
import {db} from '../../src/server/db/client';
import {actor} from '../mission04-b/fixtures';
export async function commercialIdentity(){return actor('COMMERCIAL');}
export async function notificationFor(identity:Awaited<ReturnType<typeof commercialIdentity>>){
 const sender=await actor();
 const assignment=await db.roleAssignment.findFirstOrThrow({where:{userId:identity.user.id,organizationId:null,role:{key:'COMMERCIAL'}}});
 const now=new Date();
 const invitation=await db.accessInvitation.create({data:{email:identity.user.email,displayName:identity.user.displayName,proposedRoleKey:'COMMERCIAL',status:'ACTIVE',activeSlot:1,expiresAt:new Date(Date.now()+86400000),acceptedAt:now,decidedAt:now,userId:identity.user.id,invitedByUserId:sender.user.id,reviewedByUserId:sender.user.id,assignmentId:assignment.id}});
 return db.userNotification.create({data:{userId:identity.user.id,invitationId:invitation.id,kind:'ACCESS_APPROVED',dedupeKey:'commercial-test-'+randomUUID()}});
}
