import fs from "node:fs";

const fail = (message) => {
  console.error(`[REMOTE_ANALYSIS_AUTHORITY FAIL] ${message}`);
  process.exit(1);
};
const read = (path) => {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
  return fs.readFileSync(path, "utf8");
};
const requireAll = (label, text, values) => {
  for (const value of values) if (!text.includes(value)) fail(`${label} is missing invariant: ${value}`);
};
const forbidAll = (label, text, values) => {
  for (const value of values) if (text.includes(value)) fail(`${label} contains forbidden authority/execution path: ${value}`);
};

// Hosted Sonar read/control surfaces: IDEs/agents may query Cloud, never host Sonar locally.
const expectedSonarUrl = "https://api.sonarcloud.io/mcp";
const expectedOrg = "bthwani2-boop";
const tokenReference = "Bearer ${SONARQUBE_TOKEN}";

const antigravity = JSON.parse(read(".agents/mcp_config.json"));
const antigravitySonar = antigravity?.mcpServers?.sonarqube;
if (!antigravitySonar) fail("Antigravity SonarQube MCP definition is missing");
if (antigravitySonar.serverUrl !== expectedSonarUrl) fail("Antigravity must use the SonarQube Cloud-hosted MCP endpoint");
if ("command" in antigravitySonar || "args" in antigravitySonar) fail("Antigravity must not launch a local SonarQube MCP process");
if (antigravitySonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("Antigravity SonarQube organization is not pinned");
if (antigravitySonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("Antigravity SonarQube MCP must remain read-only");
if (antigravitySonar.headers?.Authorization !== tokenReference) fail("Antigravity token must remain an environment reference");

const projectMcp = JSON.parse(read(".mcp.json"));
const projectSonar = projectMcp?.mcpServers?.sonarqube;
if (!projectSonar) fail("project SonarQube MCP definition is missing");
if (projectSonar.type !== "http" || projectSonar.url !== expectedSonarUrl) fail("project MCP config must use hosted SonarQube HTTP transport");
if ("command" in projectSonar || "args" in projectSonar || "serverUrl" in projectSonar) fail("project MCP config must not launch/emulate local SonarQube MCP");
if (projectSonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("project SonarQube organization is not pinned");
if (projectSonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("project SonarQube MCP must remain read-only");
if (projectSonar.headers?.Authorization !== tokenReference) fail("project SonarQube token must remain an environment reference");

const codex = read(".codex/config.toml");
forbidAll("Codex config", codex, ["sonar.exe", "mcp/sonarqube", "sonarsource/sonarqube-mcp", "localhost:9000", 'command = "sonar"']);
requireAll("Codex config", codex, [
  `url = "${expectedSonarUrl}"`,
  'bearer_token_env_var = "SONARQUBE_TOKEN"',
  `"SONARQUBE_ORG" = "${expectedOrg}"`,
  '"SONARQUBE_READ_ONLY" = "true"',
]);

for (const path of [
  ".agents/hooks.json",
  ".agents/rules/sonar-prompt-secrets.md",
  ".agents/sonar/hooks/pretool-secrets.ps1",
  ".codex/hooks.json",
  ".codex/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/pretool-secrets.ps1",
]) {
  if (fs.existsSync(path)) fail(`local Sonar hook path must not exist: ${path}`);
}

const sonarWorkflow = read(".github/workflows/sonarqube.yml");
requireAll("SonarQube workflow", sonarWorkflow, ["SonarQube Cloud", "runs-on: ubuntu-24.04", "workflow_dispatch:"]);
forbidAll("SonarQube workflow", sonarWorkflow, ["localhost:9000"]);

const codeqlWorkflow = read(".github/workflows/codeql.yml");
requireAll("CodeQL workflow", codeqlWorkflow, [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "runs-on: ubuntu-24.04",
  "workflow_dispatch:",
  "security-extended",
]);

const semgrepWorkflow = read(".github/workflows/semgrep.yml");
requireAll("Semgrep workflow", semgrepWorkflow, [
  "name: Semgrep Code Remote",
  "pull_request:",
  "push:",
  "workflow_dispatch:",
  "runs-on: ubuntu-24.04",
  "semgrep==1.168.0",
  "p/default",
  "p/security-audit",
  "semgrep-evidence-",
  "--baseline-commit",
]);
forbidAll("Semgrep workflow", semgrepWorkflow, ["runs-on: self-hosted", "localhost:", "semgrep ci --supply-chain", "semgrep secrets"]);

const ocrWorkflow = read(".github/workflows/open-code-review.yml");
requireAll("OpenCodeReview workflow", ocrWorkflow, [
  "name: OpenCodeReview",
  "pull_request:",
  "workflow_dispatch:",
  "runs-on: ubuntu-24.04",
  "models: read",
  "@alibaba-group/open-code-review@1.9.9",
  "https://models.github.ai/inference/chat/completions",
  'git show "${base}:.opencodereview/rule.json"',
  "ocr review",
  "opencodereview-evidence-",
]);
forbidAll("OpenCodeReview workflow", ocrWorkflow, ["runs-on: self-hosted", "localhost:"]);

const remoteSecurity = read(".github/workflows/security-remote.yml");
requireAll("Remote Security workflow", remoteSecurity, [
  "runs-on: ubuntu-24.04",
  "workflow_dispatch:",
  "tool:",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "run-actionlint.mjs",
  "run-zizmor.mjs",
  "run-pinact.mjs --verify",
  "run-shellcheck.mjs",
  "run-hadolint.mjs",
  "run-yamllint.mjs",
  "remote-security-evidence-",
]);

const dependencyReview = read(".github/workflows/dependency-review.yml");
requireAll("Dependency Review workflow", dependencyReview, [
  "pull_request:",
  "workflow_dispatch:",
  "base_ref:",
  "head_ref:",
  "actions/dependency-review-action@",
  "fail-on-severity: low",
]);

const lockfile = read(".github/workflows/lockfile-integrity.yml");
requireAll("Lockfile Integrity workflow", lockfile, [
  "workflow_dispatch:",
  "pnpm install --frozen-lockfile --ignore-scripts",
  "git diff --quiet --exit-code",
]);

const dependabotAudit = read(".github/workflows/dependabot-audit.yml");
requireAll("Dependabot audit workflow", dependabotAudit, [
  "workflow_dispatch:",
  "/dependabot/alerts?state=open",
  'dependabot[bot]',
  "dependabot-evidence-",
]);

const codeqlHygiene = read(".github/workflows/codeql-hygiene.yml");
requireAll("CodeQL Metadata Hygiene", codeqlHygiene, [
  'workflows: ["CodeQL"]',
  "workflow_dispatch:",
  "options: [audit, repair]",
  "security-events: write",
  "github.event.repository.default_branch",
  "/code-scanning/analyses",
  "confirm_delete=true",
  "Verify canonical CodeQL workflow metadata without checkout",
  "repair is restricted to the default branch",
  "codeql-hygiene-evidence-",
]);
forbidAll("CodeQL Metadata Hygiene", codeqlHygiene, [
  "actions/checkout@",
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "sonar-scanner",
  "semgrep scan",
  "ocr review",
]);

const remoteToolchain = read(".github/workflows/remote-toolchain.yml");
requireAll("Remote Toolchain", remoteToolchain, [
  "name: BThwani Remote Toolchain",
  "target_ref:",
  "target_sha:",
  "base_ref:",
  "ci-full",
  "codeql-full",
  "codeql-hygiene-audit",
  "sonar-full",
  "security-full",
  "dependency-review",
  "lockfile-integrity",
  "opencodereview",
  "semgrep-full",
  "dependabot-audit",
  "remote-analysis-evidence.yml",
  "Wait for conflicting branch run to settle",
]);
forbidAll("Remote Toolchain", remoteToolchain, [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "semgrep scan",
  "ocr review",
  "sonar-scanner",
]);

const remoteEvidence = read(".github/workflows/remote-analysis-evidence.yml");
requireAll("Remote Analysis Evidence", remoteEvidence, [
  "collect-remote-toolchain-evidence.mjs",
  "normalize-remote-toolchain-findings.mjs",
  "Remote Analysis Evidence",
  "statuses: write",
  "workflow_run:",
  "cancel-in-progress: false",
  "Checkout trusted collector from repository default branch",
  "gh run view",
  "gh run download",
  "raw-logs",
  "raw-artifacts",
  "remote-analysis-evidence-",
]);
forbidAll("Remote Analysis Evidence", remoteEvidence, [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "semgrep scan",
  "ocr review",
  "sonar-scanner",
]);

const remoteCommand = read(".github/workflows/remote-command.yml");
requireAll("Remote Command ingress", remoteCommand, [
  "issues:",
  "actions: write",
  "expected_sha",
  "git check-ref-format --branch",
  "unsupported remote command",
  "Wait for conflicting branch run to settle",
  "toolchain-full",
  "opencodereview",
  "semgrep-full",
  "dependabot-audit",
  "actions/workflows/${WORKFLOW}/dispatches",
]);
forbidAll("Remote Command ingress", remoteCommand, [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "semgrep scan",
  "ocr review",
  "sonar-scanner",
  "Invoke-Expression",
]);

const remoteClient = read("tools/scripts/request-remote-toolchain.ps1");
requireAll("Remote control client", remoteClient, [
  "[remote-command]",
  "expected_sha",
  "toolchain-full",
  "execution_authority=GITHUB_REMOTE_ONLY",
  "gh",
]);
forbidAll("Remote control client", remoteClient, [
  "semgrep scan",
  "semgrep ci",
  "gitleaks detect",
  "ocr review",
  "sonar-scanner",
  "codeql database",
  "docker run",
  "Invoke-Expression",
]);

const ocrClient = read("tools/scripts/invoke-open-code-review-toolchain.ps1");
requireAll("OpenCodeReview control client", ocrClient, [
  "GITHUB_REMOTE_ONLY",
  "local_ocr_installation=NOT_REQUIRED",
  "local_ocr_execution=FORBIDDEN_BY_PROJECT_CONTROL_PATH",
  'Command = "opencodereview"',
  "request-remote-toolchain.ps1",
]);
forbidAll("OpenCodeReview control client", ocrClient, [
  "npm install --global",
  "ocr review",
  "ocr delegate",
  "Get-Command ocr",
]);

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] SonarQube Cloud, CodeQL, Semgrep Code, OpenCodeReview, OSS security gates, dependency controls, metadata hygiene, unified remote dispatch, and exact-SHA evidence are remote-only separated authorities with IDE/agent control surfaces only.");
