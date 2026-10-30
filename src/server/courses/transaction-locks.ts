import type {Prisma} from '@prisma/client';
/** Audited read-only row locks. No dynamic identifiers or SQL composition.
 * Every value is a Prisma bound parameter. See docs/security/BETA1-ROW-LOCKS.md.
 * Keep this small: source fingerprint + closed SQL AST policy are CI enforced. */
async function lockGrants(tx:Prisma.TransactionClient,userId:string){
 await tx.$queryRaw`SELECT id FROM role_assignments WHERE "userId"=${userId} FOR SHARE`;
 await tx.$queryRaw`SELECT "roleId" FROM role_permissions WHERE "roleId" IN (SELECT "roleId" FROM role_assignments WHERE "userId"=${userId}) FOR SHARE`;
}
export async function lockCourseActorRows(tx:Prisma.TransactionClient,userId:string,sessionId:string){
 await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM sessions WHERE id=${sessionId} FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM mfa_factors WHERE "userId"=${userId} FOR SHARE`;
 await lockGrants(tx,userId);
 await tx.$queryRaw`SELECT id FROM memberships WHERE "userId"=${userId} FOR SHARE`;
}
export async function lockCourseRecipient(tx:Prisma.TransactionClient,userId:string,organizationId:string){
 await tx.$queryRaw`SELECT id FROM users WHERE id=${userId} FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM memberships WHERE "userId"=${userId} AND "organizationId"=${organizationId} FOR SHARE`;
 await lockGrants(tx,userId);
}
export async function lockCourseScope(tx:Prisma.TransactionClient,organizationId:string){
 await tx.$queryRaw`SELECT id FROM organizations WHERE id=${organizationId} OR id=(SELECT "parentId" FROM organizations WHERE id=${organizationId}) OR id=(SELECT "parentId" FROM organizations WHERE id=(SELECT "parentId" FROM organizations WHERE id=${organizationId})) FOR SHARE`;
}
export async function lockCourse(tx:Prisma.TransactionClient,id:string){
 await tx.$queryRaw`SELECT id FROM courses WHERE id=${id} FOR UPDATE`;
}
export async function lockCourseVersion(tx:Prisma.TransactionClient,id:string){
 await tx.$queryRaw`SELECT id FROM course_versions WHERE id=${id} FOR UPDATE`;
}
export async function lockCoursePublication(tx:Prisma.TransactionClient,id:string,exclusive=false){
 if(exclusive)await tx.$queryRaw`SELECT id FROM course_publications WHERE id=${id} FOR UPDATE`;
 else await tx.$queryRaw`SELECT id FROM course_publications WHERE id=${id} FOR SHARE`;
}
export async function lockCourseEnrollment(tx:Prisma.TransactionClient,id:string,exclusive=false){
 if(exclusive)await tx.$queryRaw`SELECT id FROM course_enrollments WHERE id=${id} FOR UPDATE`;
 else await tx.$queryRaw`SELECT id FROM course_enrollments WHERE id=${id} FOR SHARE`;
}
export async function lockCourseAudiences(tx:Prisma.TransactionClient,publicationId:string){
 await tx.$queryRaw`SELECT id FROM course_audiences WHERE "publicationId"=${publicationId} FOR SHARE`;
}
