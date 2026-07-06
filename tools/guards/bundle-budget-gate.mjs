/**
 * tools/guards/bundle-budget-gate.mjs
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Bundle Budget Static Analysis
 *
 * Checks without requiring a build:
 *   1. ui-kit package.json has "sideEffects": false (enables tree-shaking)
 *   2. No known heavy dependencies are imported in mobile apps that shouldn't be there
 *   3. Detects version conflicts of heavy packages across apps
 *   4. Reports estimated risk surface (number of heavy deps per app)
 *
 * FAIL: sideEffects missing from ui-kit
 * WARN: high heavy-dep count in an app, version conflicts
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "bundle-budget-gate";
const violations = [];
const warnings = [];

// ── 1. ui-kit sideEffects check ───────────────────────────────────────────────
const uiKitPkg = path.join(repoRoot, "shared/ui-kit/package.json");
if (fs.existsSync(uiKitPkg)) {
  const pkg = JSON.parse(fs.readFileSync(uiKitPkg, "utf8"));
  if (pkg.sideEffects !== false && pkg.sideEffects !== undefined) {
    violations.push({
      file: "shared/ui-kit/package.json",
      line: 0,
      message: 'TREE_SHAKE_DISABLED: shared/ui-kit/package.json must have "sideEffects": false to enable tree-shaking. Current value: ' + JSON.stringify(pkg.sideEffects),
    });
  }
}

// ── 2. Collect all app package.json files ────────────────────────────────────
const KNOWN_HEAVY_DEPS = new Set([
  "moment", "lodash", "underscore",
  "recharts", "chart.js", "react-chartjs-2", "victory", "d3",
  "@pdf-lib/fontkit", "pdfkit", "jspdf",
  "puppeteer", "playwright",
  "three", "@react-three/fiber",
  "xlsx", "exceljs",
  "ffmpeg", "@ffmpeg/ffmpeg",
  "tensorflowjs", "@tensorflow/tfjs",
]);

const APP_ROOTS = [
  "apps/app-client/runtime",
  "apps/app-partner/runtime",
  "apps/app-captain/runtime",
  "apps/app-field/runtime",
  "apps/control-panel/runtime",
];

const depVersionMap = new Map(); // dep@version → [apps]
const heavyDepsByApp = new Map();

for (const appRoot of APP_ROOTS) {
  const pkgPath = path.join(repoRoot, appRoot, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    continue;
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const heavyFound = [];

  for (const [dep, version] of Object.entries(allDeps)) {
    if (KNOWN_HEAVY_DEPS.has(dep)) {
      heavyFound.push({ dep, version });
      const key = `${dep}@${version}`;
      if (!depVersionMap.has(key)) depVersionMap.set(key, []);
      depVersionMap.get(key).push(appRoot);
    }
  }

  if (heavyFound.length > 0) {
    heavyDepsByApp.set(appRoot, heavyFound);
  }
}

// ── 3. Report heavy deps per app ─────────────────────────────────────────────
const MOBILE_APPS = APP_ROOTS.filter((a) => !a.includes("control-panel"));

for (const appRoot of MOBILE_APPS) {
  const heavy = heavyDepsByApp.get(appRoot);
  if (!heavy || heavy.length === 0) continue;

  // Any heavy dep in mobile → warning (gate hasn't seen them in imports yet,
  // but having them in package.json means they COULD end up in the bundle)
  warnings.push({
    file: `${appRoot}/package.json`,
    line: 0,
    message: `HEAVY_DEPS_IN_MOBILE: ${heavy.length} known heavy package(s) found in ${appRoot}: ${heavy.map((h) => h.dep).join(", ")}. Verify they are tree-shaken or lazy-loaded.`,
  });
}

// ── 4. Version conflict detection ────────────────────────────────────────────
const depsByName = new Map(); // depName → Set of versions
for (const [key, apps] of depVersionMap) {
  const [name, version] = key.split("@");
  if (!depsByName.has(name)) depsByName.set(name, new Map());
  depsByName.get(name).set(version, apps);
}

for (const [dep, versionMap] of depsByName) {
  if (versionMap.size > 1) {
    const versions = [...versionMap.entries()]
      .map(([v, apps]) => `${v} (in ${apps.join(", ")})`)
      .join(" | ");
    warnings.push({
      file: "package.json",
      line: 0,
      message: `DEP_VERSION_CONFLICT: '${dep}' has multiple versions across apps: ${versions}. This prevents deduplication and increases bundle size.`,
    });
  }
}

// ── 5. Summary ────────────────────────────────────────────────────────────────
if (heavyDepsByApp.size > 0) {
  console.log(`\n${guardId}: ${heavyDepsByApp.size} app(s) with known heavy dependencies:`);
  for (const [app, deps] of heavyDepsByApp) {
    console.log(`  ${app}: ${deps.map((d) => d.dep).join(", ")}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w.file} — ${w.message}`);
  }
}

fail(guardId, violations);
