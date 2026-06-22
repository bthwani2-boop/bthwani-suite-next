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
 *   5. No env var access (NEXT_PUBLIC_DSH_API_BASE_URL / EXPO_PUBLIC_DSH_API_BASE_URL) in surface files.
 *   6. No Store type/interface definition in surface folders — types belong in shared.
 *   7. No useEffect() in surface component files — data loading lives in shared controllers.
 *   8. No old ports (8080,8081,8082,8083,8084,3000) hardcoded in any frontend file.
 *   9. Warn for raw HTML interactive elements (<button>,<input>,<select>,<table>) in control-panel surface.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
let warnings = 0;

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

function warn(filePath, message) {
  console.warn(`  ⚠ ${relative(ROOT, filePath)}: ${message}`);
  warnings++;
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
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    if (file.endsWith("index.ts")) continue;
    const src = read(file);
    if (/from\s+["'][^"']*\.api["']/.test(src)) {
      fail(file, "imports *.api directly — surface screens must use controllers (use-*-controller)");
    }
  }
}

// ── Rule 3: shared/ must not import from surface folders ────────────────────
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

// ── Rule 4 (Rule 3 extends): already covers apps/ above ────────────────────

// ── Rule 5: DSH env access is allowed only in shared/_kernel ────────────────
const DSH_ENV_RE =
  /process\.env(?:\.(?:NEXT_PUBLIC_DSH_API_BASE_URL|EXPO_PUBLIC_DSH_API_BASE_URL)|\s*\[\s*["'](?:NEXT_PUBLIC_DSH_API_BASE_URL|EXPO_PUBLIC_DSH_API_BASE_URL)["']\s*\])/;
for (const dir of [SHARED_DIR, ...SURFACE_DIRS.map((surface) => join(FRONTEND, surface))]) {
  for (const file of walkFiles(dir)) {
    if (file.includes(`${join("shared", "_kernel")}`)) continue;
    const src = read(file);
    if (DSH_ENV_RE.test(src)) {
      fail(file, "direct DSH env var access outside shared/_kernel");
    }
  }
}

// ── Rule 6: No Store domain type/interface definition in surface folders ─────
// Catches: type StoreXxx = ..., interface StoreXxx { ... } where name starts with Store/store.
// Excludes React component prop types (*Props, *Ref) which legitimately live in surfaces.
const STORE_TYPE_RE = /^(?:export\s+)?(?:type|interface)\s+([Ss]tore\w*)\s*[={<]/gm;
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    const src = read(file);
    for (const [, typeName] of src.matchAll(STORE_TYPE_RE)) {
      if (typeName.endsWith("Props") || typeName.endsWith("Ref")) continue;
      fail(file, `domain Store type '${typeName}' defined in surface — move to shared/store`);
    }
  }
}

// ── Rule 6b: Surface Store consumers use the shared/store public barrel ─────
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    const src = read(file);
    if (/from\s+["'][^"']*shared\/store\/[^"']+["']/.test(src)) {
      fail(file, "deep import from shared/store — consume the public shared/store barrel");
    }
  }
}

const REQUIRED_SURFACE_BINDINGS = [
  {
    file: join(FRONTEND, "app-client/store/StoreDiscoveryScreen.tsx"),
    pattern: /\buseStoreDiscoveryController\b/,
    message: "StoreDiscoveryScreen must consume useStoreDiscoveryController",
  },
  {
    file: join(FRONTEND, "control-panel/partners/stores/StoreManagementScreen.tsx"),
    pattern: /\buseStoreAdminController\b/,
    message: "StoreManagementScreen must consume useStoreAdminController",
  },
  {
    file: join(FRONTEND, "app-client/home-discovery/HomeDiscoveryScreen.tsx"),
    pattern: /\buseHomeDiscoveryController\b/,
    message: "HomeDiscoveryScreen must consume useHomeDiscoveryController",
  },
  {
    file: join(FRONTEND, "app-partner/store/PartnerStoreScreen.tsx"),
    pattern: /\buseStoreRoleContextController\b/,
    message: "PartnerStoreScreen must consume useStoreRoleContextController",
  },
  {
    file: join(FRONTEND, "app-field/store/FieldStoreVerificationScreen.tsx"),
    pattern: /\buseStoreRoleContextController\b/,
    message: "FieldStoreVerificationScreen must consume useStoreRoleContextController",
  },
  {
    file: join(FRONTEND, "app-captain/store/CaptainStorePickupContextScreen.tsx"),
    pattern: /\buseStoreRoleContextController\b/,
    message: "CaptainStorePickupContextScreen must consume useStoreRoleContextController",
  },
];

for (const binding of REQUIRED_SURFACE_BINDINGS) {
  if (!binding.pattern.test(read(binding.file))) {
    fail(binding.file, binding.message);
  }
}

for (const file of walkFiles(FRONTEND)) {
  if (/\bStoreCardPremiumItem\b/.test(read(file))) {
    fail(file, "StoreCardPremiumItem duplicates DshStoreCardViewModel");
  }
}

const RETIRED_PATHS = [
  join(FRONTEND, "app-client/store-discovery"),
  join(FRONTEND, "shared/store-discovery"),
  join(FRONTEND, "control-panel/_skeleton-proof"),
];
for (const retiredPath of RETIRED_PATHS) {
  if (walkFiles(retiredPath).length > 0) {
    fail(retiredPath, "retired DSH frontend path still contains source files");
  }
}

// ── Rule 7: No useEffect() in surface component files ───────────────────────
// Controllers (use-*) legitimately use useEffect — they live in shared, not surfaces.
// Any useEffect in a surface file means data-loading logic leaked out of shared.
for (const surface of SURFACE_DIRS) {
  for (const file of walkFiles(join(FRONTEND, surface))) {
    if (!file.endsWith(".tsx")) continue;
    const src = read(file);
    if (/\buseEffect\(/.test(src)) {
      fail(file, "useEffect() in surface component — data loading must stay in shared controllers");
    }
  }
}

// ── Rule 8: No old ports hardcoded in any frontend file ─────────────────────
const OLD_PORT_RE = /:(8080|8081|8082|8083|8084|3000)\b/;
const ALL_FRONTEND_DIRS = [SHARED_DIR, ...SURFACE_DIRS.map((s) => join(FRONTEND, s))];
for (const dir of ALL_FRONTEND_DIRS) {
  for (const file of walkFiles(dir)) {
    const src = read(file);
    const match = OLD_PORT_RE.exec(src);
    if (match) {
      fail(file, `hardcoded old port :${match[1]} — DSH API canonical port is 58080`);
    }
  }
}

// ── Rule 9: Warn for raw HTML interactive elements in control-panel ──────────
// These should use @bthwani/app-shell components (PaginationToolbar, etc.)
const RAW_HTML_RE = /<(?:button|input|select|table)\b/;
const CP_DIR = join(FRONTEND, "control-panel");
for (const file of walkFiles(CP_DIR)) {
  if (!file.endsWith(".tsx")) continue;
  const src = read(file);
  if (RAW_HTML_RE.test(src)) {
    warn(file, "raw HTML interactive element in control-panel surface — prefer @bthwani/app-shell components");
  }
}

// ── Result ───────────────────────────────────────────────────────────────────
if (warnings > 0) {
  console.warn(`\n  ${warnings} warning(s) — review raw HTML elements in control-panel`);
}

if (errors === 0) {
  console.log("\nDSH Frontend Shared Ownership Gate: PASS\n");
  process.exit(0);
} else {
  console.error(`\nDSH Frontend Shared Ownership Gate: FAIL — ${errors} violation(s)\n`);
  process.exit(1);
}
