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

if (errors.length > 0) {
  console.error("DSH-001 All-Surface Store Role Gate: FAIL");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("DSH-001 All-Surface Store Role Gate: PASS");
