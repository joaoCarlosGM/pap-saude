import { readFileSync, readdirSync, statSync } from "node:fs";

import { join, relative } from "node:path";

const root = process.cwd();

const sourceRoot = join(root, "src");

const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const forbidden = [
  {
    label: "Prisma raw SQL API",

    pattern: /\$(?:queryRawUnsafe|executeRawUnsafe|queryRaw|executeRaw)\b/,
  },

  {
    label: "direct node-postgres import",

    pattern: /(?:from\s+["']pg["']|require\(\s*["']pg["']\s*\))/,
  },
];

function extension(path) {
  const match = path.match(/\.[^.]+$/);

  return match?.[0] ?? "";
}

function walk(path) {
  const stat = statSync(path);

  if (stat.isFile()) {
    return extensions.has(extension(path)) ? [path] : [];
  }

  const files = [];

  for (const entry of readdirSync(path)) {
    files.push(...walk(join(path, entry)));
  }

  return files;
}

const violations = [];

for (const file of walk(sourceRoot)) {
  const content = readFileSync(file, "utf8");

  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    for (const rule of forbidden) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relative(root, file),

          line: index + 1,

          label: rule.label,

          source: line.trim(),
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\nSQL QUERY SAFETY GUARD: FAIL\n");

  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}`);

    console.error(`  ${violation.label}`);

    console.error(`  ${violation.source}`);
  }

  console.error("\nProduction code must use the Prisma query API.");

  console.error("Raw SQL requires a dedicated audited exception.");

  process.exit(1);
}

console.log("PASS no raw SQL execution APIs in production source");

console.log("PASS no direct node-postgres access in production source");

console.log("PASS production DB access policy: Prisma query API only");
