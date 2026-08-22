import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governedFiles = [
  "tools/mobile/eas-build-mobile.mjs",
  "tools/mobile/upgrade-mobile-packages.mjs",
  "tools/scripts/export-mobile-app.mjs",
  "tools/scripts/guard-mobile-apps.mjs",
  "tools/scripts/sync-mobile-apps.mjs",
  "tools/scripts/verify-mobile-prebuild.mjs",
  "tools/scripts/generate-sonar-node-coverage.mjs",
  "tools/scripts/run-tsc-check.mjs",
  "tools/scripts/run-command-check.mjs",
  "tools/scripts/run-affected-verification.mjs",
  "tools/scripts/contracts/typecheck.mjs",
  "tools/guards/generated-client-provenance-gate.mjs",
];
const compatibilityWrappers = [
  {
    relativePath: "tools/scripts/eas-build-mobile.mjs",
    expectedSource: 'await import("../mobile/eas-build-mobile.mjs");',
  },
];
const helperBridge = {
  relativePath: "tools/scripts/lib/package-manager-invocation.mjs",
  expectedSource: 'export { resolvePackageManagerInvocation } from "../../mobile/lib/package-manager-invocation.mjs";',
};
const canonicalHelperPath = "tools/mobile/lib/package-manager-invocation.mjs";
const windowsPnpmBridgePath = "tools/mobile/lib/invoke-pnpm.ps1";
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

  if (source.includes("npm_execpath")) {
    failures.push(`${relativePath}: ambient npm_execpath executable authority is forbidden`);
  }
  if (/shell\s*:\s*true/.test(source)) {
    failures.push(`${relativePath}: shell:true is forbidden in governed command execution`);
  }
  if (/\b(?:exec|execSync)\s*\(/.test(source)) {
    failures.push(`${relativePath}: string-based child-process execution is forbidden`);
  }
}

for (const wrapper of compatibilityWrappers) {
  const source = readSource(wrapper.relativePath);
  if (source === undefined) continue;
  if (source.trim() !== wrapper.expectedSource) {
    failures.push(`${wrapper.relativePath}: compatibility wrapper must delegate only to tools/mobile/eas-build-mobile.mjs`);
  }
}

const canonicalHelper = readSource(canonicalHelperPath);
if (canonicalHelper !== undefined) {
  for (const required of [
    "export function resolvePackageManagerInvocation",
    "invoke-pnpm.ps1",
    'executable: "pwsh"',
    'command !== "pnpm"',
    "encodeArguments(normalizedArgs)",
  ]) {
    if (!canonicalHelper.includes(required)) {
      failures.push(`${canonicalHelperPath}: missing executable-authority invariant: ${required}`);
    }
  }
  for (const forbidden of ["cmd.exe", "ComSpec", "npm_execpath", '"/c"']) {
    if (canonicalHelper.includes(forbidden)) {
      failures.push(`${canonicalHelperPath}: forbidden ambient shell/executable coupling: ${forbidden}`);
    }
  }
  if (/shell\s*:\s*true/.test(canonicalHelper)) {
    failures.push(`${canonicalHelperPath}: shell:true is forbidden`);
  }
}

const windowsBridge = readSource(windowsPnpmBridgePath);
if (windowsBridge !== undefined) {
  for (const required of [
    "FromBase64String",
    "ConvertFrom-Json",
    "$packageManagerArgs.ToArray()",
    "& pnpm @argv",
  ]) {
    if (!windowsBridge.includes(required)) {
      failures.push(`${windowsPnpmBridgePath}: missing argv-preservation invariant: ${required}`);
    }
  }
  for (const forbidden of ["Invoke-Expression", "Start-Process", "cmd.exe", "-Command", "/c"]) {
    if (windowsBridge.includes(forbidden)) {
      failures.push(`${windowsPnpmBridgePath}: forbidden command-string execution marker: ${forbidden}`);
    }
  }
}

const bridgeSource = readSource(helperBridge.relativePath);
if (bridgeSource !== undefined && bridgeSource.trim() !== helperBridge.expectedSource) {
  failures.push(`${helperBridge.relativePath}: must re-export the canonical tools/mobile helper only`);
}

if (failures.length > 0) {
  console.error("FAIL: governed package-manager invocation policy drift detected");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("PASS: package-manager execution is centralized, argv-preserving, and free of ambient shell authority");
