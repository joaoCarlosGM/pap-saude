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
  const expectStartRefusal = () => {
    const result = spawnSync(process.execPath, ["scripts/local/dev.mjs", "start"], {
      cwd: workspace, env: clean, stdio: "ignore",
    });
    if (result.status !== 1) throw new Error("EXPECTED_LOCAL_START_REFUSAL");
  };
  // Foreign resources are never adopted, started, relabelled or removed by CLI.
  run(["docker", "volume", "create", "--label", "pap.local=foreign-test", LOCAL_VOLUME]);
  try {
    const before = run(["docker", "volume", "inspect", LOCAL_VOLUME]);
    expectStartRefusal();
    if (run(["docker", "volume", "inspect", LOCAL_VOLUME]) !== before)
      throw new Error("FOREIGN_VOLUME_MODIFIED");
  } finally {
    // This fixture was explicitly created above by this test, never an operator resource.
    run(["docker", "volume", "rm", LOCAL_VOLUME]);
  }
  // Regression: interruption after volume creation, before container creation.
  run(["docker", "volume", "create", "--label", "pap.local=admin-beta1", LOCAL_VOLUME]);
  // Nonempty, uninitialized volumes are not safe initialization candidates.
  run(["docker", "run", "--rm", "--network", "none", "--entrypoint", "sh",
    "-v", `${LOCAL_VOLUME}:/data`, "postgres:16-alpine", "-ec", "printf preserve > /data/sentinel"]);
  expectStartRefusal();
  const preserved = run(["docker", "run", "--rm", "--network", "none", "--read-only", "--entrypoint", "sh",
    "-v", `${LOCAL_VOLUME}:/data:ro`, "postgres:16-alpine", "-ec", "cat /data/sentinel; test $(ls -A /data | wc -l) -eq 1"]);
  if (preserved !== "preserve") throw new Error("UNINITIALIZED_DATA_MODIFIED");
  run(["docker", "volume", "rm", LOCAL_VOLUME]);
  run(["docker", "volume", "create", "--label", "pap.local=admin-beta1", LOCAL_VOLUME]);
  // A foreign container occupying the fixed name must remain stopped and unchanged.
  run(["docker", "create", "--name", LOCAL_CONTAINER, "--label", "pap.local=foreign-test", "postgres:16-alpine"]);
  try {
    const before = run(["docker", "inspect", LOCAL_CONTAINER]);
    expectStartRefusal();
    if (run(["docker", "inspect", LOCAL_CONTAINER]) !== before)
      throw new Error("FOREIGN_CONTAINER_MODIFIED");
  } finally {
    run(["docker", "rm", "-v", LOCAL_CONTAINER]);
  }
  run(["docker", "create", "--name", workspace.split("/").pop() + "-consumer", "-v",
    `${LOCAL_VOLUME}:/data:ro`, "postgres:16-alpine"]);
  try {
    expectStartRefusal();
  } finally {
    run(["docker", "rm", "-v", workspace.split("/").pop() + "-consumer"]);
  }
  cli("start");
  const sql = (statement) => run([
    "docker", "exec", LOCAL_CONTAINER, "psql", "-X", "-U", "pap_local",
    "-d", "pap_admin_beta1_local", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement,
  ]).trim();
  const marker = () => sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()");
  if (marker() !== "pap-local-admin-beta1") throw new Error("VOLUME_ONLY_RECOVERY_FAILED");
  // A second fresh test-only volume and a container created but never started.
  run(["docker", "rm", "-f", LOCAL_CONTAINER]);
  run(["docker", "volume", "rm", LOCAL_VOLUME]);
  run(["docker", "volume", "create", "--label", "pap.local=admin-beta1", LOCAL_VOLUME]);
  run([
    "docker", "create", "--name", LOCAL_CONTAINER, "--label", "pap.local=admin-beta1",
    "--env-file", join(workspace, ".local/pap-admin/postgres.env"),
    "-p", "127.0.0.1:15432:5432", "-v", `${LOCAL_VOLUME}:/var/lib/postgresql/data`,
    "postgres:16-alpine",
  ]);
  cli("start");
  if (marker() !== "pap-local-admin-beta1") throw new Error("UNSTARTED_CONTAINER_RECOVERY_FAILED");
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
  // Populated unmarked databases must never be adopted or have data changed.
  sql("CREATE TABLE local_recovery_sentinel(value text); INSERT INTO local_recovery_sentinel VALUES ('preserve')");
  cli("start");
  if (marker() !== "pap-local-admin-beta1" || sql("SELECT value FROM local_recovery_sentinel") !== "preserve")
    throw new Error("EXISTING_MARKED_DATA_MODIFIED");
  sql("COMMENT ON DATABASE pap_admin_beta1_local IS NULL");
  const rejected = spawnSync(process.execPath, ["scripts/local/dev.mjs", "start"], {
    cwd: workspace, env: clean, stdio: "ignore",
  });
  if (rejected.status !== 1 || marker() !== "" || sql("SELECT value FROM local_recovery_sentinel") !== "preserve")
    throw new Error("POPULATED_UNMARKED_DATABASE_WAS_MODIFIED");
  console.log("PASS interrupted volume/container recovery and refusal to mark populated databases.");
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
