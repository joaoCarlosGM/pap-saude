import {db} from '../../src/server/db/client';
import {actor} from '../mission04-b/fixtures';
import {assignSystemRole} from '../../src/server/iam/role-assignment.service';
export async function professional(){const f=await actor();await db.roleAssignment.deleteMany({where:{userId:f.user.id}});await db.membership.create({data:{userId:f.user.id,organizationId:f.unit.id,status:'ACTIVE'}});await assignSystemRole({userId:f.user.id,organizationId:f.unit.id,roleKey:'PROFESSIONAL'});return f;}
