/**
 * tools/guards/repository-naming-gate.mjs
 *
 * BTHWANI_REPOSITORY_STRUCTURE_GOVERNANCE_GATE — File & Folder Naming Layer
 *
 * Rules (enforced via regex, no external dependency):
 *   FAIL:   Go files not snake_case, SQL migrations not matching 0001_desc.sql
 *   FAIL:   folders with forbidden names (temp/tmp/test2/final/new/old/copy)
 *   WARN:   TSX/TS components not PascalCase (legacy files may exist)
 *   WARN:   guard files not kebab-case-gate.mjs pattern
 *   WARN:   script files not kebab-case.mjs/.ps1 pattern
 *
 * Scope: apps/, services/, shared/, tools/guards/, tools/scripts/
 * Excludes: node_modules, dist, build, generated, android, ios, .git
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "repository-naming-gate";
const violations = [];
const warnings = [];

// ── Patterns ──────────────────────────────────────────────────────────────────
const PASCAL_CASE   = /^[A-Z][a-zA-Z0-9]*(\.[a-z]+)+$/;
const KEBAB_CASE    = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z]+)+$/;
const SNAKE_CASE_GO = /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.go$/;
const SQL_MIGRATION = /^\d{3,4}_[a-z0-9_]+\.sql$/;
const GUARD_FILE    = /^[a-z][a-z0-9]*(-[a-z0-9]+)*-gate\.mjs$/;
const SCRIPT_FILE   = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.(mjs|ps1|sh)$/;

// Folder names that indicate disorder
const FORBIDDEN_FOLDER_NAMES = new Set([
  "temp", "tmp", "test2", "final", "new", "old", "copy",
  "backup", "bak", "archive", "misc", "stuff", "junk",
  "TEMP", "TMP", "BACKUP",
]);

// ── Exclusions ────────────────────────────────────────────────────────────────
const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics", "__generated__", "generated",
]);

// Known allowlisted filenames that break pattern rules intentionally
const NAMING_ALLOWLIST_FILES = new Set([
  // React Native / Expo entry points
  "index.ts", "index.tsx", "index.js",
  // Config / meta files
  "App.tsx", "App.ts", "_app.tsx", "_document.tsx",
  "_layout.tsx", "_layout.ts",
  // This gate itself
  "repository-naming-gate.mjs",
]);

// Allowlisted path patterns (prefixes) — skip naming checks inside these
const ALLOWLIST_PATH_PREFIXES = [
  "services/dsh/database/migrations", // already checked via SQL_MIGRATION
  "services/wlt/database/migrations",
  "tools/registry",
  ".agents",
  "governance",
  "docs",
];

// ── Walker ────────────────────────────────────────────────────────────────────
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
      if (ALLOWLIST_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
      cb({ full, rel, name: entry.name, isDir: true });
      walk(full, cb);
    } else {
      if (ALLOWLIST_PATH_PREFIXES.some((p) => rel.startsWith(p))) continue;
      cb({ full, rel, name: entry.name, isDir: false });
    }
  }
}

// ── Scan roots ────────────────────────────────────────────────────────────────
const SCAN_ROOTS = ["apps", "services", "shared", "tools/guards", "tools/scripts"];

for (const root of SCAN_ROOTS) {
  walk(path.join(repoRoot, root), ({ rel, name, isDir }) => {

    // ── 1. Forbidden folder names ───────────────────────────────────────────
    if (isDir) {
      if (FORBIDDEN_FOLDER_NAMES.has(name)) {
        violations.push({
          file: rel + "/",
          line: 0,
          message: `FORBIDDEN_FOLDER: Folder named '${name}' indicates disorder. Use a descriptive, kebab-case name.`,
        });
      }
      return;
    }

    // ── File-level checks ───────────────────────────────────────────────────
    if (NAMING_ALLOWLIST_FILES.has(name)) return;

    const ext = path.extname(name).toLowerCase();

    // ── 2. Go files — snake_case.go (FAIL) ─────────────────────────────────
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

    // ── 3. SQL migrations — 0001_description.sql (FAIL) ────────────────────
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

    // ── 4. Guards — kebab-case-gate.mjs (WARN) ─────────────────────────────
    if (rel.startsWith("tools/guards/") && ext === ".mjs" && !name.startsWith("_")) {
      if (!GUARD_FILE.test(name)) {
        warnings.push({
          file: rel,
          line: 0,
          message: `GUARD_NAMING: Guard file '${name}' should follow pattern: kebab-case-gate.mjs`,
        });
      }
      return;
    }

    // ── 5. Scripts — kebab-case.mjs/.ps1 (WARN) ────────────────────────────
    if (rel.startsWith("tools/scripts/") && (ext === ".mjs" || ext === ".ps1" || ext === ".sh")) {
      if (!SCRIPT_FILE.test(name)) {
        warnings.push({
          file: rel,
          line: 0,
          message: `SCRIPT_NAMING: Script file '${name}' should be kebab-case${ext} (e.g. run-checks.mjs).`,
        });
      }
      return;
    }

    // ── 6. React/RN components (.tsx) — PascalCase (WARN) ──────────────────
    if (ext === ".tsx") {
      // Skip non-component files: hooks, adapters, view-models, etc.
      const looksLikeComponent =
        rel.includes("/components/") ||
        rel.includes("/screens/") ||
        rel.includes("/shell/") ||
        rel.includes("/shared/") ||
        name.endsWith("Screen.tsx") ||
        name.endsWith("Page.tsx") ||
        name.endsWith("View.tsx");

      if (looksLikeComponent && !PASCAL_CASE.test(name)) {
        warnings.push({
          file: rel,
          line: 0,
          message: `COMPONENT_NAMING: Component file '${name}' should be PascalCase.tsx (e.g. MyComponent.tsx).`,
        });
      }
    }
  });
}

// ── SQL migration coverage check (additional) ─────────────────────────────────
// Verify that SQL migration filenames under migrations/ are sequential (warn on gaps)
const migrationDirs = [
  "services/dsh/database/migrations",
  "services/wlt/database/migrations",
];
for (const migDir of migrationDirs) {
  const fullDir = path.join(repoRoot, migDir);
  if (!fs.existsSync(fullDir)) continue;
  const sqlFiles = fs
    .readdirSync(fullDir)
    .filter((f) => f.endsWith(".sql") && SQL_MIGRATION.test(f))
    .sort();

  for (let i = 0; i < sqlFiles.length - 1; i++) {
    const curr = parseInt(sqlFiles[i].split("_")[0], 10);
    const next = parseInt(sqlFiles[i + 1].split("_")[0], 10);
    if (next - curr > 1) {
      warnings.push({
        file: `${migDir}/${sqlFiles[i + 1]}`,
        line: 0,
        message: `SQL_MIGRATION_GAP: Migration sequence gap detected between ${sqlFiles[i]} and ${sqlFiles[i + 1]}.`,
      });
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length} naming issues — fix progressively):`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w.file} — ${w.message}`);
  }
}

// Run ls-lint naming checks
try {
  console.log("Running ls-lint naming checks...");
  const cmd = process.platform === "win32" ? "npx.cmd @ls-lint/ls-lint" : "npx @ls-lint/ls-lint";
  execSync(cmd, { stdio: "inherit", cwd: repoRoot });
} catch (e) {
  violations.push({
    file: ".ls-lint.yml",
    line: 0,
    message: "LS_LINT_FAILED: Directory structure naming conventions violated. Run 'npx @ls-lint/ls-lint' for details."
  });
}

fail(guardId, violations);
