/**
 * tools/guards/repository-structure-gate.mjs
 *
 * BTHWANI_REPOSITORY_STRUCTURE_GOVERNANCE_GATE — Structure, Depth & Ownership Layer
 *
 * Checks:
 *   1. Folder depth — WARN > 10 levels, FAIL > 12 levels
 *   2. Forbidden duplicate roots — no 'ui-kit' outside shared/ui-kit
 *   3. Ownership boundaries:
 *        - No file inside services/wlt/ may import from services/dsh/ (and vice versa) except via allowed bridge paths
 *        - No DSH frontend file importing WLT internal services directly
 *   4. Forbidden top-level folder patterns — no new top-level dirs outside approved list
 *
 * Scope: whole repo (excluding node_modules, .git, dist, etc.)
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "repository-structure-gate";
const violations = [];
const warnings = [];

// ── 1. Folder Depth Check ────────────────────────────────────────────────────
const DEPTH_WARN  = 10;
const DEPTH_FAIL  = 12;

const EXCLUDED_DEPTH_DIRS = new Set([
  ".git", "node_modules", ".pnpm-store", ".next", ".expo", ".turbo", ".nx",
  ".cache", "dist", "build", "out", "coverage", "android", "ios",
  "graphify-out", ".diagnostics",
]);

function walkDepth(dir, depth = 0) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDED_DEPTH_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);
    const rel  = toPosix(path.relative(repoRoot, full));
    const d    = depth + 1;

    if (d >= DEPTH_FAIL) {
      violations.push({
        file: rel + "/",
        line: 0,
        message: `DEPTH_TOO_DEEP: Folder depth ${d} exceeds maximum ${DEPTH_FAIL}. Flatten the structure.`,
      });
    } else if (d >= DEPTH_WARN) {
      warnings.push({
        file: rel + "/",
        line: 0,
        message: `DEPTH_WARN: Folder depth ${d} is very deep (limit: ${DEPTH_FAIL}). Consider flattening.`,
      });
    }

    walkDepth(full, d);
  }
}

walkDepth(repoRoot);

// ── 2. Forbidden Duplicate Root Folders ──────────────────────────────────────
// These folder names must only exist at their canonical location.
const CANONICAL_ROOTS = {
  "ui-kit": "shared/ui-kit",
  "design-system": null,           // must not exist anywhere in source
  "design-tokens": null,           // must not exist anywhere in source
};

function findDuplicateFolders(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDED_DEPTH_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel  = toPosix(path.relative(repoRoot, full));

    const canonical = CANONICAL_ROOTS[entry.name];
    if (canonical !== undefined) {
      // canonical === null means never allowed
      if (canonical === null || rel !== canonical) {
        violations.push({
          file: rel + "/",
          line: 0,
          message: `FORBIDDEN_DUPLICATE_ROOT: Folder '${entry.name}' must only exist at '${canonical ?? "(nowhere)"}'. Found at: ${rel}/`,
        });
      }
    }
    findDuplicateFolders(full, results);
  }
  return results;
}

findDuplicateFolders(repoRoot);

// ── 3. Approved Top-Level Directories ────────────────────────────────────────
const APPROVED_TOP_LEVEL = new Set([
  // Project structure
  "apps", "services", "shared", "core", "tools", "infra",
  "contracts", "docs", "governance",
  // Config
  ".agents", ".github", ".vscode", ".expo", ".nx",
  ".diagnostics", "node_modules", ".pnpm-store",
  // Build/cache (transient, should be gitignored)
  "dist", "build", "out", "coverage", "graphify-out",
]);

const topLevel = fs.readdirSync(repoRoot, { withFileTypes: true });
for (const entry of topLevel) {
  if (!entry.isDirectory()) continue;
  if (APPROVED_TOP_LEVEL.has(entry.name)) continue;
  if (entry.name.startsWith(".")) continue; // allow hidden dirs

  warnings.push({
    file: entry.name + "/",
    line: 0,
    message: `UNAPPROVED_TOP_LEVEL: New top-level directory '${entry.name}' is not in the approved list. Add it explicitly if intentional.`,
  });
}

// ── 4. Cross-Service Ownership (Import Boundary) ─────────────────────────────
// DSH frontend must not directly import WLT internal modules and vice-versa.
// Allowed: clients/generated (public contracts) are OK.

const BOUNDARY_RULES = [
  {
    // WLT files must not import DSH internal paths
    scope: /^services\/wlt\/frontend\//,
    forbidden: /from ['"].*services\/dsh\/(?!clients\/generated)/,
    label: "WLT→DSH_INTERNAL",
    message: "WLT frontend must not import DSH internals directly. Use services/dsh/clients/generated instead.",
  },
  {
    // DSH files must not import WLT internal paths
    scope: /^services\/dsh\/frontend\//,
    forbidden: /from ['"].*services\/wlt\/(?!clients\/generated)/,
    label: "DSH→WLT_INTERNAL",
    message: "DSH frontend must not import WLT internals directly. Use services/wlt/clients/generated instead.",
  },
  {
    // apps must not import directly from services/*/backend
    scope: /^apps\//,
    forbidden: /from ['"].*services\/[^/]+\/backend\//,
    label: "APP→BACKEND_DIRECT",
    message: "Apps must not import backend modules directly. Use the frontend service layer or clients/generated.",
  },
];

const codeFiles = listCodeFiles().filter(
  (f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".mjs")
);

for (const file of codeFiles) {
  for (const rule of BOUNDARY_RULES) {
    if (!rule.scope.test(file)) continue;

    const content = read(file);
    const lines   = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (rule.forbidden.test(lines[i])) {
        violations.push({
          file,
          line: i + 1,
          message: `${rule.label}: ${rule.message} | Found: ${lines[i].trim()}`,
        });
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w.file}:${w.line} — ${w.message}`);
  }
}

fail(guardId, violations);
