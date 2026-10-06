import { createHash } from "node:crypto";

import { execSync } from "node:child_process";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";

import { join } from "node:path";

const force = process.argv.includes("--force");

const root = process.cwd();

const auditDir = join(root, ".test-audit");

const historyDir = join(auditDir, "history");

mkdirSync(historyDir, {
  recursive: true,
});

const modules = JSON.parse(
  readFileSync(join(root, "scripts/testing/f03-modules.json"), "utf8"),
);

function shell(command) {
  return execSync(command, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryShell(command) {
  try {
    return shell(command);
  } catch {
    return "";
  }
}

const branch = shell("git branch --show-current");

const commit = shell("git rev-parse HEAD");

const mergeBase = tryShell("git merge-base HEAD develop") || commit;

const changed = new Set();

for (const command of [
  `git diff --name-only ${mergeBase}...HEAD`,
  "git diff --name-only",
  "git diff --cached --name-only",
  "git ls-files --others --exclude-standard",
]) {
  const output = tryShell(command);

  for (const file of output.split("\n")) {
    if (file.trim()) {
      changed.add(file.trim());
    }
  }
}

const changedFiles = [...changed].sort();

function matches(file, patterns) {
  return patterns.some(
    (pattern) => file === pattern || file.startsWith(pattern),
  );
}

function gitDiffFor(file) {
  const tracked = tryShell(
    `git ls-files --error-unmatch '${file}' 2>/dev/null`,
  );

  if (!tracked) {
    return "";
  }

  const parts = [];

  const committed = tryShell(`git diff ${mergeBase}...HEAD -- '${file}'`);

  const working = tryShell(`git diff -- '${file}'`);

  const cached = tryShell(`git diff --cached -- '${file}'`);

  if (committed) {
    parts.push(committed);
  }

  if (working) {
    parts.push(working);
  }

  if (cached) {
    parts.push(cached);
  }

  return parts.join("\n");
}

const directlyAffected = new Set();

const directReasons = {};

function markDirect(module, reason) {
  if (!modules[module]) {
    return;
  }

  directlyAffected.add(module);

  directReasons[module] ??= [];

  if (!directReasons[module].includes(reason)) {
    directReasons[module].push(reason);
  }
}

for (const [name, config] of Object.entries(modules)) {
  for (const file of changedFiles) {
    if (matches(file, config.watch)) {
      markDirect(name, `watched-file:${file}`);
    }
  }
}

const schemaChanged = changedFiles.includes("prisma/schema.prisma");

if (schemaChanged) {
  const schemaDiff = gitDiffFor("prisma/schema.prisma");

  const schemaChangedLines = schemaDiff
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") || line.startsWith("-")) &&
        !line.startsWith("+++") &&
        !line.startsWith("---"),
    )
    .join("\n");

  const governanceOnlySchemaChange = schemaChangedLines
    .split("\n")
    .filter(Boolean)
    .every(
      (line) =>
        line.includes("clinicalAuditEvents") ||
        line.includes("patientId") ||
        line.includes("ClinicalAuditPatient") ||
        line.includes("audit_events_patientId"),
    );

  const schemaRules = {
    patient: ["model Patient ", "model PatientOrganization "],

    pregnancy: ["model Pregnancy "],

    encounter: ["model Encounter "],

    "vital-signs": [
      "model VitalSigns ",
      "enum ConsciousnessState ",
      "enum ProteinuriaResult ",
    ],

    "obstetric-data": ["model ObstetricData ", "enum EdemaGrade "],

    "allergies-flags": [
      "model Allergy ",
      "model ClinicalFlag ",
      "enum AllergyStatus ",
      "enum ClinicalFlagStatus ",
    ],

    meows: [
      "model ClinicalEvaluation ",
      "enum MeowsEvaluationStatus ",
      "enum AlertLevel ",
    ],

    "clinical-governance": [
      "model AuditEvent ",
      '@relation("ClinicalAuditPatient")',
    ],
  };

  for (const [module, tokens] of Object.entries(schemaRules)) {
    if (module === "patient" && governanceOnlySchemaChange) {
      continue;
    }

    if (tokens.some((token) => schemaDiff.includes(token))) {
      markDirect(module, "schema-model-change");
    }
  }

  if (governanceOnlySchemaChange) {
    markDirect("clinical-governance", "schema-governance-relation");
  }
}

const permissionsChanged = changedFiles.includes(
  "src/server/iam/permissions.ts",
);

const roleCatalogChanged = changedFiles.includes(
  "src/server/iam/system-role-catalog.ts",
);

if (permissionsChanged || roleCatalogChanged) {
  const iamDiff = [
    permissionsChanged ? gitDiffFor("src/server/iam/permissions.ts") : "",

    roleCatalogChanged
      ? gitDiffFor("src/server/iam/system-role-catalog.ts")
      : "",
  ].join("\n");

  const iamChangedLines = iamDiff
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") || line.startsWith("-")) &&
        !line.startsWith("+++") &&
        !line.startsWith("---"),
    )
    .join("\n");

  const iamRules = {
    patient: ["PATIENT_"],

    pregnancy: ["PREGNANCY_"],

    encounter: ["ENCOUNTER_"],

    "vital-signs": ["VITAL_SIGNS_"],

    "obstetric-data": ["OBSTETRIC_DATA_"],

    "allergies-flags": ["ALLERGY_", "CLINICAL_FLAG_"],

    meows: ["MEOWS_"],

    "clinical-governance": ["CLINICAL_REVISION_"],
  };

  for (const [module, prefixes] of Object.entries(iamRules)) {
    if (prefixes.some((prefix) => iamChangedLines.includes(prefix))) {
      markDirect(module, "iam-permission-change");
    }
  }
}

