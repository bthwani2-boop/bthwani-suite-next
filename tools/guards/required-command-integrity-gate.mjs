import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "required-command-integrity-gate";
const violations = [];
const packageFile = "package.json";
const enforcementFile = "governance/github/repository-enforcement.json";
const canonicalWorkflowFile = ".github/workflows/ci.yml";
const fullVerificationTrigger =
  "governance/github/lianbassam-full-verification.trigger.json";
const packageJson = JSON.parse(read(packageFile));
const enforcement = JSON.parse(read(enforcementFile));
const scripts = packageJson.scripts ?? {};

const requiredFailClosedScripts = [
  "guard:markdown-governance",
  "web:runtime-contract:test",
  "ui-kit:catalog:build",
  "visual:ui-kit:contract",
  "performance:api:quick",
  "performance:bundle:size",
];

for (const scriptName of requiredFailClosedScripts) {
  const command = scripts[scriptName];
  if (!command) {
    violations.push({
      file: packageFile,
      scriptName,
      message: `MISSING_REQUIRED_COMMAND: ${scriptName} is not defined`,
    });
    continue;
  }

  if (/\btry\s*\{|\bcatch\s*\(/.test(command)) {
    violations.push({
      file: packageFile,
      scriptName,
      command,
      message: `FALSE_SUCCESS_WRAPPER: ${scriptName} must propagate tool failures instead of catching them`,
    });
  }
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) {
    violations.push({
      file: packageFile,
      scriptName,
      command,
      message: `DYNAMIC_TOOL_DOWNLOAD_FORBIDDEN: ${scriptName} must use repository-locked tools or repository-owned scripts`,
    });
  }
}

const expectedCommands = new Map([
  ["web:runtime-contract:test", "node --test apps/control-panel/runtime/tests/*.test.mjs"],
  ["ui-kit:catalog:build", "node tools/scripts/build-ui-kit-catalog.mjs"],
  ["visual:ui-kit:contract", "node tools/guards/ui-kit-visual-contract-gate.mjs"],
]);
for (const [scriptName, expected] of expectedCommands) {
  if (scripts[scriptName] !== expected) {
    violations.push({
      file: packageFile,
      scriptName,
      command: scripts[scriptName],
      message: `GOVERNED_COMMAND_DRIFT: ${scriptName} must equal ${expected}`,
    });
  }
}

const performanceQuick = scripts["performance:api:quick"] ?? "";
if (performanceQuick.includes("localhost:8080")) {
  violations.push({
    file: packageFile,
    scriptName: "performance:api:quick",
    command: performanceQuick,
    message:
      "HOST_CONTAINER_PORT_CONFUSION: host-side DSH performance checks must not target localhost:8080",
  });
}
if (!performanceQuick.includes("localhost:58080/dsh/health")) {
  violations.push({
    file: packageFile,
    scriptName: "performance:api:quick",
    command: performanceQuick,
    message:
      "GOVERNED_DSH_HEALTH_TARGET_MISSING: performance:api:quick must target http://localhost:58080/dsh/health",
  });
}

for (const [scriptName, command] of Object.entries(scripts)) {
  if (scriptName.startsWith("diagnostics:") || typeof command !== "string") continue;
  if (command.includes("BLOCKED_NEEDS_RUNTIME")) {
    violations.push({
      file: packageFile,
      scriptName,
      command,
      message:
        "DEPRECATED_DECISION_ALIAS: executable scripts must not convert a failed check into BLOCKED_NEEDS_RUNTIME text",
    });
  }
  if (/\b(?:npx|pnpm\s+dlx)\b/.test(command)) {
    violations.push({
      file: packageFile,
      scriptName,
      command,
      message: `UNPINNED_EXECUTION_FORBIDDEN: non-diagnostic command ${scriptName} may not download tools dynamically`,
    });
  }
}

for (const deprecated of [
  "e2e:web:install",
  "e2e:web:smoke",
  "guard:a11y-runtime",
  "storybook:ui-kit:build",
  "visual:ui-kit:smoke",
]) {
  if (deprecated in scripts) {
    violations.push({
      file: packageFile,
      scriptName: deprecated,
      message: `DEPRECATED_UNLOCKED_COMMAND_PRESENT: ${deprecated} must not remain after deterministic replacement`,
    });
  }
}

const workflowDir = path.join(repoRoot, ".github/workflows");
const workflowFiles = fs.existsSync(workflowDir)
  ? fs
      .readdirSync(workflowDir)
      .filter((name) => /\.ya?ml$/i.test(name))
      .sort()
  : [];

if (!workflowFiles.includes("ci.yml")) {
  violations.push({
    file: canonicalWorkflowFile,
    message: "CANONICAL_WORKFLOW_MISSING: .github/workflows/ci.yml is required",
  });
}
if (workflowFiles.length !== 1) {
  violations.push({
    file: ".github/workflows",
    message: `CANONICAL_WORKFLOW_COUNT_INVALID:${workflowFiles.length}:${workflowFiles.join(",")}`,
  });
}
for (const workflowFile of workflowFiles) {
  if (/^tmp-|diagnostic|remediation/i.test(workflowFile)) {
    violations.push({
      file: `.github/workflows/${workflowFile}`,
      message:
        "TEMPORARY_WORKFLOW_FORBIDDEN: diagnostics and remediation must stay inside the canonical workflow",
    });
  }
}

if (fs.existsSync(path.join(repoRoot, canonicalWorkflowFile))) {
  const workflow = read(canonicalWorkflowFile);
  const targetBranch = enforcement.targetBranch;
  if (typeof targetBranch !== "string" || targetBranch.length === 0) {
    violations.push({
      file: enforcementFile,
      message:
        "TARGET_BRANCH_MISSING: repository enforcement must declare the active target branch",
    });
  } else {
    const escapedBranch = targetBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const branchArray = new RegExp(
      `branches:\\s*\\[[^\\]]*\\b${escapedBranch}\\b[^\\]]*\\]`,
      "m",
    );
    const branchList = new RegExp(
      `branches:\\s*\\n(?:\\s*-\\s*[^\\n]+\\n)*\\s*-\\s*${escapedBranch}\\s*$`,
      "m",
    );
    if (!branchArray.test(workflow) && !branchList.test(workflow)) {
      violations.push({
        file: canonicalWorkflowFile,
        targetBranch,
        message: `ACTIVE_BRANCH_NOT_COVERED: canonical workflow does not cover ${targetBranch}`,
      });
    }
  }

  for (const marker of [
    "statuses: write",
    fullVerificationTrigger,
    "full_verification",
    "pnpm run guard:required-command-integrity",
    "pnpm run nx:typecheck",
    "pnpm run nx:lint",
    "pnpm run nx:test",
    "pnpm run nx:build",
    "pnpm run runtime:full:smoke",
    "bthwani/full-verification",
    "EXPECTED_POLICY",
    "EXPECTED_NODE",
    "EXPECTED_DSH",
    "EXPECTED_WLT",
    "EXPECTED_IDENTITY",
    "EXPECTED_WORKFORCE",
    "EXPECTED_PLATFORM",
    "EXPECTED_PROVIDERS",
    "EXPECTED_RUNTIME",
  ]) {
    if (!workflow.includes(marker)) {
      violations.push({
        file: canonicalWorkflowFile,
        message: `FAIL_CLOSED_CI_MARKER_MISSING: ${marker}`,
      });
    }
  }
}

fail(guardId, violations);
