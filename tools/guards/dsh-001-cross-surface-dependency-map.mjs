#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
const MAP_PATH = join(
  ROOT,
  "machine-readable/dsh-wlt/dsh_001_cross_surface_dependency_map.json",
);
const CAPABILITY_MAP_PATH = join(ROOT, "services/dsh/capability-map.ts");
const SURFACE_MAP_PATH = join(ROOT, "services/dsh/surface-map.ts");
const SURFACES = [
  "app-client",
  "control-panel",
  "app-partner",
  "app-field",
  "app-captain",
];
const STORE_ONLY_SURFACES = ["app-partner", "app-field", "app-captain"];
const FORBIDDEN_WORKFLOW_RE =
  /\b(?:use[A-Za-z]*(?:Order|Catalog|Finance|Wallet|Payment|Delivery)Controller|fetch[A-Za-z]*(?:Order|Catalog|Finance|Wallet|Payment|Delivery)|createOrder|updateOrder|ledger|settlement|payout|commission)\b/i;
const errors = [];

if (!existsSync(MAP_PATH)) {
  errors.push("cross-surface store-role map is missing");
} else {
  const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
  if (map.slice !== "DSH-001" || map.domain !== "stores") {
    errors.push("map must describe DSH-001 stores");
  }
  for (const surface of SURFACES) {
    if (!map.executed_surfaces?.[surface]) {
      errors.push(`${surface} executed store role is missing`);
    }
  }
  for (const invariant of [
    "all_surfaces_ui_only",
    "no_surface_fetch",
    "no_surface_env",
    "no_surface_store_types",
    "no_orders",
    "no_full_catalog",
    "no_finance",
  ]) {
    if (map.invariants?.[invariant] !== true) {
      errors.push(`invariant ${invariant} must be true`);
    }
  }
}

const capabilityMap = readFileSync(CAPABILITY_MAP_PATH, "utf8");
const storeBlock =
  /id:\s*["']dsh\.store\.discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.exec(
    capabilityMap,
  )?.[0] ?? "";
for (const surface of SURFACES) {
  if (!new RegExp(`["']${surface}["']`).test(storeBlock)) {
    errors.push(`dsh.store.discovery must include ${surface}`);
  }
}

const surfaceMap = readFileSync(SURFACE_MAP_PATH, "utf8");
for (const surface of SURFACES) {
  const block =
    new RegExp(
      `surface:\\s*["']${surface}["'][\\s\\S]*?implementationState:\\s*["']runtime-verified["']`,
    ).exec(surfaceMap)?.[0] ?? "";
  if (!/dsh\.store\.discovery/.test(block)) {
    errors.push(`${surface} must consume dsh.store.discovery`);
  }
}

for (const surface of STORE_ONLY_SURFACES) {
  const path = join(ROOT, `services/dsh/frontend/${surface}/store`);
  if (!existsSync(path)) {
    errors.push(`${surface}/store UI is missing`);
    continue;
  }
  const source = readFileSync(
    join(
      path,
      surface === "app-partner"
        ? "PartnerStoreScreen.tsx"
        : surface === "app-field"
          ? "FieldStoreVerificationScreen.tsx"
          : "CaptainStorePickupContextScreen.tsx",
    ),
    "utf8",
  );
  if (!/useStoreRoleContextController/.test(source)) {
    errors.push(`${surface} must consume shared store role controller`);
  }
  if (FORBIDDEN_WORKFLOW_RE.test(source)) {
    errors.push(`${surface} contains a forbidden non-store workflow`);
  }
}

// 1. Evidence files and screenshots checks
const EVIDENCE_DIR = join(ROOT, "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface");
const requiredFiles = [
  "git-status.txt",
  "git-diff-check.txt",
  "remote-head.txt",
  "runtime-status.txt",
  "api-health.txt",
  "api-readiness.txt",
  "api-stores.txt",
  "control-panel-url.txt",
  "app-client-reverify.txt",
  "app-partner-store-context.txt",
  "app-field-store-verification.txt",
  "app-captain-store-pickup-context.txt",
  "guard-results.txt",
  "typecheck-results.txt",
  "test-results.txt",
  "nx-results.txt",
  "graphify-results.txt",
  "ci-status.txt",
];

const requiredScreenshots = [
  "app-client-store-discovery-reverify.png",
  "control-panel-stores-admin-success.png",
  "control-panel-store-detail-panel.png",
  "control-panel-error-or-service-unavailable.png",
  "app-partner-store-context.png",
  "app-field-store-verification.png",
  "app-captain-store-pickup-context.png",
];

for (const f of requiredFiles) {
  const p = join(EVIDENCE_DIR, f);
  if (!existsSync(p)) {
    errors.push(`missing required evidence file: ${f}`);
  }
}

for (const s of requiredScreenshots) {
  const p = join(EVIDENCE_DIR, "screenshots", s);
  if (!existsSync(p)) {
    errors.push(`missing required screenshot: screenshots/${s}`);
  }
}

// 2. Manifest values and activation checks
const serviceManifestPath = join(ROOT, "services/dsh/service.manifest.ts");
if (existsSync(serviceManifestPath)) {
  const manifestSrc = readFileSync(serviceManifestPath, "utf8");
  
  // Prevent closureState = RUNTIME_VERIFIED if visual evidence is missing
  const closureStateMatch = /closureState:\s*["']([^"']+)["']/.exec(manifestSrc);
  if (closureStateMatch && closureStateMatch[1] === "RUNTIME_VERIFIED") {
    for (const s of requiredScreenshots) {
      const p = join(EVIDENCE_DIR, "screenshots", s);
      if (!existsSync(p)) {
        errors.push(`closureState cannot be RUNTIME_VERIFIED because screenshot is missing: screenshots/${s}`);
      }
    }
  }

  // Prevent old activationScope
  const activationScopeMatch = /activationScope:\s*["']([^"']+)["']/.exec(manifestSrc);
  if (activationScopeMatch && activationScopeMatch[1] === "store-discovery-multi-surface") {
    errors.push(`activationScope cannot be the old 'store-discovery-multi-surface'`);
  }
}

// 3. Prevent DSH-002 verified if nextSlice is NOT_APPROVED_YET
if (existsSync(CAPABILITY_MAP_PATH)) {
  const capMapSrc = readFileSync(CAPABILITY_MAP_PATH, "utf8");
  if (existsSync(serviceManifestPath)) {
    const manifestSrc = readFileSync(serviceManifestPath, "utf8");
    const nextSliceMatch = /nextSlice:\s*\{[\s\S]*?closureState:\s*["']NOT_APPROVED_YET["']/.test(manifestSrc);
    if (nextSliceMatch) {
      // Check if dsh.client.home-discovery capability is marked RUNTIME_VERIFIED in capability-map
      const homeDiscoveryVerified = /id:\s*["']dsh\.client\.home-discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.test(capMapSrc);
      if (homeDiscoveryVerified) {
        errors.push("dsh.client.home-discovery capability cannot be marked RUNTIME_VERIFIED when nextSlice DSH-002 is NOT_APPROVED_YET");
      }
    }
  }
}

if (errors.length > 0) {
  console.error("DSH-001 All-Surface Store Role Gate: FAIL");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("DSH-001 All-Surface Store Role Gate: PASS");
