import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "toolchain-activation-gate";
const violations = [];

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) {
    violations.push({ file: rel, line: 0, message: "MISSING_REQUIRED_FILE" });
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    violations.push({ file: rel, line: 0, message: `INVALID_JSON ${error.message}` });
    return fallback;
  }
}

function readText(rel) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) {
    violations.push({ file: rel, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function readWorkflowText() {
  const dir = path.join(repoRoot, ".github/workflows");
  if (!fs.existsSync(dir)) return "";
  return fs.readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .map((name) => fs.readFileSync(path.join(dir, name), "utf8"))
    .join("\n");
}

const catalogRelative = "tools/toolchain/tool-catalog.v5.json";
const baselineRelative = "tools/toolchain/tool-activation-baseline.json";
const installerRelative = "tools/scripts/install-oss-toolchain-binaries.sh";
const registryRelative = "governance/guards/guard-registry.json";
const packageRelative = "package.json";

const catalog = readJson(catalogRelative, { entries: [] });
const baseline = readJson(baselineRelative, { baseline: {} }).baseline ?? {};
const guardRegistry = readJson(registryRelative, { entries: [] });
const packageJson = readJson(packageRelative, { scripts: {} });
const scripts = packageJson.scripts ?? {};
const workflowText = readWorkflowText().toLowerCase();
const installer = readText(installerRelative);
const guardByScript = new Map((guardRegistry.entries ?? []).filter((entry) => entry.script).map((entry) => [entry.script, entry]));

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
  pinact: "guard:actions-pin",
  nx: "nx:projects",
  opa: "guard:opa-policies",
  ajv: "guard:governance-schema",
  regal: "guard:rego-lint",
  shellcheck: "guard:shellcheck",
  hadolint: "guard:dockerfile-lint",
  yamllint: "guard:yaml-lint",
  "ls-lint": "guard:ls-lint",
  playwright: "e2e:web:smoke",
  axe: "guard:a11y-runtime",
  storybook: "diagnostics:storybook",
};

const workflowEvidenceByTool = {
  codeql: ["github/codeql-action"],
  sonarqube: ["sonarqube", "sonar-scanner"],
  gitleaks: ["gitleaks", "guard:secrets"],
  trivy: ["aquasecurity/trivy-action", "security:trivy", "trivy"],
  "osv-scanner": ["osv-scanner", "security:osv"],
  conftest: ["guard:opa-policies", "conftest"],
  actionlint: ["guard:workflow-lint", "actionlint"],
  zizmor: ["guard:workflow-security", "zizmor"],
  pinact: ["guard:actions-pin", "pinact"],
  nx: ["nx:projects", "nx affected", "nx run-many"],
};

const expectedFailureByActivation = {
  active: "fail",
  partial: "warn",
  optional: "manual",
};

function hasPackageScript(scriptName) {
  if (!scriptName) return false;
  if (["github/codeql-action", "sonarqube"].includes(scriptName)) return true;
  return Boolean(scripts[scriptName]);
}

function hasWorkflowEvidence(toolId, scriptName) {
  const needles = workflowEvidenceByTool[toolId] ?? [];
  if (needles.some((needle) => workflowText.includes(String(needle).toLowerCase()))) return true;
  if (!scriptName) return false;
  return workflowText.includes(`pnpm run ${scriptName}`.toLowerCase()) || workflowText.includes(String(scriptName).toLowerCase());
}

for (const entry of catalog.entries ?? []) {
  if (!entry?.id) {
    violations.push({ file: catalogRelative, line: 0, message: "MALFORMED_ENTRY_MISSING_ID" });
    continue;
  }

  const expectedActivation = baseline[entry.id];
  if (!expectedActivation) {
    violations.push({ file: baselineRelative, line: 0, message: `UNMAPPED_BASELINE ${entry.id}` });
    continue;
  }
  if (entry.activation !== expectedActivation) {
    violations.push({ file: catalogRelative, line: 0, message: `ACTIVATION_MISMATCH ${entry.id}: catalog=${entry.activation} baseline=${expectedActivation}` });
  }

  const expectedFailure = expectedFailureByActivation[expectedActivation];
  if (expectedFailure && entry.failure_policy !== expectedFailure) {
    violations.push({ file: catalogRelative, line: 0, message: `FAILURE_POLICY_MISMATCH ${entry.id}: activation=${expectedActivation} failure=${entry.failure_policy}` });
  }

  const scriptName = entry.package_script || entry.fulfilled_by || scriptByTool[entry.id] || "";
  if (["active", "partial"].includes(expectedActivation) && scriptName.startsWith("guard:") && !scripts[scriptName]) {
    violations.push({ file: packageRelative, line: 0, message: `TOOL_GUARD_SCRIPT_MISSING ${entry.id} -> ${scriptName}` });
  }

  if (expectedActivation === "active") {
    if (!hasPackageScript(scriptName)) violations.push({ file: packageRelative, line: 0, message: `ACTIVE_TOOL_PACKAGE_INTEGRATION_MISSING ${entry.id}` });
    if (!hasWorkflowEvidence(entry.id, scriptName)) violations.push({ file: ".github/workflows", line: 0, message: `ACTIVE_TOOL_CI_INTEGRATION_MISSING ${entry.id}` });
  }

  const registeredGuard = guardByScript.get(scriptName);
  if (registeredGuard && expectedActivation === "active" && registeredGuard.exit_level !== "fail") {
    violations.push({ file: registryRelative, line: 0, message: `ACTIVE_TOOL_GUARD_MUST_FAIL ${entry.id} -> ${scriptName}` });
  }
  if (registeredGuard && expectedActivation === "partial" && registeredGuard.exit_level === "fail" && !["axe", "playwright"].includes(entry.id)) {
    violations.push({ file: registryRelative, line: 0, message: `PARTIAL_TOOL_GUARD_LEVEL_DRIFT ${entry.id} -> ${scriptName}` });
  }
}

for (const toolId of Object.keys(baseline)) {
  if (!(catalog.entries ?? []).some((entry) => entry.id === toolId)) {
    violations.push({ file: catalogRelative, line: 0, message: `BASELINE_TOOL_NOT_IN_CATALOG ${toolId}` });
  }
}

if (/@latest\b/.test(installer)) {
  violations.push({ file: installerRelative, line: 0, message: "FLOATING_GO_INSTALL_VERSION_FORBIDDEN" });
}
for (const match of installer.matchAll(/python3\s+-m\s+pip\s+install\s+--user\s+"?([A-Za-z0-9_.-]+)([^"\s]*)"?/g)) {
  const specification = `${match[1]}${match[2]}`;
  if (!specification.includes("==")) violations.push({ file: installerRelative, line: 0, message: `UNPINNED_PYTHON_TOOL_INSTALL ${specification}` });
}
for (const marker of [
  'ACTIONLINT_VERSION="v1.7.12"',
  'PINACT_VERSION="v0.1.2"',
  'ZIZMOR_VERSION="1.27.0"',
  'actionlint@${ACTIONLINT_VERSION}',
  'pinact@${PINACT_VERSION}',
  'zizmor==${ZIZMOR_VERSION}',
]) {
  if (!installer.includes(marker)) violations.push({ file: installerRelative, line: 0, message: `LOCKED_INSTALLER_MARKER_MISSING ${marker}` });
}

const workflowScriptRegex = /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?([A-Za-z0-9:_-]+)\b/g;
let match;
while ((match = workflowScriptRegex.exec(workflowText)) !== null) {
  const scriptName = match[1];
  if (scriptName.includes(":") && !scripts[scriptName]) violations.push({ file: ".github/workflows", line: 0, message: `WORKFLOW_SCRIPT_MISSING_IN_PACKAGE ${scriptName}` });
}

fail(guardId, violations);
