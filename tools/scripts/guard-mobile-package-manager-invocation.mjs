import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const helperImport = "./lib/package-manager-invocation.mjs";
const governedFiles = [
  "apps/mobile/eas-build-mobile.mjs",
  "tools/scripts/export-mobile-app.mjs",
  "tools/scripts/guard-mobile-apps.mjs",
  "tools/scripts/sync-mobile-apps.mjs",
  "tools/scripts/verify-mobile-prebuild.mjs",
];
const compatibilityWrappers = [
  {
    relativePath: "tools/scripts/eas-build-mobile.mjs",
    expectedSource: 'await import("../../apps/mobile/eas-build-mobile.mjs");',
  },
];
const helperBridge = {
  relativePath: "tools/scripts/lib/package-manager-invocation.mjs",
  expectedSource: 'export { resolvePackageManagerInvocation } from "../../../apps/mobile/lib/package-manager-invocation.mjs";',
};
const canonicalHelperPath = "apps/mobile/lib/package-manager-invocation.mjs";
const failures = [];

function readSource(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`);
    return undefined;
  }
  return fs.readFileSync(absolutePath, "utf8");
}

for (const relativePath of governedFiles) {
  const source = readSource(relativePath);
  if (source === undefined) continue;

  if (!source.includes(helperImport)) {
    failures.push(`${relativePath}: must use the canonical package-manager invocation helper`);
  }
  if (source.includes("npm_execpath")) {
    failures.push(`${relativePath}: direct npm_execpath coupling is forbidden`);
  }
  if (/shell\s*:\s*true/.test(source)) {
    failures.push(`${relativePath}: shell:true is forbidden in the mobile build pipeline`);
  }
}

for (const wrapper of compatibilityWrappers) {
  const source = readSource(wrapper.relativePath);
  if (source === undefined) continue;
  if (source.trim() !== wrapper.expectedSource) {
    failures.push(`${wrapper.relativePath}: compatibility wrapper must delegate only to apps/mobile/eas-build-mobile.mjs`);
  }
}

const canonicalHelper = readSource(canonicalHelperPath);
if (canonicalHelper !== undefined) {
  if (!canonicalHelper.includes("export function resolvePackageManagerInvocation")) {
    failures.push(`${canonicalHelperPath}: canonical helper export is missing`);
  }
  if (/shell\s*:\s*true/.test(canonicalHelper)) {
    failures.push(`${canonicalHelperPath}: shell:true is forbidden`);
  }
}

const bridgeSource = readSource(helperBridge.relativePath);
if (bridgeSource !== undefined && bridgeSource.trim() !== helperBridge.expectedSource) {
  failures.push(`${helperBridge.relativePath}: must re-export the canonical apps/mobile helper only`);
}

if (failures.length > 0) {
  console.error("FAIL: mobile package-manager invocation policy drift detected");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("PASS: mobile package-manager invocation is centralized and shell-independent");
