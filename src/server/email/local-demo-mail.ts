import { lstat, mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
/** Explicit opt-in, loopback-only development sink. Never enabled in production. */
export async function captureLocalDemoMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId?: string;
  eventTime?: string;
}) {
  const db = new URL(process.env.DATABASE_URL || "");
  // Separate, opt-in sink for this slice's disposable browser/API harness.
  // It never accepts the operator's database, port, directory or public origin.
  const testDir = process.env.PAP_LOCAL_MAIL_TEST_DIR;
  const isolatedTest = process.env.PAP_LOCAL_DEMO_TEST === "1" &&
    !!testDir && /^\/tmp\/pap-m04-c-mail-[a-zA-Z0-9_-]+$/.test(testDir) &&
    db.hostname === "127.0.0.1" && db.port === "5432" &&
    db.pathname === "/pap_saude_m04_c_test" && db.search === "?schema=public" &&
    process.env.PAP_PUBLIC_URL === "http://127.0.0.1:3110";
  const operatorLab = !testDir && process.env.PAP_LOCAL_DEMO_TEST !== "1" &&
    process.env.PAP_PUBLIC_URL === "http://127.0.0.1:3100" &&
    db.hostname === "127.0.0.1" && db.port === "15432" &&
    db.pathname === "/pap_admin_beta1_local" && db.search === "?schema=public";
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PAP_LOCAL_DEMO !== "1" ||
    process.env.PAP_EMAIL_PROVIDER !== "local-demo" ||
    db.protocol !== "postgresql:" ||
    !(isolatedTest || operatorLab)
  )
    throw new Error("LOCAL_DEMO_MAIL_DISABLED");
  const dir = isolatedTest ? testDir! : resolve(process.cwd(), ".local/pap-admin/mail");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if ((await lstat(dir)).isSymbolicLink()) throw new Error("LOCAL_DEMO_MAIL_DISABLED");
  const timestamp = message.eventTime ? Date.parse(message.eventTime) : Date.now();
  if (!Number.isFinite(timestamp)) throw new Error("INVALID_MAIL_EVENT_TIME");
  // Preserve the timestamp prefix used by local:mail's chronological listing.
  const name = `${timestamp}-${message.messageId ? createHash("sha256").update(message.messageId).digest("hex") : randomUUID()}`;
  // Deterministic IDs deduplicate delivery retries; repair a partial pair without overwrite.
  for (const [extension, content] of [["json", JSON.stringify(message)], ["html", message.html]]) {
    try { await writeFile(resolve(dir, name + "." + extension), content, { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
}
