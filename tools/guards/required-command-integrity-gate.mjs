import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, read, repoRoot } from "./_guard-utils.mjs";
import { resolveWorkflowInventory } from "./_workflow-registry.mjs";

const guardId = "required-command-integrity-gate";
const violations = [];
const packageFile = "package.json";
const fullVerificationPolicy = "governance/contracts/full-verification-policy.json";
const workflowsRoot = ".github/workflows";
const manualDeepRelative = `${workflowsRoot}/manual-deep-verification.yml`;
const lockfileIntegrityRelative = `${workflowsRoot}/lockfile-integrity.yml`;
const immutableCoreWorkflows = [
  "ci-backends.yml", "ci-node-diagnostics.yml", "ci-node-verification.yml", "ci-policy.yml", "ci-runtime.yml", "ci.yml",
  "dsh-database.yml", "lockfile-integrity.yml", "manual-deep-verification.yml",
].sort();

const workflowInventory = resolveWorkflowInventory(repoRoot, immutableCoreWorkflows);
violations.push(...workflowInventory.violations);
const expectedWorkflowFiles = workflowInventory.expectedFiles;

const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));
function text(relativePath) {
  if (!exists(relativePath)) { violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" }); return ""; }
  return read(relativePath);
}
function requireMarkers(relativePath, markers) {
  const content = text(relativePath);
  for (const marker of markers) if (!content.includes(marker)) violations.push({ file: relativePath, line: 0, message: `REQUIRED_MARKER_MISSING ${marker}` });
  return content;
}
function rejectMarkers(relativePath, content, markers) {
  for (const [label, pattern] of markers) if (pattern.test(content)) violations.push({ file: relativePath, line: 0, message: label });
}

const packageJson = JSON.parse(text(packageFile));
const scripts = packageJson.scripts ?? {};
const requiredFailClosedScripts = [
  "guard:required-command-integrity", "guard:governance-schema", "guard:workflow-lint", "guard:workflow-security", "guard:actions-pin",
  "guard:a11y", "web:runtime-contract:test", "ui-kit:catalog:build", "visual:ui-kit:contract",
  "performance:api:quick", "performance:bundle:size",
];
for (const scriptName of requiredFailClosedScripts) {
  const command = scripts[scriptName];
  if (typeof command !== "string" || command.trim() === "") { violations.push({ file: packageFile, line: 0, message: `MISSING_REQUIRED_COMMAND ${scriptName}` }); continue; }
  if (/\|\|\s*true|\bcontinue-on-error\b|\bcatch\s*\(/i.test(command)) violations.push({ file: packageFile, line: 0, message: `FALSE_SUCCESS_WRAPPER ${scriptName}` });
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) violations.push({ file: packageFile, line: 0, message: `DYNAMIC_TOOL_DOWNLOAD_FORBIDDEN ${scriptName}` });
}

const expectedCommands = new Map([
  ["web:runtime-contract:test", "node --test apps/control-panel/runtime/tests/*.test.mjs"],
  ["ui-kit:catalog:build", "node tools/scripts/build-ui-kit-catalog.mjs"],
  ["visual:ui-kit:contract", "node tools/guards/ui-kit-visual-contract-gate.mjs"],
  ["guard:required-command-integrity", "node tools/guards/required-command-integrity-gate.mjs"],
  ["guard:governance-schema", "node tools/guards/governance-schema-gate.mjs"],
]);
for (const [scriptName, expected] of expectedCommands) if (scripts[scriptName] !== expected) violations.push({ file: packageFile, line: 0, message: `GOVERNED_COMMAND_DRIFT ${scriptName}` });

const governanceSchema = spawnSync(process.execPath, [path.join(repoRoot, "tools", "guards", "governance-schema-gate.mjs")], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (governanceSchema.status !== 0) {
  violations.push({
    file: "tools/guards/governance-schema-gate.mjs",
    line: 0,
    message: `GOVERNANCE_SCHEMA_GATE_FAILED ${(governanceSchema.stderr || governanceSchema.stdout || "").trim()}`,
  });
}

const performanceQuick = scripts["performance:api:quick"] ?? "";
if (performanceQuick.includes("localhost:8080")) violations.push({ file: packageFile, line: 0, message: "LEGACY_DSH_HOST_PORT_FORBIDDEN" });
if (!performanceQuick.includes("localhost:58080/dsh/health")) violations.push({ file: packageFile, line: 0, message: "GOVERNED_DSH_HEALTH_TARGET_MISSING" });

for (const [scriptName, command] of Object.entries(scripts)) {
  if (typeof command !== "string" || scriptName.startsWith("diagnostics:")) continue;
  if (command.includes("BLOCKED_NEEDS_RUNTIME")) violations.push({ file: packageFile, line: 0, message: `DEPRECATED_DECISION_ALIAS ${scriptName}` });
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) violations.push({ file: packageFile, line: 0, message: `UNPINNED_EXECUTION_FORBIDDEN ${scriptName}` });
}
if (!exists(fullVerificationPolicy)) violations.push({ file: fullVerificationPolicy, line: 0, message: "FULL_VERIFICATION_POLICY_MISSING" });

const mobileManifestRelative = "tools/mobile/mobile-apps.manifest.json";
let mobileManifest = {};
try { mobileManifest = JSON.parse(text(mobileManifestRelative)); }
catch (error) { violations.push({ file: mobileManifestRelative, line: 0, message: `INVALID_MOBILE_MANIFEST ${error.message}` }); }
const mobileApps = Object.keys(mobileManifest.apps ?? {}).sort();
const expectedMobileApps = ["app-captain", "app-client", "app-field", "app-partner"];
if (JSON.stringify(mobileApps) !== JSON.stringify(expectedMobileApps)) {
  violations.push({ file: mobileManifestRelative, line: 0, message: `MOBILE_APP_INVENTORY_DRIFT expected=${expectedMobileApps.join(",")} actual=${mobileApps.join(",")}` });
}
for (const appKey of mobileApps) {
  const appPackageRelative = `apps/${appKey}/runtime/package.json`;
  const testsRelative = `apps/${appKey}/runtime/tests`;
  if (!exists(appPackageRelative)) continue;
  let appPackage = {};
  try { appPackage = JSON.parse(text(appPackageRelative)); }
  catch (error) { violations.push({ file: appPackageRelative, line: 0, message: `INVALID_MOBILE_PACKAGE ${error.message}` }); continue; }
  const appScripts = appPackage.scripts ?? {};
  const expectedMobileScripts = {
    "test:app": "node --test tests/*.test.mjs",
    "test:runtime": `node ../../mobile/test-mobile-runtime-contract.mjs --app ${appKey}`,
    test: "pnpm run test:app && pnpm run test:runtime",
  };
  for (const [scriptName, expected] of Object.entries(expectedMobileScripts)) {
    if (appScripts[scriptName] !== expected) violations.push({ file: appPackageRelative, line: 0, message: `MOBILE_TEST_COMMAND_DRIFT ${scriptName}` });
  }
  const testsDir = path.join(repoRoot, testsRelative);
  if (!fs.existsSync(testsDir)) { violations.push({ file: testsRelative, line: 0, message: "MOBILE_TEST_DIRECTORY_MISSING" }); continue; }
  const testFiles = fs.readdirSync(testsDir).filter((name) => name.endsWith(".test.mjs")).sort();
  if (testFiles.length === 0) { violations.push({ file: testsRelative, line: 0, message: "MOBILE_OWNED_TESTS_MISSING" }); continue; }
  if (!testFiles.some((name) => name.endsWith(".execution.test.mjs"))) violations.push({ file: testsRelative, line: 0, message: "MOBILE_EXECUTION_TEST_MISSING" });
  for (const name of testFiles) {
    const relative = `${testsRelative}/${name}`;
    const content = text(relative);
    if (/\|\|\s*true|process\.exit\(0\)|continue-on-error/i.test(content)) violations.push({ file: relative, line: 0, message: "MOBILE_TEST_FALSE_SUCCESS_FORBIDDEN" });
    for (const sibling of expectedMobileApps) {
      if (sibling !== appKey && content.includes(`apps/${sibling}/runtime/`)) violations.push({ file: relative, line: 0, message: `MOBILE_TEST_SIBLING_OWNERSHIP_FORBIDDEN ${sibling}` });
    }
  }
}
const sharedMobileTestsRelative = "apps/mobile/tests";
const sharedMobileTestsDir = path.join(repoRoot, sharedMobileTestsRelative);
if (!fs.existsSync(sharedMobileTestsDir)) violations.push({ file: sharedMobileTestsRelative, line: 0, message: "MOBILE_SHARED_TEST_DIRECTORY_MISSING" });
else if (!fs.readdirSync(sharedMobileTestsDir).some((name) => name.endsWith(".test.mjs"))) violations.push({ file: sharedMobileTestsRelative, line: 0, message: "MOBILE_SHARED_TESTS_MISSING" });
for (const requiredSharedTest of [
  "identity-development.contract.test.mjs",
  "mobile-dev-gateway-client.execution.test.mjs",
  "mobile-dev-gateway.execution.test.mjs",
  "mobile-runtime-transport.contract.test.mjs",
  "dsh-binary-http-request.execution.test.mjs",
  "mobile-nx-ownership.execution.test.mjs",
  "mobile-lan-powershell.execution.test.mjs",
]) {
  if (!exists(`${sharedMobileTestsRelative}/${requiredSharedTest}`)) {
    violations.push({ file: `${sharedMobileTestsRelative}/${requiredSharedTest}`, line: 0, message: "MOBILE_REQUIRED_SHARED_EVIDENCE_MISSING" });
  }
}
requireMarkers("apps/mobile/test-mobile-runtime-contract.mjs", ["test:app", "test:runtime", "*.execution.test.mjs"]);
requireMarkers("tools/scripts/verify-mobile-test-stack.ps1", [
  "node --test apps/mobile/tests/*.test.mjs",
  "test-dsh-multisurface-runtime-matrix-v2.ps1",
  "nx run-many -t test --all --outputStyle=stream",
]);
requireMarkers("tools/scripts/verify-mobile-android-smoke.ps1", [
  "tools/mobile/mobile-apps.manifest.json",
  "shell pm path",
  "shell monkey",
  "shell pidof",
  "dumpsys activity activities",
]);

const workflowFiles = exists(workflowsRoot) ? fs.readdirSync(path.join(repoRoot, workflowsRoot)).filter((name) => /\.ya?ml$/i.test(name)).sort() : [];
if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) violations.push({ file: workflowsRoot, line: 0, message: `WORKFLOW_INVENTORY_DRIFT expected=${expectedWorkflowFiles.join(",")} actual=${workflowFiles.join(",")}` });
for (const workflowFile of workflowFiles) {
  const relative = `${workflowsRoot}/${workflowFile}`;
  const content = text(relative);
  rejectMarkers(relative, content, [
    ["SOURCE_WRITE_PERMISSION_FORBIDDEN", /contents:\s*write\b|write-all\b/i],
    ["STATUS_WRITE_PERMISSION_FORBIDDEN", /statuses:\s*write\b/i],
    ["PULL_REQUEST_TARGET_FORBIDDEN", /pull_request_target\s*:/i],
    ["CI_SOURCE_MUTATION_FORBIDDEN", /\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+(?:create|merge))\b/i],
    ["CI_SOURCE_REWRITE_FORBIDDEN", /\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|nx\b[^\n]*--fix|sed\s+-i|perl\s+-pi)\b/i],
    ["DYNAMIC_ACTION_VERSION_FORBIDDEN", /uses:\s*[^\s#]+@(?:latest|master|main)\b/i],
  ]);
  if (!/^permissions:\s*(?:\n|$)/m.test(content) && !/^permissions:\s*\{\s*\}\s*$/m.test(content)) violations.push({ file: relative, line: 0, message: "EXPLICIT_TOP_LEVEL_PERMISSIONS_REQUIRED" });
}

