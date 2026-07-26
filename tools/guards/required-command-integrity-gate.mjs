import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "./_guard-utils.mjs";
import { resolveWorkflowInventory } from "./_workflow-registry.mjs";

const guardId = "required-command-integrity-gate";
const violations = [];
const packageFile = "package.json";
const enforcementFile = "governance/github/repository-enforcement.json";
const fullVerificationTrigger = "governance/github/full-verification.trigger.json";
const workflowsRoot = ".github/workflows";
const remediationRelative = `${workflowsRoot}/remediation-analysis.yml`;
// The immutable core is hard-coded here on purpose: the registry may add or remove
// task-class workflows, but changing the core requires editing this guard and
// tools/guards/guard-registry-gate.mjs together.
const immutableCoreWorkflows = [
  "ci-backends.yml",
  "ci-node-diagnostics.yml",
  "ci-node-verification.yml",
  "ci-policy.yml",
  "ci-runtime.yml",
  "ci.yml",
  "dsh-database.yml",
  "jrn-020-025-sambassam-verify.yml",
  "lockfile-snapshot.yml",
  "remediation-analysis.yml",
].sort();

const workflowInventory = resolveWorkflowInventory(repoRoot, immutableCoreWorkflows);
violations.push(...workflowInventory.violations);
const expectedWorkflowFiles = workflowInventory.expectedFiles;

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function text(relativePath) {
  if (!exists(relativePath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return read(relativePath);
}

function requireMarkers(relativePath, markers) {
  const content = text(relativePath);
  for (const marker of markers) {
    if (!content.includes(marker)) {
      violations.push({
        file: relativePath,
        line: 0,
        message: `REQUIRED_MARKER_MISSING ${marker}`,
      });
    }
  }
  return content;
}

function rejectMarkers(relativePath, content, markers) {
  for (const [label, pattern] of markers) {
    if (pattern.test(content)) {
      violations.push({ file: relativePath, line: 0, message: label });
    }
  }
}

function verifyRemediationBoundary(content) {
  requireMarkers(remediationRelative, [
    "name: BThwani Manual Patch Verification",
    "workflow_dispatch:",
    "permissions:\n  contents: read",
    "Verify candidate source without auto-repair",
    "Logic, binding, duplication, and repository integrity",
    "Type, lint, test, and build verification",
    "backend and database",
    "Dependency, secret, workflow, and container security",
    "Integrated SaaS runtime proof",
    "Export evidence-backed remediation patch",
    "persist-credentials: false",
    "patch_sha256",
    "sha256sum",
    "Unapproved deletion rejected",
    "Protected deletion rejected",
    "manual-patch-only-no-privileged-write",
  ]);

  if (/^\s{2}(?:workflow_run|pull_request_target|schedule|repository_dispatch):/m.test(content)) {
    violations.push({ file: remediationRelative, line: 0, message: "REMEDIATION_MUST_REMAIN_EXPLICITLY_MANUAL" });
  }
  if (/\bsecrets\.[A-Za-z0-9_]+\b/.test(content)) {
    violations.push({ file: remediationRelative, line: 0, message: "REMEDIATION_REPOSITORY_SECRET_FORBIDDEN" });
  }
  if (/contents:\s*write\b|pull-requests:\s*write\b|statuses:\s*write\b|write-all\b/i.test(content)) {
    violations.push({ file: remediationRelative, line: 0, message: "REMEDIATION_PRIVILEGED_WRITE_FORBIDDEN" });
  }
  if (/\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+(?:create|merge))\b/i.test(content)) {
    violations.push({ file: remediationRelative, line: 0, message: "REMEDIATION_BRANCH_OR_PR_MUTATION_FORBIDDEN" });
  }
  if (/uses:\s*[^\s#]+@(?:latest|master|main)\b/i.test(content)) {
    violations.push({ file: remediationRelative, line: 0, message: "REMEDIATION_DYNAMIC_ACTION_VERSION_FORBIDDEN" });
  }
}

const packageJson = JSON.parse(text(packageFile));
const enforcement = JSON.parse(text(enforcementFile));
const scripts = packageJson.scripts ?? {};

const requiredFailClosedScripts = [
  "guard:markdown-governance",
  "guard:required-command-integrity",
  "guard:workflow-lint",
  "guard:workflow-security",
  "guard:actions-pin",
  "guard:cleanup-policy",
  "guard:a11y",
  "guard:repo-naming",
  "web:runtime-contract:test",
  "ui-kit:catalog:build",
  "visual:ui-kit:contract",
  "performance:api:quick",
  "performance:bundle:size",
];

for (const scriptName of requiredFailClosedScripts) {
  const command = scripts[scriptName];
  if (typeof command !== "string" || command.trim() === "") {
    violations.push({ file: packageFile, line: 0, message: `MISSING_REQUIRED_COMMAND ${scriptName}` });
    continue;
  }
  if (/\|\|\s*true|\bcontinue-on-error\b|\bcatch\s*\(/i.test(command)) {
    violations.push({ file: packageFile, line: 0, message: `FALSE_SUCCESS_WRAPPER ${scriptName}` });
  }
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) {
    violations.push({ file: packageFile, line: 0, message: `DYNAMIC_TOOL_DOWNLOAD_FORBIDDEN ${scriptName}` });
  }
}

const expectedCommands = new Map([
  ["web:runtime-contract:test", "node --test apps/control-panel/runtime/tests/*.test.mjs"],
  ["ui-kit:catalog:build", "node tools/scripts/build-ui-kit-catalog.mjs"],
  ["visual:ui-kit:contract", "node tools/guards/ui-kit-visual-contract-gate.mjs"],
  ["guard:required-command-integrity", "node tools/guards/required-command-integrity-gate.mjs"],
]);
for (const [scriptName, expected] of expectedCommands) {
  if (scripts[scriptName] !== expected) {
    violations.push({ file: packageFile, line: 0, message: `GOVERNED_COMMAND_DRIFT ${scriptName}` });
  }
}

const performanceQuick = scripts["performance:api:quick"] ?? "";
if (performanceQuick.includes("localhost:8080")) {
  violations.push({ file: packageFile, line: 0, message: "LEGACY_DSH_HOST_PORT_FORBIDDEN" });
}
if (!performanceQuick.includes("localhost:58080/dsh/health")) {
  violations.push({ file: packageFile, line: 0, message: "GOVERNED_DSH_HEALTH_TARGET_MISSING" });
}

for (const [scriptName, command] of Object.entries(scripts)) {
  if (typeof command !== "string" || scriptName.startsWith("diagnostics:")) continue;
  if (command.includes("BLOCKED_NEEDS_RUNTIME")) {
    violations.push({ file: packageFile, line: 0, message: `DEPRECATED_DECISION_ALIAS ${scriptName}` });
  }
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) {
    violations.push({ file: packageFile, line: 0, message: `UNPINNED_EXECUTION_FORBIDDEN ${scriptName}` });
  }
}

if (!exists(fullVerificationTrigger)) {
  violations.push({ file: fullVerificationTrigger, line: 0, message: "FULL_VERIFICATION_TRIGGER_MISSING" });
}

const workflowDir = path.join(repoRoot, workflowsRoot);
const workflowFiles = exists(workflowsRoot)
  ? fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name)).sort()
  : [];
