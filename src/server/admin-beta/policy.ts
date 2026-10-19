import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { AccessDeniedError } from "@/server/iam/authorization.errors";
import { getEffectiveAccessProfile } from "@/server/iam/effective-access-profile.service";

export function invalid(): never { throw new Error("INVALID_ADMIN_PAYLOAD"); }
export function text(value: unknown, max: number, min = 2): string {
  if (typeof value !== "string") return invalid();
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length < min || clean.length > max || /[<>\x00-\x1f]/.test(clean)) return invalid();
  return clean;
}
export function email(value: unknown) {
  const clean = text(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return invalid();
  return clean;
}
export function uuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return invalid();
  return value;
}
export async function requirePapReviewer(userId: string) {
  const profile = await getEffectiveAccessProfile(userId);
  if (!profile?.roles.some(r => r.key === "PAP_ADMIN" && r.scope === "GLOBAL" && r.permissions.includes("organization.manage"))) throw new AccessDeniedError();
}
export class BetaRateLimitError extends Error {}
/** PostgreSQL atomic UPSERT makes limits effective across workers. Expired keys are pruned. */
export async function betaRateLimit(scope: string, identity: string, limit: number, now = new Date()) {
  const window = Math.floor(now.getTime() / 3_600_000);
  const key = createHash("sha256").update(`beta:v1:${scope}:${window}:${identity}`).digest("hex");
  await db.betaAbuseBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  const counter = await db.betaAbuseBucket.upsert({ where: { key },
    create: { key, count: 1, expiresAt: new Date((window + 2) * 3_600_000) }, update: { count: { increment: 1 } } });
  if (counter.count > limit) throw new BetaRateLimitError();
}

export async function serializable<T>(action:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
  for(let attempt=0;attempt<5;attempt++){
    try{return await db.$transaction(action,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
    catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError)||!["P2034","P2002"].includes(error.code)||attempt===4)throw error;}
  }
  throw new Error("TRANSACTION_RETRY_EXHAUSTED");
}
