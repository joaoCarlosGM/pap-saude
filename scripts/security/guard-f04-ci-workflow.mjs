import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");
const prisma = readFileSync("prisma.config.ts", "utf8");
const test = readFileSync("scripts/test-f04-db-invariants.sh", "utf8");

// Independent static guard so that removing the F04 security gate cannot
// silently turn CI into a lint/build-only release pipeline.
for (const token of [
  "      - prod",
  "      - develop",
  "      - feature/foundation-04-admin-core",
  "run: npm audit --omit=dev --audit-level=high",
  "run: npm run audit:f04:operations",
  "run: node scripts/security/guard-f04-ci-workflow.mjs",
  "docker run --rm -d --name pap_saude_db",
  "Verify Prisma fails closed without DATABASE_URL",
  "if: github.event_name == 'push' && github.ref == 'refs/heads/prod'",
]) {
  assert.ok(workflow.includes(token), `Missing F04 CI invariant: ${token}`);
}
assert.equal(
  workflow.split("if: github.event_name == 'push' && github.ref == 'refs/heads/prod'").length - 1,
  2,
  "Both publish and deploy must be gated to prod push",
);
assert.match(workflow, /needs: validate/);
assert.match(workflow, /needs: publish/);
assert.match(dockerfile, /ci_no_connect:ci_no_connect@127\.0\.0\.1/);
assert.match(prisma, /DATABASE_URL must be configured explicitly/);
assert.doesNotMatch(prisma, /process\.env\.DATABASE_URL\s*\?\?/);
assert.match(test, /GITHUB_ACTIONS/);
const integratedAudit = readFileSync("scripts/audit-f04-operations.sh", "utf8");
assert.match(workflow, /run: npx next typegen/);
assert.match(integratedAudit, /npx next typegen\s*\nnpx tsc --noEmit/);
const migratorPackage = JSON.parse(
  readFileSync("docker/migrator/package.json", "utf8")
);
const migratorLock = JSON.parse(
  readFileSync("docker/migrator/package-lock.json", "utf8")
);
const rootLock = JSON.parse(readFileSync("package-lock.json", "utf8"));

assert.deepEqual(Object.keys(migratorPackage.dependencies), ["prisma"]);
assert.equal(
  migratorPackage.dependencies.prisma,
  rootLock.packages["node_modules/prisma"].version
);
assert.equal(
  migratorLock.packages["node_modules/prisma"].version,
  migratorPackage.dependencies.prisma
);
assert.match(dockerfile, /FROM base AS migrator-deps/);
assert.match(
  dockerfile,
  /COPY --from=migrator-deps \/app\/node_modules \.\/node_modules/
);
assert.match(
  workflow,
  /npm audit --prefix docker\/migrator --include=dev --audit-level=high/
);
assert.match(workflow, /Verify isolated migrator image/);

const functionalMigratorTest = readFileSync(
  "scripts/test-f04-migrator-image.sh", "utf8"
);
assert.match(
  workflow,
  /run: bash scripts\/test-f04-migrator-image\.sh pap-saude-migrator:ci/
);
assert.match(functionalMigratorTest, /_prisma_migrations/);
assert.match(functionalMigratorTest, /trap cleanup EXIT/);
assert.match(functionalMigratorTest, /for run in 1 2/);

assert.match(
  workflow,
  /-e DATABASE_URL=postgresql:\/\/ci_no_connect:ci_no_connect@127\.0\.0\.1:5432\/pap_saude_cli_validation_only\?schema=public/
);
console.log("PASS F04.10 CI workflow guard: gates + branch isolation + fail-closed Prisma");
