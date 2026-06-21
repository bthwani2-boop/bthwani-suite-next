#!/usr/bin/env node
/**
 * DSH Frontend Shared Ownership Gate
 *
 * Enforces: services/dsh/frontend/shared = the brain of all surfaces.
 * Surfaces (control-panel, app-client, app-partner, app-field, app-captain)
 * must be UI-only renderers that consume from shared.
 *
 * Rules:
 *   1. No direct fetch() or axios inside surface folders.
 *   2. Surface component files must not import directly from *.api.ts — use controllers.
 *   3. shared/ must not import from any surface folder.
 *   4. shared/ must not import from apps/ runtime route files.
 */

import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const FRONTEND = join(ROOT, "services/dsh/frontend");

const SURFACE_DIRS = [
  "control-panel",
  "app-client",
  "app-partner",
  "app-field",
  "app-captain",
];

const SHARED_DIR = join(FRONTEND, "shared");

let errors = 0;

function walkFiles(dir, exts = [".ts", ".tsx"]) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkFiles(full, exts));
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch { /* skip unreadable */ }
  return results;
}

function read(path) {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

function fail(filePath, message) {
  console.error(`  ✗ ${relative(ROOT, filePath)}: ${message}`);
  errors++;
}

// ── Rule 1: No fetch() or axios in surface folders ─────────────────────────
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    const src = read(file);
    if (/\bfetch\(/.test(src)) {
      fail(file, "direct fetch() call in surface — move to shared API adapter");
    }
    if (/\baxios\b/.test(src)) {
      fail(file, "axios import in surface — move to shared API adapter");
    }
  }
}

// ── Rule 2: Surface component files must not import *.api directly ──────────
// Exception: controller files in shared (they ARE allowed to import *.api)
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    if (file.endsWith("index.ts")) continue;
    const src = read(file);
    // Matches: from "...something.api" or from "...something.api.ts"
    if (/from\s+["'][^"']*\.api["']/.test(src)) {
      fail(file, "imports *.api directly — surface screens must use controllers (use-*-controller)");
    }
  }
}

// ── Rule 3: shared/ must not import from surface folders ────────────────────
// Check import/require statements only (not string literals in error messages)
const IMPORT_RE = /^(?:import|export)\s.*from\s+["']([^"']+)["']/gm;

for (const file of walkFiles(SHARED_DIR)) {
  const src = read(file);
  for (const [, specifier] of src.matchAll(IMPORT_RE)) {
    for (const surface of SURFACE_DIRS) {
      if (specifier.includes(`/${surface}/`) || specifier.includes(`/${surface}`)) {
        fail(file, `shared imports from surface '${surface}' (specifier: ${specifier}) — forbidden`);
      }
    }
    if (specifier.includes("/apps/") || specifier.startsWith("apps/")) {
      fail(file, `shared imports from apps/ runtime (specifier: ${specifier}) — forbidden`);
    }
  }
}


// ── Result ───────────────────────────────────────────────────────────────────
if (errors === 0) {
  console.log("\nDSH Frontend Shared Ownership Gate: PASS\n");
  process.exit(0);
} else {
  console.error(`\nDSH Frontend Shared Ownership Gate: FAIL — ${errors} violation(s)\n`);
  process.exit(1);
}
