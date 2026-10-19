import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  symlinkSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertDockerEndpoint,
  LOCAL_CONTAINER,
  LOCAL_VOLUME,
} from "./policy.mjs";
const root = resolve(import.meta.dirname, "../..");
function run(args, options = {}) {
  const r = spawnSync(args[0], args.slice(1), { encoding: "utf8", ...options });
  if (r.status !== 0) throw new Error("LOCAL_SMOKE_FAILED");
  return r.stdout;
}
if (process.env.DOCKER_HOST) throw new Error("LOCAL_DOCKER_ONLY");
const context = JSON.parse(run(["docker", "context", "inspect"]))[0];
assertDockerEndpoint(context.Endpoints.docker.Host);
for (const [type, name] of [
  ["container", LOCAL_CONTAINER],
  ["volume", LOCAL_VOLUME],
])
  if (
    spawnSync("docker", [type, "inspect", name], { stdio: "ignore" }).status ===
    0
  )
    throw new Error(
      "BLOCKED: local resources already exist; never overwrite operator environment.",
    );
const workspace = mkdtempSync(join(tmpdir(), "pap-local-smoke-"));
let started = false;
try {
  mkdirSync(join(workspace, "scripts/local"), { recursive: true });
  for (const name of ["dev.mjs", "policy.mjs", "provision.ts"])
    copyFileSync(
      join(root, "scripts/local", name),
      join(workspace, "scripts/local", name),
    );
  for (const name of [
    "node_modules",
    "src",
    "prisma",
    "tsconfig.json",
    "prisma.config.ts",
    "package.json",
  ])
    symlinkSync(join(root, name), join(workspace, name));
  const clean = { ...process.env };
  delete clean.DATABASE_URL;
  delete clean.NODE_ENV;
  const cli = (command) =>
    run([process.execPath, "scripts/local/dev.mjs", command], {
      cwd: workspace,
      env: clean,
      stdio: ["ignore", "inherit", "inherit"],
    });
  cli("init");
  const firstConfig = readFileSync(
    join(workspace, ".local/pap-admin/config.json"),
    "utf8",
  );
  cli("init");
  if (
    readFileSync(join(workspace, ".local/pap-admin/config.json"), "utf8") !==
    firstConfig
  )
    throw new Error("LOCAL_SECRET_REGENERATION_FORBIDDEN");
  started = true;
  cli("start");
  cli("migrate");
  cli("migrate");
  const c = JSON.parse(
    readFileSync(join(workspace, ".local/pap-admin/config.json"), "utf8"),
  );
  const env = {
    ...clean,
    NODE_ENV: "development",
    DATABASE_URL: c.databaseUrl,
    PAP_LOCAL_DEMO: "1",
    PAP_EMAIL_PROVIDER: "local-demo",
    PAP_PUBLIC_URL: "http://127.0.0.1:3100",
    AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:3100",
    MFA_SECRET_ENCRYPTION_KEY: c.mfaKey,
    MFA_SECRET_ENCRYPTION_KEY_ID: "local-smoke",
    RESEND_API_KEY: "",
  };
  run(
    [
      process.execPath,
      "--import",
      "tsx",
      "--test",
      join(root, "tests/local/provision.integration.test.ts"),
    ],
    { cwd: workspace, env, stdio: "inherit" },
  );
  console.log(
    "PASS isolated local setup, migration replay, IAM, operator provisioning, MFA bootstrap and offline demo invitations.",
  );
} finally {
  if (started) {
    for (const [type, name, args] of [
      ["container", LOCAL_CONTAINER, ["docker", "rm", "-f", LOCAL_CONTAINER]],
      ["volume", LOCAL_VOLUME, ["docker", "volume", "rm", LOCAL_VOLUME]],
    ]) {
      const inspect = spawnSync("docker", [type, "inspect", name], {
        encoding: "utf8",
      });
      if (inspect.status === 0) {
        const object = JSON.parse(inspect.stdout)[0];
        if (
          (object.Config?.Labels || object.Labels)?.["pap.local"] ===
          "admin-beta1"
        )
          spawnSync(args[0], args.slice(1), { stdio: "ignore" });
      }
    }
  }
  rmSync(workspace, { recursive: true, force: true });
}
