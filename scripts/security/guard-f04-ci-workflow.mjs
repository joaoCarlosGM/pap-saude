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
console.log("PASS F04.10 CI workflow guard: gates + branch isolation + fail-closed Prisma");
