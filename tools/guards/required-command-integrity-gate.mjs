import { fail, read } from "./_guard-utils.mjs";

const guardId = "required-command-integrity-gate";
const violations = [];
const packageFile = "package.json";
const enforcementFile = "governance/github/repository-enforcement.json";
const packageJson = JSON.parse(read(packageFile));
const enforcement = JSON.parse(read(enforcementFile));
const scripts = packageJson.scripts ?? {};

const requiredFailClosedScripts = [
  "guard:markdown-governance",
  "e2e:web:install",
  "e2e:web:smoke",
  "storybook:ui-kit:build",
  "visual:ui-kit:smoke",
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
  if (scriptName.startsWith("diagnostics:")) continue;
  if (typeof command !== "string") continue;
  if (command.includes("BLOCKED_NEEDS_RUNTIME")) {
    violations.push({
      file: packageFile,
      scriptName,
      command,
      message:
        "DEPRECATED_DECISION_ALIAS: executable scripts must use canonical decisions and must not convert a failed check into BLOCKED_NEEDS_RUNTIME text",
    });
  }
}

const targetBranch = enforcement.targetBranch;
if (typeof targetBranch !== "string" || targetBranch.length === 0) {
  violations.push({
    file: enforcementFile,
    message: "TARGET_BRANCH_MISSING: repository enforcement must declare the active target branch",
  });
} else {
  const criticalWorkflows = [
    ".github/workflows/ci.yml",
    ".github/workflows/security.yml",
    ".github/workflows/governance-audit.yml",
    ".github/workflows/dsh-operational-closure-ci.yml",
    ".github/workflows/lian-fullstack-ci.yml",
  ];

  for (const workflowFile of criticalWorkflows) {
    const workflow = read(workflowFile);
    const escapedBranch = targetBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const branchArray = new RegExp(`branches:\\s*\\[[^\\]]*\\b${escapedBranch}\\b[^\\]]*\\]`, "m");
    const branchList = new RegExp(`branches:\\s*\\n(?:\\s*-\\s*[^\\n]+\\n)*\\s*-\\s*${escapedBranch}\\s*$`, "m");

    if (!branchArray.test(workflow) && !branchList.test(workflow)) {
      violations.push({
        file: workflowFile,
        targetBranch,
        message: `ACTIVE_BRANCH_NOT_COVERED: critical workflow does not trigger for ${targetBranch}`,
      });
    }
  }
}

fail(guardId, violations);