const manualDeep = requireMarkers(manualDeepRelative, [
  "name: BThwani Manual Deep Verification", "workflow_dispatch:", "default: affected", "Verify immutable candidate",
  "Resolve affected and risk-expanded mode", "Reject tracked source mutation", "Build exact-SHA decision manifest",
  "read-only-exact-sha-verification", "persist-credentials: false",
]);
rejectMarkers(manualDeepRelative, manualDeep, [
  ["MANUAL_VERIFICATION_CLEANUP_APPLY_FORBIDDEN", /apply-repository-cleanup\.mjs\s+--apply/],
  ["MANUAL_VERIFICATION_PATCH_GENERATION_FORBIDDEN", /git\s+diff[^\n>]*>[^\n]*\.patch/],
  ["MANUAL_VERIFICATION_GIT_ADD_FORBIDDEN", /\bgit\s+add\b/],
  ["MANUAL_VERIFICATION_SOURCE_FIX_FORBIDDEN", /\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|sed\s+-i|perl\s+-pi)\b/i],
]);

const lockfile = requireMarkers(lockfileIntegrityRelative, [
  "name: BThwani Lockfile Integrity", "permissions:\n  contents: read", "persist-credentials: false",
  "pnpm install --frozen-lockfile --ignore-scripts", "Reject tracked source mutation", "git diff --cached --quiet --exit-code",
]);
rejectMarkers(lockfileIntegrityRelative, lockfile, [
  ["LOCKFILE_GENERATION_FORBIDDEN", /--lockfile-only|--no-frozen-lockfile/],
  ["LOCKFILE_ARTIFACT_GENERATION_FORBIDDEN", /upload-artifact|lockfile candidate/i],
]);
if (exists(`${workflowsRoot}/lockfile-snapshot.yml`)) violations.push({ file: `${workflowsRoot}/lockfile-snapshot.yml`, line: 0, message: "RETIRED_LOCKFILE_SNAPSHOT_WORKFLOW_PRESENT" });

