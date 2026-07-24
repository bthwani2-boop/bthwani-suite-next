/**
 * tools/guards/repository-naming-gate.mjs
 *
 * BTHWANI_REPOSITORY_STRUCTURE_GOVERNANCE_GATE — File & Folder Naming Layer
 *
 * Rules (enforced via regex, no external dependency):
 *   FAIL:   Go files not snake_case, SQL migrations not matching 0001_desc.sql
 *   FAIL:   folders with forbidden names (temp/tmp/test2/final/new/old/copy)
 *   WARN:   React component files not PascalCase
 *   WARN:   guard files not kebab-case-gate.mjs pattern
 *   WARN:   script files not kebab-case.mjs/.ps1 pattern
 *
 * Hooks, contexts, controllers, policies, registries and other modules are not
 * React components and retain objective kebab-case module names.
 *
 * Scope: apps/, services/, shared/, tools/guards/, tools/scripts/
 * Excludes: node_modules, dist, build, generated, android, ios, .git
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "repository-naming-gate";
const violations = [];
const warnings = [];

const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*(\.[a-z]+)+$/;
const SNAKE_CASE_GO = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.go$/;
const SQL_MIGRATION = /^\d{3,4}_[a-z0-9_]+\.sql$/;
const GUARD_FILE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*-gate\.mjs$/;
const SCRIPT_FILE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.(mjs|ps1|sh)$/;

const FORBIDDEN_FOLDER_NAMES = new Set([
  "temp", "tmp", "test2", "final", "new", "old", "copy",
  "backup", "bak", "archive", "misc", "stuff", "junk",
  "TEMP", "TMP", "BACKUP",
]);

const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics", "__generated__", "generated",
]);

const NAMING_ALLOWLIST_FILES = new Set([
  "index.ts", "index.tsx", "index.js",
  "App.tsx", "App.ts", "_app.tsx", "_document.tsx",
  "_layout.tsx", "_layout.ts", "_shared.tsx",
  "repository-naming-gate.mjs",
  "brand-identity-report.mjs",
  "go-routes-ci.mjs",
  "no-broken-imports.mjs",
  "nomenclature-guard.mjs",
  "_external-tool-runner.mjs",
]);

const ALLOWLIST_PATH_PREFIXES = [
  "services/dsh/database/migrations",
  "services/wlt/database/migrations",
  "tools/registry",
  ".agents",
  "governance",
  "docs",
];

function walk(dir, cb) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (ALLOWLIST_PATH_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
      cb({ full, rel, name: entry.name, isDir: true });
      walk(full, cb);
    } else {
      if (ALLOWLIST_PATH_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
      cb({ full, rel, name: entry.name, isDir: false });
    }
  }
}

function isNonComponentTsxModule(name) {
  return name.startsWith("use-") ||
    name.startsWith("_") ||
    /(?:-controller|-flow|-session|-pricing)\.tsx$/.test(name) ||
    /\.(?:controller|context|contract|contracts|helper|helpers|model|policy|registry|types|view-model)\.tsx$/.test(name);
}

function looksLikeReactComponent(rel, name) {
  if (isNonComponentTsxModule(name)) return false;
  return rel.includes("/components/") ||
    rel.includes("/screens/") ||
    rel.includes("/shell/") ||
    /(?:Screen|Page|View|Panel|Card|Header|Footer|Modal|Dialog|Button|List|Table|Row|Section|Shell|Frame|Picker|Menu|Bell)\.tsx$/.test(name);
}

const SCAN_ROOTS = ["apps", "services", "shared", "tools/guards", "tools/scripts"];

for (const root of SCAN_ROOTS) {
  walk(path.join(repoRoot, root), ({ rel, name, isDir }) => {
    if (isDir) {
      if (FORBIDDEN_FOLDER_NAMES.has(name)) {
        violations.push({
          file: `${rel}/`,
          line: 0,
          message: `FORBIDDEN_FOLDER: Folder named '${name}' indicates disorder. Use a descriptive, kebab-case name.`,
        });
      }
      return;
    }

    if (NAMING_ALLOWLIST_FILES.has(name)) return;

    const ext = path.extname(name).toLowerCase();

    if (ext === ".go") {
      if (!SNAKE_CASE_GO.test(name)) {
        violations.push({
          file: rel,
          line: 0,
          message: `GO_NAMING: Go file '${name}' must be snake_case.go (e.g. my_handler.go).`,
        });
      }
      return;
    }

    if (ext === ".sql" && rel.includes("/migrations/")) {
      if (!SQL_MIGRATION.test(name)) {
        violations.push({
          file: rel,
          line: 0,
          message: `SQL_MIGRATION_NAMING: Migration file '${name}' must match pattern: 0001_description.sql`,
        });
      }
      return;
    }

    if (rel.startsWith("tools/guards/") && ext === ".mjs" && !name.startsWith("_")) {
      const validatorOrLibrary = rel.startsWith("tools/guards/sdlc/validate-") || rel.startsWith("tools/guards/lib/");
      if (!validatorOrLibrary && !GUARD_FILE.test(name)) {
        warnings.push({
          file: rel,
          line: 0,
          message: `GUARD_NAMING: Guard file '${name}' should follow pattern: kebab-case-gate.mjs`,
        });
      }
      return;
    }

    if (rel.startsWith("tools/scripts/") && (ext === ".mjs" || ext === ".ps1" || ext === ".sh")) {
      const testModule = name.endsWith(".test.mjs");
      if (!testModule && !SCRIPT_FILE.test(name)) {
        warnings.push({
          file: rel,
          line: 0,
          message: `SCRIPT_NAMING: Script file '${name}' should be kebab-case${ext} (e.g. run-checks.mjs).`,
        });
      }
      return;
    }

    if (ext === ".tsx" && looksLikeReactComponent(rel, name) && !PASCAL_CASE.test(name)) {
      warnings.push({
        file: rel,
        line: 0,
        message: `COMPONENT_NAMING: Component file '${name}' should be PascalCase.tsx (e.g. MyComponent.tsx).`,
      });
    }
  });
}

const migrationDirs = [
  "services/dsh/database/migrations",
  "services/wlt/database/migrations",
];
for (const migDir of migrationDirs) {
  const fullDir = path.join(repoRoot, migDir);
  if (!fs.existsSync(fullDir)) continue;
  const sqlFiles = fs
    .readdirSync(fullDir)
    .filter((file) => file.endsWith(".sql") && SQL_MIGRATION.test(file))
    .sort();

  for (let index = 0; index < sqlFiles.length - 1; index += 1) {
    const current = Number.parseInt(sqlFiles[index].split("_")[0], 10);
    const next = Number.parseInt(sqlFiles[index + 1].split("_")[0], 10);
    if (next - current > 1) {
      warnings.push({
        file: `${migDir}/${sqlFiles[index + 1]}`,
        line: 0,
        message: `SQL_MIGRATION_GAP: Migration sequence gap detected between ${sqlFiles[index]} and ${sqlFiles[index + 1]}.`,
      });
    }
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length} naming issues — fix progressively):`);
  for (const warning of warnings) {
    console.log(`  ⚠  ${warning.file} — ${warning.message}`);
  }
}

console.log("Running repository-pinned ls-lint naming checks...");
const lsLint = spawnSync("pnpm", ["exec", "ls-lint"], {
  cwd: repoRoot,
  env: process.env,
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 16 * 1024 * 1024,
});

if (lsLint.stdout) process.stdout.write(lsLint.stdout);
if (lsLint.stderr) process.stderr.write(lsLint.stderr);

if (lsLint.error || lsLint.status !== 0) {
  const output = `${lsLint.stdout ?? ""}\n${lsLint.stderr ?? ""}`
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const diagnostic = output.find((line) => /(?:fail|error|invalid|must|expected|not\s+)/i.test(line))
    ?? output.at(-1)
    ?? lsLint.error?.message
    ?? `ls-lint exited with ${lsLint.status ?? 1}`;
  const file = diagnostic.match(/(?:^|\s)([.\w@\[\]/-]+\.(?:ts|tsx|js|jsx|mjs|cjs|go|sql|yml|yaml|json|ps1|sh))(?:\s|:|$)/i)?.[1]
    ?? ".ls-lint.yml";
  violations.push({
    file,
    line: 0,
    message: `LS_LINT_FAILED: ${diagnostic.slice(0, 220)}`,
  });
}

fail(guardId, violations);
