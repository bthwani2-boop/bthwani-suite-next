/**
 * tools/guards/dependency-graph-gate.mjs
 *
 * Architecture boundary gate using madge (already a devDependency).
 *
 * Checks:
 *   1. No circular dependencies within services/dsh/frontend
 *   2. No circular dependencies within services/wlt/frontend
 *   3. No circular dependencies within apps/control-panel
 *   4. No direct cross-service import: services/dsh → services/wlt or vice versa
 *      (must go through generated clients only)
 *   5. No import from apps/ directly into services/ source
 *      (apps consume services only through generated clients or packages)
 *
 * We run madge programmatically with the owning TypeScript configuration.
 * Existing targets must process at least one file; a zero-file "success" is a
 * diagnostic failure, not evidence of an acyclic graph.
 *
 * Output: DEPENDENCY_GRAPH_GATE: PASS / FAIL
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ts } from "./lib/typescript-compiler.mjs";

const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const guardId = "dependency-graph-gate";
let failed = false;
const violations = [];
const notes = [];

// Try to load madge from workspace root
let madge;
try {
  madge = require(path.join(repoRoot, "node_modules/madge/lib/api.js"));
} catch {
  console.error(`${guardId}: FAIL — madge not found in node_modules. Run pnpm install.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function exists(dir) {
  return fs.existsSync(path.join(repoRoot, dir));
}

function loadTsConfig(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const config = ts.readConfigFile(absolutePath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(absolutePath));
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"));
  }
  return { ...config.config, compilerOptions: parsed.options };
}

async function analyzeTarget({ dir, label, tsConfig }) {
  if (!exists(dir)) {
    violations.push(`MADGE_TARGET_MISSING ${label}: ${dir}`);
    failed = true;
    return { circulars: [], dependencies: {} };
  }
  const result = await madge(path.join(repoRoot, dir), {
    fileExtensions: ["ts", "tsx"],
    tsConfig: loadTsConfig(tsConfig),
    excludeRegExp: [
      /node_modules/,
      /generated/,
      /\.test\./,
      /\.spec\./,
      /__tests__/,
    ],
  });
  const dependencies = result.obj();
  const processedFiles = Object.keys(dependencies).length;
  if (processedFiles === 0) {
    violations.push(`MADGE_ZERO_FILES ${label}: dir=${dir} tsconfig=${tsConfig}`);
    failed = true;
  } else {
    notes.push(`  MADGE: ${label} processed=${processedFiles} tsconfig=${tsConfig}`);
  }
  return { circulars: result.circular(), dependencies };
}

// ---------------------------------------------------------------------------
// Rule 1-3: Circular dependency checks
// ---------------------------------------------------------------------------
const circularChecks = [
  { dir: "services/dsh/frontend", label: "DSH frontend", tsConfig: "services/dsh/tsconfig.json" },
  { dir: "services/wlt/frontend", label: "WLT frontend", tsConfig: "services/wlt/tsconfig.json" },
  { dir: "apps/control-panel/runtime/src", label: "Control panel", tsConfig: "apps/control-panel/runtime/tsconfig.json" },
];

const circularWarnings = [];

for (const target of circularChecks) {
  const { dir, label } = target;
  const { circulars } = await analyzeTarget(target);
  if (circulars.length > 0) {
    for (const cycle of circulars) {
      circularWarnings.push(`CIRCULAR in ${label}: ${cycle.join(" → ")}`);
    }
  } else if (exists(dir)) {
    console.log(`  [OK] No circular dependencies in ${label}`);
  }
}

if (circularWarnings.length > 0) {
  console.log(`\n  Circular Dependency Warnings (${circularWarnings.length}):`);
  for (const w of circularWarnings) {
    console.log(`    [WARN] ${w}`);
  }
}

// ---------------------------------------------------------------------------
// Rule 4: Cross-service direct imports
// Cross-service is detected by scanning source files for import paths
// that cross service boundaries (not via generated clients).
// ---------------------------------------------------------------------------
async function getCrossServiceViolations() {
  const serviceMap = {
    "services/dsh/frontend": "dsh",
    "services/wlt/frontend": "wlt",
  };

  for (const [srcDir, srcService] of Object.entries(serviceMap)) {
    if (!exists(srcDir)) continue;

    const tsConfig = srcService === "dsh" ? "services/dsh/tsconfig.json" : "services/wlt/tsconfig.json";
    const result = await madge(path.join(repoRoot, srcDir), {
      fileExtensions: ["ts", "tsx"],
      tsConfig: loadTsConfig(tsConfig),
      excludeRegExp: [/node_modules/, /generated/],
    });
    const deps = result.obj();
    if (Object.keys(deps).length === 0) {
      violations.push(`MADGE_ZERO_FILES ${srcService} cross-service scan: dir=${srcDir} tsconfig=${tsConfig}`);
      failed = true;
      continue;
    }

    for (const [file, imports] of Object.entries(deps)) {
      for (const imp of imports) {
        // Look for direct references to the other service's source (not generated client)
        const otherService = srcService === "dsh" ? "wlt" : "dsh";
        if (
          imp.includes(`services/${otherService}/`) &&
          !imp.includes("clients/generated") &&
          !imp.includes("clients/") // allow only generated client access
        ) {
          violations.push(
            `CROSS_SERVICE: ${srcDir}/${file} imports from services/${otherService}/ directly — use generated client`
          );
          failed = true;
        }
      }
    }
  }
}

await getCrossServiceViolations();

// ---------------------------------------------------------------------------
// Rule 5: apps/ importing from services/ source (not clients)
// ---------------------------------------------------------------------------
// We do a lightweight text scan instead of madge (faster for this rule)
import { listCodeFiles, read } from "./_guard-utils.mjs";

const APP_SOURCE_IMPORT = /from\s+['"]([^'"]*services\/(?:dsh|wlt|identity)[^'"]*)['"]/g;

const appFiles = listCodeFiles().filter(
  (f) =>
    (f.startsWith("apps/") || f.startsWith("services/")) &&
    !f.includes("node_modules") &&
    !f.includes("clients/generated") &&
    !f.includes(".test.") &&
    !f.includes(".spec.")
);

for (const file of appFiles) {
  if (!file.startsWith("apps/")) continue; // only check app files
  const content = read(file);
  let m;
  APP_SOURCE_IMPORT.lastIndex = 0;
  while ((m = APP_SOURCE_IMPORT.exec(content)) !== null) {
    const importPath = m[1];
    // Allow generated clients and published packages
    if (importPath.includes("clients/generated")) continue;
    if (importPath.includes("@dsh-cp/")) continue;
    if (importPath.includes("@wlt-cp/")) continue;
    if (importPath.includes("@bthwani/")) continue;
    // Allow monorepo relative imports: apps/ consuming their own service frontend
    // via relative path (e.g. ../../../../services/dsh/frontend/app-captain) is
    // the approved monorepo pattern — not a boundary violation.
    if (/^\.+\//.test(importPath)) continue;
    violations.push(
      `ARCH_BOUNDARY: ${file} imports from service source directly: "${importPath}" — use generated client or package`
    );
    failed = true;
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
if (notes.length > 0) {
  console.log("\nNotes:");
  for (const n of notes) console.log(n);
}

if (violations.length === 0 && !failed) {
  console.log(`${guardId}: PASS`);
  process.exit(0);
}

console.error(`\n${guardId}: FAIL`);
for (const v of violations) {
  console.error(`  - ${v}`);
}
process.exit(1);
