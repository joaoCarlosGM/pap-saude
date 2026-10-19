import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
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
  LOCAL_DB,
  LOCAL_CONTAINER,
  LOCAL_VOLUME,
} from "./policy.mjs";
const root = resolve(import.meta.dirname, "../..");
const privateDir = resolve(root, ".local/pap-admin"),
  configFile = resolve(privateDir, "config.json");
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
  if (labels?.["pap.local"] !== "admin-beta1")
    throw new Error(
      "Nome ocupado por recurso não pertencente a este ambiente; operação recusada.",
    );
  return object;
}
function config() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Não execute este launcher em production.");
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
  const c = JSON.parse(readFileSync(configFile, "utf8"));
  assertLocalUrl(c.databaseUrl);
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
    MFA_SECRET_ENCRYPTION_KEY_ID: "local-admin-beta1",
    PAP_LOCAL_DEMO: "1",
    PAP_EMAIL_PROVIDER: "local-demo",
    RESEND_API_KEY: "",
    PAP_EMAIL_FROM: "",
    PAP_PUBLIC_URL: "http://127.0.0.1:3100",
    AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:3100",
    AUTH_TRUSTED_CLIENT_IP_HEADER: "",
    PAP_EMAIL_ALLOWED_HOSTS: "127.0.0.1:3100",
  };
}
async function verify(c) {
  dockerGuard();
  const object = inspectOwned("container", LOCAL_CONTAINER);
  if (!object || !object.State.Running)
    throw new Error("Inicie o PostgreSQL local com local:start.");
  assertLocalContainer(object);
  if (!inspectOwned("volume", LOCAL_VOLUME))
    throw new Error("Local volume missing");
  const client = new pg.Client({ connectionString: c.databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
    );
    if (
      rows[0]?.name !== LOCAL_DB ||
      rows[0]?.marker !== "pap-local-admin-beta1"
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
  const command = process.argv[2];
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
          databaseUrl: `postgresql://pap_local:${password}@127.0.0.1:15432/${LOCAL_DB}?schema=public`,
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
    const container = inspectOwned("container", LOCAL_CONTAINER);
    if (container) assertLocalContainer(container);
    const volume = inspectOwned("volume", LOCAL_VOLUME);
    if (volume && (volume.Driver !== "local" || Object.keys(volume.Options || {}).length))
      throw new Error("LOCAL_PLAIN_VOLUME_REQUIRED");
    if (container && !volume) throw new Error("LOCAL_VOLUME_MISSING");
    const consumers = docker([
      "ps", "-aq", "--no-trunc", "--filter", `volume=${LOCAL_VOLUME}`,
    ]).split("\n").filter(Boolean);
    if (consumers.some((id) => id !== container?.Id))
      throw new Error("LOCAL_VOLUME_HAS_OTHER_CONSUMERS");
    if (!volume)
      docker([
        "volume",
        "create",
        "--label",
        "pap.local=admin-beta1",
        LOCAL_VOLUME,
      ]);
    // Only an owned, genuinely empty volume may receive the initial DB marker.
    // Inspect read-only, without PostgreSQL's entrypoint or network access. A
    // failed inspection aborts rather than treating an unreadable volume as empty.
    const contents = docker([
      "run", "--rm", "--network", "none", "--read-only",
      "--entrypoint", "sh", "-v", `${LOCAL_VOLUME}:/data:ro`,
      "postgres:16-alpine", "-ec",
      'entries=$(ls -A /data); if [ -z "$entries" ]; then echo empty; elif [ -f /data/PG_VERSION ]; then echo initialized; else echo populated; fi',
    ]);
    const wasEmpty = contents === "empty";
    if (!wasEmpty && contents !== "initialized")
      throw new Error("LOCAL_VOLUME_INSPECTION_FAILED");
    if (!container) {
      const u = assertLocalUrl(c.databaseUrl);
      const envFile = resolve(privateDir, "postgres.env");
      writeFileSync(
        envFile,
        `POSTGRES_USER=pap_local\nPOSTGRES_PASSWORD=${u.password}\nPOSTGRES_DB=${LOCAL_DB}\n`,
        { mode: 0o600 },
      );
      docker([
        "run",
        "-d",
        "--name",
        LOCAL_CONTAINER,
        "--label",
        "pap.local=admin-beta1",
        "--env-file",
        envFile,
        "-p",
        "127.0.0.1:15432:5432",
        "-v",
        `${LOCAL_VOLUME}:/var/lib/postgresql/data`,
        "postgres:16-alpine",
      ]);
    } else docker(["start", LOCAL_CONTAINER]);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const probe = spawnSync(
        "docker",
        [
          "exec",
          LOCAL_CONTAINER,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-U",
          "pap_local",
          "-d",
          LOCAL_DB,
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
    const started = inspectOwned("container", LOCAL_CONTAINER);
    assertLocalContainer(started);
    if (wasEmpty)
      docker(
        [
          "exec",
          "-i",
          LOCAL_CONTAINER,
          "psql",
          "-X",
          "-U",
          "pap_local",
          "-d",
          LOCAL_DB,
          "-v",
          "ON_ERROR_STOP=1",
        ],
        {
          input: `COMMENT ON DATABASE ${LOCAL_DB} IS 'pap-local-admin-beta1';\n`,
        },
      );
    await verify(c);
    console.log("PostgreSQL isolado pronto em 127.0.0.1:15432.");
    return;
  }
  if (command === "stop") {
    dockerGuard();
    if (inspectOwned("container", LOCAL_CONTAINER))
      docker(["stop", LOCAL_CONTAINER]);
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
    if (!process.argv[3]) {
      files.forEach((f, i) => {
        const m = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
        console.log(`${i + 1}. ${m.to} — ${m.subject}`);
      });
      if (!files.length) console.log("Nenhum e-mail local.");
      return;
    }
    const index = Number(process.argv[3]) - 1;
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
  if (command === "admin") {
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
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3100",
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
    "Operação local recusada/falhou. Confira daemon local, arquivos .env, porta 15432, marker e instruções em docs/admin/local-development.md. Nenhuma credencial será exibida.",
  );
  process.exitCode = 1;
});
