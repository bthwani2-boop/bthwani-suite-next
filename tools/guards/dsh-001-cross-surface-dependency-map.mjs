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

// 1. Cross-surface store-role map
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
    "store_domain_actions_required",
    "authentication_authorization_required",
    "idempotency_and_audit_required",
  ]) {
    if (map.invariants?.[invariant] !== true) {
      errors.push(`invariant ${invariant} must be true`);
    }
  }
}

// 2. Capability map — all surfaces included and dsh.store.discovery is RUNTIME_VERIFIED
const capabilityMap = readFileSync(CAPABILITY_MAP_PATH, "utf8");
const storeBlock =
  /id:\s*["']dsh\.store\.discovery["'][\s\S]*?closureState:\s*["'](?:RUNTIME_VERIFIED|FIX_REQUIRED)["']/.exec(
    capabilityMap,
  )?.[0] ?? "";
for (const surface of SURFACES) {
  if (!new RegExp(`["']${surface}["']`).test(storeBlock)) {
    errors.push(`dsh.store.discovery must include ${surface}`);
  }
}
if (
  !/id:\s*["']dsh\.store\.discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.test(
    capabilityMap,
  )
) {
  errors.push("dsh.store.discovery closureState must be RUNTIME_VERIFIED");
}

// 3. Surface map — all surfaces runtime-verified and consuming dsh.store.discovery
const surfaceMap = readFileSync(SURFACE_MAP_PATH, "utf8");
for (const surface of SURFACES) {
  const block =
    new RegExp(
      `surface:\\s*["']${surface}["'][\\s\\S]*?implementationState:\\s*["']runtime-verified["']`,
    ).exec(surfaceMap)?.[0] ?? "";
  if (!/dsh\.store\.discovery/.test(block)) {
    errors.push(
      `${surface} must be runtime-verified and consume dsh.store.discovery`,
    );
  }
}

// 4. Screen-level code checks — controllers, no forbidden workflows, no raw fetch/env/useEffect
for (const surface of STORE_ONLY_SURFACES) {
  const path = join(ROOT, `services/dsh/frontend/${surface}/store`);
  if (!existsSync(path)) {
    errors.push(`${surface}/store UI is missing`);
    continue;
  }
  const screenFile =
    surface === "app-partner"
      ? "PartnerStoreScreen.tsx"
      : surface === "app-field"
        ? "FieldStoreVerificationScreen.tsx"
        : "CaptainStorePickupContextScreen.tsx";
  const source = readFileSync(join(path, screenFile), "utf8");
  if (!/useStoreRoleContextController/.test(source)) {
    errors.push(`${surface} must consume shared store role controller`);
  }
  if (FORBIDDEN_WORKFLOW_RE.test(source)) {
    errors.push(`${surface} contains a forbidden non-store workflow`);
  }
  if (/\bfetch\(/.test(source)) {
    errors.push(`${surface} screen must not call fetch directly`);
  }
  if (/process\.env/.test(source)) {
    errors.push(`${surface} screen must not access process.env`);
  }
  if (/\buseEffect\(/.test(source)) {
    errors.push(
      `${surface} screen must not use useEffect — data loading belongs in shared controllers`,
    );
  }
}

// 5. Manifest consistency check
const serviceManifestPath = join(ROOT, "services/dsh/service.manifest.ts");
if (existsSync(serviceManifestPath)) {
  const manifestSrc = readFileSync(serviceManifestPath, "utf8");
  if (!/closureState:\s*["']RUNTIME_VERIFIED["']/.test(manifestSrc)) {
    errors.push("service.manifest closureState must be RUNTIME_VERIFIED");
  }
  if (/screensReady:\s*false/.test(manifestSrc)) {
    errors.push("service.manifest screensReady must be true");
  }
  if (/realExperienceReady:\s*false/.test(manifestSrc)) {
    errors.push("service.manifest realExperienceReady must be true");
  }
}

// 6. Guard: prevent dsh.client.home-discovery RUNTIME_VERIFIED when nextSlice NOT_APPROVED_YET
if (existsSync(CAPABILITY_MAP_PATH) && existsSync(serviceManifestPath)) {
  const capMapSrc = readFileSync(CAPABILITY_MAP_PATH, "utf8");
  const manifestSrc = readFileSync(serviceManifestPath, "utf8");
  const nextSliceNotApproved =
    /nextSlice:\s*\{[\s\S]*?closureState:\s*["']NOT_APPROVED_YET["']/.test(
      manifestSrc,
    );
  if (nextSliceNotApproved) {
    const homeDiscoveryVerified =
      /id:\s*["']dsh\.client\.home-discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.test(
        capMapSrc,
      );
    if (homeDiscoveryVerified) {
      errors.push(
        "dsh.client.home-discovery cannot be RUNTIME_VERIFIED when nextSlice DSH-002 is NOT_APPROVED_YET",
      );
    }
  }
}

if (errors.length > 0) {
  console.error("DSH-001 All-Surface Store Role Gate: FAIL");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("DSH-001 All-Surface Store Role Gate: PASS");
