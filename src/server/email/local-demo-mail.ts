import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
/** Explicit opt-in, loopback-only development sink. Never enabled in production. */
export async function captureLocalDemoMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const db = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PAP_LOCAL_DEMO !== "1" ||
    process.env.PAP_EMAIL_PROVIDER !== "local-demo" ||
    process.env.PAP_PUBLIC_URL !== "http://127.0.0.1:3100" ||
    db.protocol !== "postgresql:" ||
    db.hostname !== "127.0.0.1" ||
    db.port !== "15432" ||
    db.pathname !== "/pap_admin_beta1_local" ||
    db.search !== "?schema=public"
  )
    throw new Error("LOCAL_DEMO_MAIL_DISABLED");
  const dir = resolve(process.cwd(), ".local/pap-admin/mail");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const name = `${Date.now()}-${randomUUID()}`;
  await writeFile(resolve(dir, name + ".json"), JSON.stringify(message), {
    flag: "wx",
    mode: 0o600,
  });
  await writeFile(resolve(dir, name + ".html"), message.html, {
    flag: "wx",
    mode: 0o600,
  });
}
