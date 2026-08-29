import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governedFiles = [
  "tools/mobile/eas-build-mobile.mjs",
  "tools/mobile/upgrade-mobile-packages.mjs",
  "tools/scripts/contracts/typecheck.mjs",
  "tools/scripts/export-mobile-app.mjs",
  "tools/scripts/generate-sonar-node-coverage.mjs",
  "tools/scripts/guard-mobile-apps.mjs",
  "tools/scripts/run-affected-verification.mjs",
  "tools/scripts/run-command-check.mjs",
  "tools/scripts/run-tsc-check.mjs",
  "tools/scripts/sync-mobile-apps.mjs",
  "tools/scripts/verify-mobile-prebuild.mjs",
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
const windowsBridgePath = "tools/mobile/lib/invoke-package-manager.ps1";
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
  if (/shell\s*:\s*true/.test(source)) failures.push(`${relativePath}: shell:true is forbidden`);
  if (/(?<![.\w])(?:exec|execSync)\s*\(/.test(source)) failures.push(`${relativePath}: string command execution is forbidden`);
}

for (const wrapper of compatibilityWrappers) {
  const source = readSource(wrapper.relativePath);
  if (source !== undefined && source.trim() !== wrapper.expectedSource) {
    failures.push(`${wrapper.relativePath}: compatibility wrapper must delegate only to tools/mobile/eas-build-mobile.mjs`);
  }
}

const canonicalHelper = readSource(canonicalHelperPath);
if (canonicalHelper !== undefined) {
  for (const forbidden of ["cmd.exe", "ComSpec", '"/c"', "npm_execpath", "shell: true"]) {
    if (canonicalHelper.includes(forbidden)) failures.push(`${canonicalHelperPath}: forbidden shell/ambient executable coupling: ${forbidden}`);
  }
  for (const required of [
    "invoke-package-manager.ps1",
    'allowedPackageManagers = new Set(["pnpm", "npx"])',
    '["node", () => process.execPath]',
    '["git", () => "git"]',
    'executable: "pwsh"',
    "Unsupported governed command",
  ]) {
    if (!canonicalHelper.includes(required)) failures.push(`${canonicalHelperPath}: missing fixed invocation invariant: ${required}`);
  }
}

const windowsBridge = readSource(windowsBridgePath);
if (windowsBridge !== undefined) {
  for (const forbidden of ["Invoke-Expression", "Start-Process", "cmd.exe", "/c"]) {
    if (windowsBridge.includes(forbidden)) failures.push(`${windowsBridgePath}: forbidden command-string execution marker: ${forbidden}`);
  }
  if (/(^|[\s"'`])-Command(?=$|[\s"'`])/.test(windowsBridge)) {
    failures.push(`${windowsBridgePath}: forbidden command-string execution marker: -Command`);
  }
  for (const required of [
    "@('pnpm', 'npx')",
    'if ($requestedCommand -notin $allowedCommands)',
    'Get-Command "$requestedCommand.CMD" -CommandType Application',
    "& $executable.Source @forwardedArguments",
  ]) {
    if (!windowsBridge.includes(required)) failures.push(`${windowsBridgePath}: missing argv invocation invariant: ${required}`);
  }
}

const commandCheck = readSource("tools/scripts/run-command-check.mjs");
if (commandCheck !== undefined && !commandCheck.includes('["pnpm", "npx"].includes(command)')) {
  failures.push("tools/scripts/run-command-check.mjs: arbitrary executable names must be rejected");
}

const bridgeSource = readSource(helperBridge.relativePath);
if (bridgeSource !== undefined && bridgeSource.trim() !== helperBridge.expectedSource) {
  failures.push(`${helperBridge.relativePath}: must re-export the canonical tools/mobile helper only`);
}

if (failures.length > 0) {
  console.error("FAIL: governed command invocation policy drift detected");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("PASS: governed command execution is allowlisted, argv-only, and free of cmd.exe /c indirection");