const ci = requireMarkers(`${workflowsRoot}/ci.yml`, [
  "branches: [\"**\"]", fullVerificationPolicy, "uses: ./.github/workflows/ci-policy.yml", "uses: ./.github/workflows/ci-node-diagnostics.yml",
  "uses: ./.github/workflows/ci-node-verification.yml", "uses: ./.github/workflows/ci-backends.yml", "uses: ./.github/workflows/ci-runtime.yml",
  "name: BThwani CI result", "if: ${{ always() }}", "Enforce fail-closed aggregate result",
]);
if ((ci.match(/^\s*concurrency:\s*$/gm) ?? []).length !== 1) violations.push({ file: `${workflowsRoot}/ci.yml`, line: 0, message: "ONE_WORKFLOW_LEVEL_CONCURRENCY_REQUIRED" });

const ciPolicy = requireMarkers(`${workflowsRoot}/ci-policy.yml`, [
  "guard:required-command-integrity", "guard:actions-pin", "guard:workflow-lint", "guard:workflow-security", "guard:opa-policies",
  "generated-client-provenance.log",
]);
rejectMarkers(`${workflowsRoot}/ci-policy.yml`, ciPolicy, [
  ["CI_GENERATED_SOURCE_MATERIALIZATION_FORBIDDEN", /openapi:generate:all/],
]);

requireMarkers(`${workflowsRoot}/ci-node-diagnostics.yml`, ["pnpm exec knip", "guard:logic-all", "guard:a11y", "guard:dependency-graph", "guard:ast-grep-rules", "guard:api-binding", "guard:backend-api-binding", "guard:frontend-feature-binding"]);
requireMarkers(`${workflowsRoot}/ci-node-verification.yml`, ["node --test apps/mobile/tests/*.test.mjs", "pnpm exec nx run-many -t test --all --outputStyle=stream", "pnpm exec nx affected -t test --outputStyle=stream", "pnpm run nx:typecheck", "pnpm run nx:lint", "pnpm run nx:build"]);
requireMarkers(`${workflowsRoot}/ci-backends.yml`, ["Select affected backends", "Apply migrations", "go test ", "go build "]);
requireMarkers(`${workflowsRoot}/ci-runtime.yml`, ["runtime:full:smoke", "mobile:four-app-integration", "test-dsh-multisurface-runtime-matrix-v2.ps1", "Stop runtime"]);
requireMarkers(`${workflowsRoot}/dsh-database.yml`, ["contents: read", "postgis/postgis:16-3.4-alpine", "invoke-dsh-database.ps1"]);

fail(guardId, violations);
