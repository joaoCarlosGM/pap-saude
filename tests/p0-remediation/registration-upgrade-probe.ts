import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { db } from "../../src/server/db/client";
import { bootstrapSystemIam } from "../../src/server/iam/bootstrap.service";
import { assignSystemRole } from "../../src/server/iam/role-assignment.service";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";
import { validateSession } from "../../src/server/auth/session.service";
import { verifiedSessionToken } from "../helpers/verified-admin-session";
import { decryptSecret } from "../../src/server/security/secret-encryption";

async function main() {
 const u=new URL(process.env.DATABASE_URL!);assert.equal(u.port,"25443");assert.equal(u.pathname,"/pap_p0_registration_test");
 await bootstrapSystemIam();const password=randomBytes(24).toString("base64url");
 const user=await db.user.create({data:{email:`${randomUUID()}@synthetic.invalid`,displayName:"Admin legado sintético"}});
 await db.passwordCredential.create({data:{userId:user.id,passwordHash:await hashPassword(password),algorithm:"ARGON2ID"}});
 await assignSystemRole({userId:user.id,roleKey:"PAP_ADMIN"});const token=await verifiedSessionToken(user.id);
 const snapshot=async()=>{
  const value=await db.user.findUniqueOrThrow({where:{id:user.id},include:{passwordCredential:true,mfaFactors:{orderBy:{id:"asc"}},mfaRecoveryCodes:{orderBy:{id:"asc"}},sessions:{orderBy:{id:"asc"}},roleAssignments:{orderBy:{id:"asc"}}}});
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
 };
 const before=await snapshot();execFileSync("node_modules/.bin/prisma",["migrate","deploy"],{stdio:"inherit",env:process.env});assert.equal(await snapshot(),before);
 const credential=await db.passwordCredential.findUniqueOrThrow({where:{userId:user.id}});assert.equal(await verifyPassword(credential.passwordHash,password),true);
 const session=await validateSession(token,{updateLastSeen:false});assert.equal(session.user.id,user.id);assert.ok(session.session.mfaVerifiedAt);
 const factor=await db.mfaFactor.findFirstOrThrow({where:{userId:user.id,status:"ACTIVE"}});assert.ok(decryptSecret(factor.secretEncrypted).length>0);
 console.log("PASS current forward migrations preserve the same synthetic Admin/password/MFA/recovery/session/roles; no operator account accessed");
}
main().finally(()=>db.$disconnect());
