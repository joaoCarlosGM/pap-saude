import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import {CAPTCHA_ALPHABET as ALPHABET,captchaGlyph} from "./captcha-glyphs";
import { db } from "@/server/db/client";
import { sha256 } from "@/server/security/crypto";
const TTL = 2 * 60_000, WINDOW = 10 * 60_000;
export const CAPTCHA_COOKIE = "pap_login_verification";
export class CaptchaError extends Error {
  constructor(readonly status: 400 | 429 = 400) { super("LOGIN_VERIFICATION_REQUIRED"); }
}
function prefix(id: string, binding: string, origin: string) {
  return `captcha:v1:${sha256(`${id}\0${binding}\0${origin}`)}:`;
}
/** Only a salted digest is persisted, in the existing expiring abuse ledger.
 * Rendering happens before storage; plaintext never leaves this service. */
export async function issueLoginCaptcha(origin: string, accessible = false, now = new Date()) {
  const rateKey = sha256(`captcha-limit:v1:${origin}:${Math.floor(+now / WINDOW)}`);
  const attempts = await db.betaAbuseBucket.upsert({ where: { key: rateKey }, create: { key: rateKey, count: 1, expiresAt: new Date(+now + 2 * WINDOW) }, update: { count: { increment: 1 } } });
  if (attempts.count > 30) throw new CaptchaError(429);
  const id = randomBytes(24).toString("base64url"), binding = randomBytes(32).toString("base64url");
  const a = randomInt(100, 1000), b = randomInt(100, 1000);
  const answer = accessible ? String(a * b) : Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  let image: string | undefined;
  if (!accessible) {
    const letters = [...answer].map((c, i) => captchaGlyph(c,20+i*33,randomInt(-8,9))).join("");
    const png = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="66"><rect width="190" height="66" fill="#edf7f3"/>${letters}<path d="M4 25 L182 32 M8 55 L185 14" stroke="#699b8b" fill="none"/></svg>`)).png().toBuffer();
    image = `data:image/png;base64,${png.toString("base64")}`;
  }
  const expiresAt = new Date(+now + TTL);
  await db.betaAbuseBucket.create({ data: { key: prefix(id, binding, origin) + sha256(`${answer}\0${binding}`), count: 0, expiresAt } });
  return { binding, public: { id, image, question: accessible ? `Qual é o produto de ${a} por ${b}? Você pode usar uma calculadora.` : undefined, expiresAt: expiresAt.toISOString() } };
}
export async function verifyLoginCaptcha(input: { id?: string; answer?: string; binding?: string; origin: string; now?: Date }) {
  if (!input.id || !/^[\w-]{32}$/.test(input.id) || !input.binding || !/^[\w-]{43}$/.test(input.binding) || !input.answer || input.answer.length > 32) throw new CaptchaError();
  const keyPrefix = prefix(input.id, input.binding, input.origin), now = input.now ?? new Date();
  const valid = await db.$transaction(async tx => {
    const row = await tx.betaAbuseBucket.findFirst({ where: { key: { startsWith: keyPrefix }, expiresAt: { gt: now } } });
    if (!row) return false;
    // Every attempt, including an incorrect answer, atomically spends the challenge.
    const claimed = await tx.betaAbuseBucket.updateMany({ where: { key: row.key, count: 0, expiresAt: { gt: now } }, data: { count: 1 } });
    if (claimed.count !== 1) return false;
    const expected = Buffer.from(row.key.slice(keyPrefix.length), "hex");
    const actual = Buffer.from(sha256(`${input.answer!.trim().toUpperCase()}\0${input.binding}`), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
  if (!valid) throw new CaptchaError();
}
