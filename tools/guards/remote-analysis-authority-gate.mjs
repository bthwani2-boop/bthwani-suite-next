import fs from "node:fs";

const fail = (message) => {
  console.error(`[REMOTE_ANALYSIS_AUTHORITY FAIL] ${message}`);
  process.exit(1);
};
const read = (path) => {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
  return fs.readFileSync(path, "utf8");
};
const mustContain = (text, values, owner) => {
  for (const value of values) if (!text.includes(value)) fail(`${owner} is missing invariant: ${value}`);
};
const mustNotContain = (text, values, owner) => {
  for (const value of values) if (text.includes(value)) fail(`${owner} contains forbidden authority: ${value}`);
};

const expectedUrl = "https://api.sonarcloud.io/mcp";
const expectedOrg = "bthwani2-boop";
const tokenReference = "Bearer ${SONARQUBE_TOKEN}";

const antigravity = JSON.parse(read(".agents/mcp_config.json"));
const antigravitySonar = antigravity?.mcpServers?.sonarqube;
if (!antigravitySonar) fail("Antigravity SonarQube MCP definition is missing");
if (antigravitySonar.serverUrl !== expectedUrl) fail("Antigravity must use SonarQube Cloud hosted MCP");
if ("command" in antigravitySonar || "args" in antigravitySonar) fail("Antigravity must not launch local SonarQube MCP");
if (antigravitySonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("Antigravity Sonar organization drift");
if (antigravitySonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("Antigravity Sonar MCP must be read-only");
if (antigravitySonar.headers?.Authorization !== tokenReference) fail("Antigravity token must remain environment-owned");

const projectMcp = JSON.parse(read(".mcp.json"));
const projectSonar = projectMcp?.mcpServers?.sonarqube;
if (!projectSonar || projectSonar.type !== "http" || projectSonar.url !== expectedUrl) fail("project MCP must use SonarQube Cloud HTTP transport");
if ("command" in projectSonar || "args" in projectSonar || "serverUrl" in projectSonar) fail("project MCP must not launch local SonarQube MCP");
if (projectSonar.headers?.SONARQUBE_ORG !== expectedOrg || projectSonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("project SonarQube MCP headers drift");
if (projectSonar.headers?.Authorization !== tokenReference) fail("project Sonar token must remain environment-owned");

const codex = read(".codex/config.toml");
mustNotContain(codex, ["sonar.exe", "mcp/sonarqube", "sonarsource/sonarqube-mcp", "localhost:9000", 'command = "sonar"'], "Codex Sonar config");
mustContain(codex, [`url = "${expectedUrl}"`, 'bearer_token_env_var = "SONARQUBE_TOKEN"', `"SONARQUBE_ORG" = "${expectedOrg}"`, '"SONARQUBE_READ_ONLY" = "true"'], "Codex Sonar config");

for (const path of [
  ".agents/hooks.json",
  ".agents/rules/sonar-prompt-secrets.md",
  ".agents/sonar/hooks/pretool-secrets.ps1",
  ".codex/hooks.json",
  ".codex/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/pretool-secrets.ps1",
]) if (fs.existsSync(path)) fail(`local Sonar hook path must not exist: ${path}`);

const ci = read(".github/workflows/ci.yml");
mustContain(ci, [
  "Resolve canonical branch/PR identity",
  "target_kind",
  "pr_number",
  "expected_head_sha",
  "expected_base_sha",
  "PR_IDENTITY_CONFLICT",
], "contextual CI control plane");
const closureEvidence = read(".github/workflows/pr-closure-evidence.yml");
mustContain(closureEvidence, [
  "name: BThwani PR Closure Evidence",
  "name: BThwani / PR Closure Evidence",
  "statuses: write",
  "BThwani / PR Closure Evidence",
  "Publish canonical closure status",
  "BTHWANI_SEMANTIC_REVIEW:v1",
], "PR closure evidence workflow");
const closureDispatch = read(".github/workflows/pr-closure-dispatch.yml");
mustContain(closureDispatch, [
  "name: BThwani PR Closure Dispatch",
  "bthwani:closure-request",
  "actions: write",
  "Dispatch unprivileged full CI from the trusted default definition",
], "PR closure dispatch workflow");
mustNotContain(ci, ["branches: [\"c\"]", "GITHUB_REF_NAME == \"c\"", "refs/heads/c"], "contextual CI control plane");

const sonarWorkflow = read(".github/workflows/sonarqube.yml");
mustContain(sonarWorkflow, ["SonarQube Cloud", "SonarSource/sonarqube-scan-action@"], "SonarQube workflow");
mustNotContain(sonarWorkflow, ["localhost:9000", "sonar-scanner"], "SonarQube workflow");

const codeqlWorkflow = read(".github/workflows/codeql.yml");
mustContain(codeqlWorkflow, ["github/codeql-action/init@", "github/codeql-action/analyze@"], "CodeQL workflow");

const semgrep = read(".github/workflows/semgrep.yml");
mustContain(semgrep, [
  "classify-semgrep-evidence.mjs",
  "classifiedEngineErrors",
  "totalFindings",
  "engineConditions",
  "toolLimitationsProven",
  "unknownEngineErrors",
  "Semgrep findings require diagnosis/disposition before closure",
], "Semgrep workflow");
const semgrepNormalizer = read("tools/scripts/classify-semgrep-evidence.mjs");
mustContain(semgrepNormalizer, [
  "allRawFindingsAccounted",
  "classifiedEngineErrors",
  "TOOL_LIMITATION_PROVEN",
  "UNKNOWN_ENGINE_ERROR",
  "raw",
], "Semgrep evidence normalizer");

for (const path of [".github/workflows/docker-runtime-hardening.yml", ".github/workflows/lockfile-integrity.yml"]) {
  const text = read(path);
  mustContain(text, ["github.event.pull_request.head.sha || github.sha", "Verify exact candidate checkout"], path);
}

const remoteSecurityWorkflow = read(".github/workflows/security-remote.yml");
mustContain(remoteSecurityWorkflow, ["gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "runs-on: ubuntu-24.04"], "remote security workflow");

const codeqlHygiene = read(".github/workflows/codeql-hygiene.yml");
mustContain(codeqlHygiene, ['workflows: ["CodeQL"]', "security-events: write", "github.event.repository.default_branch", "/code-scanning/analyses", "confirm_delete=true"], "CodeQL metadata hygiene");
mustNotContain(codeqlHygiene, ["branches/master", "refs/heads/master", "/branches/master", "actions/checkout@", "github/codeql-action/init@", "github/codeql-action/analyze@", "sonar-scanner"], "CodeQL metadata hygiene");

const remoteEvidence = read(".github/workflows/remote-analysis-evidence.yml");
mustContain(remoteEvidence, ["collect-remote-analysis-evidence.mjs", "Remote Analysis Evidence", "statuses: write", "workflow_run:", "cancel-in-progress: false"], "default-branch remote evidence");
mustNotContain(remoteEvidence, ["github/codeql-action/init@", "github/codeql-action/analyze@", "gitleaks detect", "sonar-scanner"], "default-branch remote evidence");

const remoteCommand = read(".github/workflows/remote-command.yml");
mustContain(remoteCommand, [
  ".schema_version==2",
  "request_id",
  "target_kind",
  "pr_number",
  "expected_head_sha",
  "expected_base_sha",
  "actions/workflows/${WORKFLOW}/dispatches",
], "remote command ingress");
mustNotContain(remoteCommand, ["schema_version == 1", "pr-closure", "Invoke-Expression", "github/codeql-action/init@", "sonar-scanner"], "remote command ingress");

const ocr = read(".github/workflows/open-code-review.yml");
mustContain(ocr, ["hostAgentRequired: true", "hostAgentExecutedByThisWorkflow: false", "semanticReviewClaimedByThisWorkflow: false"], "OpenCodeReview delegation");

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] Branch-agnostic PR identity, exact-head closure evidence, hosted scanners, total Semgrep accounting with proven tool limitations, API-only metadata hygiene, baseline read-back and schema-v2 remote dispatch remain separated canonical responsibilities.");