if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) {
  violations.push({
    file: workflowsRoot,
    line: 0,
    message: `WORKFLOW_INVENTORY_DRIFT expected=${expectedWorkflowFiles.join(",")} actual=${workflowFiles.join(",")}`,
  });
}

for (const workflowFile of workflowFiles) {
  const relative = `${workflowsRoot}/${workflowFile}`;
  const content = text(relative);
  if (relative !== remediationRelative) {
    rejectMarkers(relative, content, [
      ["SOURCE_WRITE_PERMISSION_FORBIDDEN", /contents:\s*write\b|write-all\b/i],
      ["STATUS_WRITE_PERMISSION_FORBIDDEN", /statuses:\s*write\b/i],
      ["PULL_REQUEST_TARGET_FORBIDDEN", /pull_request_target\s*:/i],
      ["CI_SOURCE_MUTATION_FORBIDDEN", /\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+merge)\b/i],
      ["CI_SOURCE_REWRITE_FORBIDDEN", /\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|nx\b[^\n]*--fix|sed\s+-i|perl\s+-pi)\b/i],
      ["DYNAMIC_ACTION_VERSION_FORBIDDEN", /uses:\s*[^\s#]+@(?:latest|master|main)\b/i],
    ]);
  } else {
    verifyRemediationBoundary(content);
  }
  if (!/^permissions:\s*(?:\n|$)/m.test(content) && !/^permissions:\s*\{\s*\}\s*$/m.test(content)) {
    violations.push({ file: relative, line: 0, message: "EXPLICIT_TOP_LEVEL_PERMISSIONS_REQUIRED" });
  }
}

