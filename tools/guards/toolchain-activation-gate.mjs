import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "toolchain-activation-gate";
const violations = [];

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    violations.push({
      file: rel,
      line: 0,
      message: "INVALID_JSON: " + error.message
    });
    return fallback;
  }
}

function readWorkflowText() {
  const dir = path.join(repoRoot, ".github/workflows");
  if (!fs.existsSync(dir)) return "";
  let text = "";
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
    text += fs.readFileSync(path.join(dir, name), "utf8") + "\n";
  }
  return text;
}

const catalog = readJson("tools/toolchain/tool-catalog.v5.json", { entries: [] });
const baseline = readJson("tools/toolchain/tool-activation-baseline.json", { baseline: {} }).baseline || {};
const packageJson = readJson("package.json", { scripts: {} });
const scripts = packageJson.scripts || {};
const workflowText = readWorkflowText().toLowerCase();

const scriptByTool = {
  codeql: "github/codeql-action",
  sonarqube: "sonarqube",
  gitleaks: "guard:secrets",
  trivy: "security:trivy",
  "osv-scanner": "security:osv",
  conftest: "guard:opa-policies",
  "markdownlint-cli2": "guard:markdown-governance",
  actionlint: "guard:workflow-lint",
  zizmor: "guard:workflow-security",
  nx: "nx:projects",
  opa: "guard:opa-policies",
  ajv: "guard:governance-schema",
  regal: "guard:rego-lint",
  pinact: "guard:actions-pin",
  shellcheck: "guard:shellcheck",
  hadolint: "guard:dockerfile-lint",
  yamllint: "guard:yaml-lint",
  "ls-lint": "guard:ls-lint",
  playwright: "e2e:web:smoke",
  axe: "guard:a11y-runtime",
  storybook: "diagnostics:storybook"
};

const workflowEvidenceByTool = {
  codeql: ["github/codeql-action"],
  sonarqube: ["sonarqube", "sonar-scanner"],
  gitleaks: ["gitleaks", "guard:secrets"],
  trivy: ["aquasecurity/trivy-action", "security:trivy", "trivy"],
  "osv-scanner": ["osv-scanner", "security:osv"],
  conftest: ["open-policy-agent/conftest-action", "guard:opa-policies", "conftest"],
  "markdownlint-cli2": ["guard:markdown-governance", "markdownlint"],
  actionlint: ["reviewdog/action-actionlint", "guard:workflow-lint", "actionlint"],
  zizmor: ["woodruffw/zizmor-action", "guard:workflow-security", "zizmor"],
  nx: ["nx:projects", "nx affected", "nx run-many"]
};

function hasPackageScript(scriptName) {
  if (!scriptName) return false;
  if (scriptName === "github/codeql-action" || scriptName === "sonarqube") return true;
  return Boolean(scripts[scriptName]);
}

function hasWorkflowEvidence(toolId, scriptName) {
  const needles = workflowEvidenceByTool[toolId] || [];
  if (needles.some((needle) => workflowText.includes(String(needle).toLowerCase()))) {
    return true;
  }
  if (!scriptName) return false;
  return workflowText.includes(("pnpm run " + scriptName).toLowerCase()) ||
    workflowText.includes(String(scriptName).toLowerCase());
}

for (const entry of catalog.entries || []) {
  if (!entry || !entry.id) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: "MALFORMED_ENTRY: missing id"
    });
    continue;
  }

  const expected = baseline[entry.id];
  if (!expected) {
    violations.push({
      file: "tools/toolchain/tool-activation-baseline.json",
      line: 0,
      message: "UNMAPPED_BASELINE: Baseline does not define activation for tool '" + entry.id + "'"
    });
    continue;
  }

  if (entry.activation !== expected) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: "ACTIVATION_MISMATCH: Tool '" + entry.id + "' has activation '" + entry.activation + "' but baseline requires '" + expected + "'"
    });
  }

  const scriptName = entry.package_script || entry.fulfilled_by || scriptByTool[entry.id] || "";
  const isMandatory = expected === "active";

  if (isMandatory) {
    const scriptFound = hasPackageScript(scriptName);
    const ciFound = hasWorkflowEvidence(entry.id, scriptName);

    if (!scriptFound && !ciFound) {
      violations.push({
        file: "package.json",
        line: 0,
        message: "MISSING_PACKAGE_SCRIPT: Active tool '" + entry.id + "' has no package script or recognized action evidence."
      });
    }

    if (!ciFound) {
      violations.push({
        file: ".github/workflows",
        line: 0,
        message: "CI_INTEGRATION_MISSING: Active tool '" + entry.id + "' has no recognized GitHub Actions evidence."
      });
    }
  }

  if (expected === "partial" && scriptName.startsWith("guard:") && !scripts[scriptName]) {
    violations.push({
      file: "package.json",
      line: 0,
      message: "PARTIAL_SCRIPT_MISSING: Partial tool '" + entry.id + "' references missing script '" + scriptName + "'."
    });
  }
}

// Workflow script references must exist in package.json.
const workflowScriptRegex = /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?([A-Za-z0-9:_-]+)\b/g;
let match;
while ((match = workflowScriptRegex.exec(workflowText)) !== null) {
  const scriptName = match[1];
  if (scriptName.includes(":") && !scripts[scriptName]) {
    violations.push({
      file: ".github/workflows",
      line: 0,
      message: "WORKFLOW_SCRIPT_MISSING_IN_PACKAGE: " + scriptName
    });
  }
}

// This gate is read-only. It must not create evidence directories or require generated diagnostics.
fail(guardId, violations);
