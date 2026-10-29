import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  lstatSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import pg from "pg";
import {
  assertLocalContainer,
  assertLocalUrl,
  assertDockerEndpoint,
  localLabProfile,
  parseLocalArguments,
  assertSeparateCheckout,
  assertLocalVolume,
} from "./policy.mjs";
const root = resolve(import.meta.dirname, "../..");
let profile = localLabProfile(), commandArgs = [];
let privateDir, configFile;
function privatePaths() {
  assertSeparateCheckout(profile.name, path => existsSync(resolve(root, path)));
  for (const path of [resolve(root, ".local"), privateDir, configFile, resolve(privateDir, "postgres.env"), resolve(privateDir, "mail")]) {
    try {
      const entry=lstatSync(path);
      if (entry.isSymbolicLink()) throw new Error("LOCAL_PRIVATE_PATH_SYMLINK");
      if (profile.name === "p0-unified-rc" && ((entry.mode & 0o077) !== 0 ||
          (process.getuid && entry.uid !== process.getuid()))) throw new Error("LOCAL_PRIVATE_PERMISSIONS_REQUIRED");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
function run(exe, args, options = {}) {
  const r = spawnSync(exe, args, { cwd: root, encoding: "utf8", ...options });
  if (r.error || r.status !== 0)
    throw new Error(
      `Falha em ${exe} ${args[0] || ""}; nenhuma credencial foi exibida.`,
    );
  return r.stdout?.trim();
}
function docker(args, options = {}) {
  return run("docker", args, options);
}
function dockerGuard() {
  if (process.env.DOCKER_HOST)
    throw new Error("Remova DOCKER_HOST; somente daemon local é permitido.");
  const context = docker(["context", "show"]);
  const info = JSON.parse(docker(["context", "inspect", context]));
  assertDockerEndpoint(info[0].Endpoints.docker.Host);
}
function inspectOwned(type, name) {
  const result = spawnSync("docker", [type, "inspect", name], {
    encoding: "utf8",
  });
  if (result.status !== 0) return false;
  const object = JSON.parse(result.stdout)[0],
    labels = type === "container" ? object.Config.Labels : object.Labels;
  if (labels?.["pap.local"] !== profile.name)
    throw new Error(
      "Nome ocupado por recurso não pertencente a este ambiente; operação recusada.",
    );
  return object;
}
function assertNoEnvFiles() {
  for (const file of [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.production",
    ".env.production.local",
  ])
    if (existsSync(resolve(root, file)))
      throw new Error(
        `Checkout contém ${file}; use clone/worktree limpo. Arquivo não será alterado.`,
      );
}
function config() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Não execute este launcher em production.");
  assertNoEnvFiles();
  const c = JSON.parse(readFileSync(configFile, "utf8"));
  assertLocalUrl(c.databaseUrl, profile.name);
  if (profile.name !== "admin-beta1" && c.profile !== profile.name)
    throw new Error("LOCAL_PROFILE_CONFIG_REQUIRED");
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== c.databaseUrl)
    throw new Error(
      "DATABASE_URL ambiente diverge do destino local fixo; remova-a antes de continuar.",
    );
  return c;
}
function environment(c) {
  return {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: c.databaseUrl,
    MFA_SECRET_ENCRYPTION_KEY: c.mfaKey,
    MFA_SECRET_ENCRYPTION_KEY_ID: profile.keyId,
    PAP_LOCAL_DEMO: "1",
    PAP_LOCAL_PROFILE: profile.name,
    PAP_LOCAL_DEMO_TEST: "0",
    PAP_FIRST_ACCESS_E2E: "",
    PAP_LOCAL_MAIL_TEST_DIR: "",
    PAP_EMAIL_EXTERNAL_ENABLED: "0",
    RESEND_WEBHOOK_SECRET: "",
    PAP_EMAIL_PROVIDER: "local-demo",
    RESEND_API_KEY: "",
    PAP_EMAIL_FROM: "",
    PAP_PUBLIC_URL: `http://127.0.0.1:${profile.appPort}`,
    AUTH_ALLOWED_ORIGINS: `http://127.0.0.1:${profile.appPort}`,
    AUTH_TRUSTED_CLIENT_IP_HEADER: "",
    PAP_EMAIL_ALLOWED_HOSTS: `127.0.0.1:${profile.appPort}`,
  };
}
async function verify(c) {
  dockerGuard();
  const object = inspectOwned("container", profile.container);
  if (!object || !object.State.Running)
    throw new Error("Inicie o PostgreSQL local com local:start.");
  assertLocalContainer(object, profile.name);
  assertLocalVolume(inspectOwned("volume", profile.volume), profile.name);
  const client = new pg.Client({ connectionString: c.databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
    );
    if (
      rows[0]?.name !== profile.database ||
      rows[0]?.marker !== profile.marker
    )
      throw new Error("LOCAL_DATABASE_MARKER_REQUIRED");
  } finally {
    await client.end();
  }
}
async function question(label, secret = false) {
  if (!process.stdin.isTTY)
    throw new Error(
      "Provisionamento requer terminal interativo; não passe senhas em argumentos.",
    );
  const sink = new Writable({
    write(chunk, encoding, cb) {
      if (!secret) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output: sink,
    terminal: true,
  });
  process.stdout.write(label);
  try {
    return await rl.question("");
  } finally {
    rl.close();
    if (secret) process.stdout.write("\n");
  }
}
async function main() {
  ({ profile, commandArgs } = parseLocalArguments(process.argv.slice(2)));
  privateDir = resolve(root, profile.privateDir);
  configFile = resolve(privateDir, "config.json");
  privatePaths();
  assertNoEnvFiles();
  const command = commandArgs[0];
  if (command === "init") {
    if (existsSync(configFile)) {
      config();
      console.log("Configuração existente preservada.");
      return;
    }
    if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
      throw new Error(
        "Remova DATABASE_URL/NODE_ENV production antes de inicializar.",
      );
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    const password = randomBytes(32).toString("base64url");
    writeFileSync(
      configFile,
      JSON.stringify(
        {
          databaseUrl: `postgresql://${profile.user}:${password}@127.0.0.1:${profile.dbPort}/${profile.database}?schema=public`,
          ...(profile.name !== "admin-beta1" ? { profile: profile.name } : {}),
          mfaKey: randomBytes(32).toString("base64url"),
        },
        null,
        2,
      ) + "\n",
      { flag: "wx", mode: 0o600 },
    );
    config();
    console.log(
      "Configuração privada criada; nenhuma conta de aplicação foi criada.",
    );
    return;
  }
  const c = config(),
    env = environment(c);
  if (command === "start") {
    dockerGuard();
    // Validate both existing resources before creating or starting anything.
    const container = inspectOwned("container", profile.container);
    if (container) assertLocalContainer(container, profile.name);
    const volume = inspectOwned("volume", profile.volume);
    if (volume) assertLocalVolume(volume, profile.name);
    if (container && !volume) throw new Error("LOCAL_VOLUME_MISSING");
    const consumers = docker([
      "ps", "-aq", "--no-trunc", "--filter", `volume=${profile.volume}`,
    ]).split("\n").filter(Boolean);
    if (consumers.some((id) => id !== container?.Id))
      throw new Error("LOCAL_VOLUME_HAS_OTHER_CONSUMERS");
    if (!volume)
      docker([
        "volume",
        "create",
        "--label",
        `pap.local=${profile.name}`,
        profile.volume,
      ]);
    // Only an owned, genuinely empty volume may receive the initial DB marker.
    // Inspect read-only, without PostgreSQL's entrypoint or network access. A
    // failed inspection aborts rather than treating an unreadable volume as empty.
    const contents = docker([
      "run", "--rm", "--network", "none", "--read-only",
      "--entrypoint", "sh", "-v", `${profile.volume}:/data:ro`,
      "postgres:16-alpine", "-ec",
      'entries=$(ls -A /data); if [ -z "$entries" ]; then echo empty; elif [ -f /data/PG_VERSION ]; then echo initialized; else echo populated; fi',
    ]);
    const wasEmpty = contents === "empty";
    if (!wasEmpty && contents !== "initialized")
      throw new Error("LOCAL_VOLUME_INSPECTION_FAILED");
    if (!container) {
      const u = assertLocalUrl(c.databaseUrl, profile.name);
      const envFile = resolve(privateDir, "postgres.env");
      writeFileSync(
        envFile,
        `POSTGRES_USER=${profile.user}\nPOSTGRES_PASSWORD=${u.password}\nPOSTGRES_DB=${profile.database}\n`,
        { mode: 0o600 },
      );
      docker([
        "run",
        "-d",
        "--name",
        profile.container,
        "--label",
        `pap.local=${profile.name}`,
        "--env-file",
        envFile,
        "-p",
        `127.0.0.1:${profile.dbPort}:5432`,
        "-v",
        `${profile.volume}:/var/lib/postgresql/data`,
        "postgres:16-alpine",
      ]);
    } else docker(["start", profile.container]);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const probe = spawnSync(
        "docker",
        [
          "exec",
          profile.container,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-U",
          profile.user,
          "-d",
          profile.database,
        ],
        { stdio: "ignore" },
      );
      if (probe.status === 0) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ready) throw new Error("PostgreSQL local não ficou pronto.");
    // The only SQL allowed before marker verification, inside our labelled local container.
    const started = inspectOwned("container", profile.container);
    assertLocalContainer(started, profile.name);
    if (wasEmpty)
      docker(
        [
          "exec",
          "-i",
          profile.container,
          "psql",
          "-X",
          "-U",
          profile.user,
          "-d",
          profile.database,
          "-v",
          "ON_ERROR_STOP=1",
        ],
        {
          input: `COMMENT ON DATABASE ${profile.database} IS '${profile.marker}';\n`,
        },
      );
    await verify(c);
    console.log(`PostgreSQL isolado pronto em 127.0.0.1:${profile.dbPort}.`);
    return;
  }
  if (command === "stop") {
    dockerGuard();
    const object = inspectOwned("container", profile.container);
    if (object) {
      assertLocalContainer(object, profile.name);
      assertLocalVolume(inspectOwned("volume", profile.volume), profile.name);
      docker(["stop", profile.container]);
    }
    console.log("Parado; volume e dados locais preservados.");
    return;
  }
  if (command === "mail") {
    const dir = resolve(privateDir, "mail");
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .sort()
      : [];
    if (!commandArgs[1]) {
      files.forEach((f, i) => {
        const m = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
        console.log(`${i + 1}. ${m.to} — ${m.subject}`);
      });
      if (!files.length) console.log("Nenhum e-mail local.");
      return;
    }
    const index = Number(commandArgs[1]) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= files.length)
      throw new Error("Número de mensagem inválido.");
    const message = JSON.parse(
      readFileSync(resolve(dir, files[index]), "utf8"),
    );
    console.log(message.text);
    console.log(
      "HTML privado:",
      resolve(dir, files[index].replace(".json", ".html")),
    );
    return;
  }
  await verify(c);
  if (command === "migrate") {
    run(process.execPath, ["node_modules/prisma/build/index.js", "generate"], {
      env,
      stdio: "inherit",
    });
    run(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env, stdio: "inherit" },
    );
    run(
      process.execPath,
      ["--import", "tsx", "scripts/local/provision.ts", "iam"],
      { env, stdio: "inherit" },
    );
    return;
  }
  if (command === "seed") {
    run(process.execPath,["--import","tsx","scripts/local/seed-unified.ts"],{env,stdio:"inherit"});
    return;
  }
  if (command === "admin") {
    if (profile.name !== "admin-beta1")
      console.log("Perfil P0: use e-mail distinto do laboratório anterior e preserve a entrada TOTP antiga.");
    const email = await question("E-mail do primeiro PAP_ADMIN local: "),
      displayName = await question("Nome: "),
      password = await question("Senha (mínimo 12 caracteres, oculta): ", true),
      confirmation = await question("Confirme a senha: ", true);
    if (password !== confirmation) throw new Error("Senhas não coincidem.");
    run(
      process.execPath,
      ["--import", "tsx", "scripts/local/provision.ts", "admin"],
      {
        env,
        input: JSON.stringify({ email, displayName, password }),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    return;
  }
  if (command === "dev") {
    if (profile.name !== "admin-beta1")
      console.log(`Abra 127.0.0.1:${profile.appPort} somente em perfil de navegador separado; cookies não são isolados por porta.`);
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        profile.appPort,
      ],
      { cwd: root, env, stdio: "inherit" },
    );
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
    return;
  }
  throw new Error("Comando local desconhecido.");
}
main().catch(() => {
  console.error(
    "Operação local recusada/falhou. Confira daemon local, arquivos .env, perfil, porta e marker e instruções em docs/admin/local-development.md. Nenhuma credencial será exibida.",
  );
  process.exitCode = 1;
});