const ci = requireMarkers(`${workflowsRoot}/ci.yml`, [
  "branches: [master]",
  fullVerificationTrigger,
  "uses: ./.github/workflows/ci-policy.yml",
  "uses: ./.github/workflows/ci-node-diagnostics.yml",
  "uses: ./.github/workflows/ci-node-verification.yml",
  "uses: ./.github/workflows/ci-backends.yml",
  "uses: ./.github/workflows/ci-runtime.yml",
  "name: BThwani CI result",
  "if: ${{ always() }}",
  "Enforce fail-closed aggregate result",
]);
if ((ci.match(/^\s*concurrency:\s*$/gm) ?? []).length !== 1) {
  violations.push({ file: `${workflowsRoot}/ci.yml`, line: 0, message: "ONE_WORKFLOW_LEVEL_CONCURRENCY_REQUIRED" });
}

requireMarkers(`${workflowsRoot}/ci-policy.yml`, [
  "permissions:",
  "contents: read",
  "guard:governance-schema",
  "guard:agent-governance",
  "guard:authority-separation",
  "guard:saas-governance",
  "guard:guard-registry",
  "guard:sdlc",
  "sdlc-governance-${{ github.run_id }}",
  "guard:cleanup-policy",
  "check-portable-tracked-config.mjs",
  "check-repository-hygiene.mjs",
  "guard:required-command-integrity",
  "guard:actions-pin",
  "guard:workflow-lint",
  "guard:workflow-security",
  "guard:opa-policies",
]);

requireMarkers(`${workflowsRoot}/lockfile-snapshot.yml`, [
  "name: BThwani Lockfile Snapshot",
  "permissions:\n  contents: read",
  "persist-credentials: false",
  "pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts",
  "pnpm install --lockfile-only --frozen-lockfile --ignore-scripts --offline",
  "Upload lockfile candidate",
]);

requireMarkers(`${workflowsRoot}/jrn-020-025-sambassam-verify.yml`, [
  "guard:fullstack-boundary",
  "guard:wlt-financial-boundary",
  "TestJourneys020To025ExposeGovernedRoutes",
  "persist-credentials: false",
]);

requireMarkers(`${workflowsRoot}/ci-node-diagnostics.yml`, [
  "pnpm exec knip",
  "guard:logic-coverage",
  "guard:a11y",
  "guard:dependency-graph",
  "guard:ast-grep-rules",
  "guard:repo-naming",
  "guard:repo-structure",
  "pnpm --dir contracts typecheck",
  "guard:api-binding",
  "guard:backend-api-binding",
  "guard:frontend-feature-binding",
]);

requireMarkers(`${workflowsRoot}/ci-node-verification.yml`, [
  "pnpm exec nx run-many -t test --all --outputStyle=stream",
  "pnpm exec nx affected -t test --outputStyle=stream",
  "pnpm run nx:typecheck",
  "pnpm run nx:lint",
  "pnpm run nx:build",
  "run-journey-gate.ps1",
  "tsconfig.platform-change-sets.json",
  "contracts/platform-change-sets.openapi.yaml",
  "tools/guards/platform-change-sets-gate.mjs",
]);

requireMarkers(`${workflowsRoot}/ci-backends.yml`, [
  "Select affected backends",
  "Apply migrations",
  "go test ./...",
  "go build ./...",
]);

requireMarkers(`${workflowsRoot}/ci-runtime.yml`, [
  "runtime:full:smoke",
  "Stop runtime",
]);

requireMarkers(`${workflowsRoot}/dsh-database.yml`, [
  "contents: read",
  "postgres:16-alpine",
  "invoke-dsh-database.ps1",
]);

if (enforcement.targetBranch !== "master") {
  violations.push({ file: enforcementFile, line: 0, message: "TARGET_BRANCH_MUST_BE_MASTER" });
}

fail(guardId, violations);
