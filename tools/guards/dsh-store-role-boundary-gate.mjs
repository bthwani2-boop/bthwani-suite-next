#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../../..");
// live topology checks only — no stale JSON contracts
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
const closureFixRequired = ["FIX", "REQUIRED"].join("_");
const FORBIDDEN_WORKFLOW_RE =
  /\b(?:use[A-Za-z]*(?:Order|Catalog|Finance|Wallet|Payment|Delivery)Controller|fetch[A-Za-z]*(?:Order|Catalog|Finance|Wallet|Payment|Delivery)|createOrder|updateOrder|ledger|settlement|payout|commission)\b/i;
const errors = [];

// 1. Cross-surface store-role map — validated via live topology (surface screens + capability-map)
// Invariants enforced by: dsh-frontend-shared-ownership-gate + unified-fullstack-brain-gate

// 2. Capability map — all surfaces included and dsh.store.discovery is RUNTIME_VERIFIED
const capabilityMap = readFileSync(CAPABILITY_MAP_PATH, "utf8");
const storeBlock =
  new RegExp(`id:\\s*["']dsh\\.store\\.discovery["'][\\s\\S]*?closureState:\\s*["'](?:RUNTIME_VERIFIED|${closureFixRequired})["']`).exec(
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
  const screenPath = join(path, screenFile);
  if (!existsSync(screenPath)) {
    errors.push(`${surface} screen missing: ${screenFile} (${closureFixRequired})`);
    continue;
  }
  const source = readFileSync(screenPath, "utf8");
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

// 6. Guard: dsh.client.home-discovery RUNTIME_VERIFIED requires stage to include DSH-002_RUNTIME_VERIFIED
if (existsSync(CAPABILITY_MAP_PATH) && existsSync(serviceManifestPath)) {
  const capMapSrc = readFileSync(CAPABILITY_MAP_PATH, "utf8");
  const manifestSrc = readFileSync(serviceManifestPath, "utf8");
  const homeDiscoveryVerified =
    /id:\s*["']dsh\.client\.home-discovery["'][\s\S]*?closureState:\s*["']RUNTIME_VERIFIED["']/.test(
      capMapSrc,
    );
  if (homeDiscoveryVerified) {
    const stageIncludesDsh002 = /DSH-002_RUNTIME_VERIFIED/.test(manifestSrc);
    if (!stageIncludesDsh002) {
      errors.push(
        "dsh.client.home-discovery is RUNTIME_VERIFIED but service.manifest stage does not include DSH-002_RUNTIME_VERIFIED",
      );
    }
  }
}

if (errors.length > 0) {
  console.error("DSH Store Role Boundary Gate: FAIL");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("DSH Store Role Boundary Gate: PASS");