const trulyGlobalFiles = [
  "src/server/iam/authorization.service.ts",
  "src/server/patients/patient-organization.service.ts",
  "src/server/db/client.ts",
];

for (const file of trulyGlobalFiles) {
  if (changedFiles.includes(file)) {
    for (const name of Object.keys(modules)) {
      markDirect(name, `global-clinical-file:${file}`);
    }
  }
}

const selected = new Set(directlyAffected);

const relationships = [];

const queue = [...directlyAffected];

while (queue.length) {
  const source = queue.shift();

  for (const dependent of modules[source]?.dependents ?? []) {
    relationships.push({
      from: source,
      to: dependent,
      reason: "dependent-module",
    });

    if (!selected.has(dependent)) {
      selected.add(dependent);

      queue.push(dependent);
    }
  }
}

function walk(path) {
  if (!existsSync(path)) {
    return [];
  }

  const stat = statSync(path);

  if (stat.isFile()) {
    return [path];
  }

  const files = [];

  for (const entry of readdirSync(path)) {
    files.push(...walk(join(path, entry)));
  }

  return files;
}

function fingerprintModule(name) {
  const hash = createHash("sha256");

  const config = modules[name];

  const sharedByModule = {
    patient: [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    pregnancy: [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    encounter: [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    "vital-signs": [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    "obstetric-data": [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    "allergies-flags": [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    meows: [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
    ],

    "clinical-governance": [
      "src/server/iam/authorization.service.ts",
      "src/server/patients/patient-organization.service.ts",
      "src/server/iam/permissions.ts",
      "src/server/iam/system-role-catalog.ts",
      "prisma/schema.prisma",
    ],

    "clinical-api-ui": [
      "src/server/patients/",
      "src/server/pregnancies/",
      "src/server/encounters/",
      "src/server/vital-signs/",
      "src/server/obstetric-data/",
      "src/server/allergies/",
      "src/server/clinical-flags/",
      "src/server/meows/",
      "src/server/clinical-revision/",
      "src/server/clinical-authorization/",
      "src/server/auth/session.service.ts",
      "src/server/auth/http-auth.ts",
      "src/server/http/http-auth.guard.ts",
      "src/server/http/organization-context.ts",
      "src/server/iam/authorization.service.ts",
      "src/server/iam/permissions.ts",
      "src/server/iam/system-role-catalog.ts",
      "src/server/patients/patient-organization.service.ts",
      "prisma/schema.prisma",
    ],
  };

  const paths = [...config.watch, ...(sharedByModule[name] ?? [])];

  const files = new Set();

  for (const relative of paths) {
    const absolute = join(root, relative);

    for (const file of walk(absolute)) {
      files.add(file);
    }
  }

  for (const file of [...files].sort()) {
    hash.update(file);
    hash.update(readFileSync(file));
  }

  return hash.digest("hex");
}

const cachePath = join(auditDir, "module-status.json");

let cache = {};

if (existsSync(cachePath)) {
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf8"));
  } catch {
    cache = {};
  }
}

const results = {};

for (const name of selected) {
  const config = modules[name];

  const fingerprint = fingerprintModule(name);

  const cached = cache[name];

  if (
    !force &&
    cached?.status === "PASS" &&
    cached?.fingerprint === fingerprint
  ) {
    console.log(`SKIP  ${name} — cached PASS`);

    results[name] = {
      status: "CACHED_PASS",

      fingerprint,

      command: config.command,
    };

    continue;
  }

  console.log(`RUN   ${name}`);

  const started = Date.now();

  try {
    execSync(config.command, {
      cwd: root,
      stdio: "inherit",
    });

    const durationMs = Date.now() - started;

    console.log(`PASS  ${name} (${durationMs}ms)`);

    results[name] = {
      status: "PASS",

      durationMs,

      fingerprint,

      command: config.command,
    };

    cache[name] = {
      status: "PASS",

      fingerprint,

      commit,
    };
  } catch {
    const durationMs = Date.now() - started;

    console.log(`FAIL  ${name} (${durationMs}ms)`);

    results[name] = {
      status: "FAIL",

      durationMs,

      fingerprint,

      command: config.command,
    };

    cache[name] = {
      status: "FAIL",

      fingerprint,

      commit,
    };

    break;
  }
}

writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n");

const runId = new Date().toISOString().replace(/[:.]/g, "-");

const log = {
  runId,
  branch,
  commit,
  mergeBase,
  changedFiles,

  directlyAffected: [...directlyAffected],

  directReasons,

  selectedModules: [...selected],

  relationships,

  results,
};

const serialized = JSON.stringify(log, null, 2) + "\n";

writeFileSync(join(auditDir, "latest.json"), serialized);

writeFileSync(join(historyDir, `${runId}.json`), serialized);

console.log("\n========================================");

console.log(" F03 SMART TEST SUMMARY");

console.log("========================================");

console.log(`changed=${changedFiles.length}`);

console.log(`direct=${directlyAffected.size}`);

console.log(`selected=${selected.size}`);

for (const name of selected) {
  const result = results[name];

  console.log(`${result.status.padEnd(11)} ${name}`);
}

const failed = Object.values(results).some(
  (result) => result.status === "FAIL",
);

if (failed) {
  console.log("\nF03 SMART TEST: FAIL");

  process.exitCode = 1;
} else {
  console.log("\nF03 SMART TEST: PASS");
}
