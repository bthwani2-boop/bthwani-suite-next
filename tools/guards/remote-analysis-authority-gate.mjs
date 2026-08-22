import fs from "node:fs";

const fail = (message) => {
  console.error(`[REMOTE_ANALYSIS_AUTHORITY FAIL] ${message}`);
  process.exit(1);
};

const read = (path) => {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
  return fs.readFileSync(path, "utf8");
};

const expectedUrl = "https://api.sonarcloud.io/mcp";
const expectedOrg = "bthwani2-boop";
const tokenReference = "Bearer ${SONARQUBE_TOKEN}";

const antigravity = JSON.parse(read(".agents/mcp_config.json"));
const antigravitySonar = antigravity?.mcpServers?.sonarqube;
if (!antigravitySonar) fail("Antigravity SonarQube MCP definition is missing");
if (antigravitySonar.serverUrl !== expectedUrl) fail("Antigravity must use the SonarQube Cloud-hosted MCP endpoint");
if ("command" in antigravitySonar || "args" in antigravitySonar) fail("Antigravity must not launch a local SonarQube MCP process");
if (antigravitySonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("Antigravity SonarQube organization is not pinned");
if (antigravitySonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("Antigravity SonarQube MCP must remain read-only");
if (antigravitySonar.headers?.Authorization !== tokenReference) fail("Antigravity token must remain an environment reference, never a committed credential");

const projectMcp = JSON.parse(read(".mcp.json"));
const projectSonar = projectMcp?.mcpServers?.sonarqube;
if (!projectSonar) fail("project SonarQube MCP definition is missing");
if (projectSonar.type !== "http" || projectSonar.url !== expectedUrl) fail("project MCP config must use hosted SonarQube HTTP transport");
if ("command" in projectSonar || "args" in projectSonar || "serverUrl" in projectSonar) fail("project MCP config must not launch or emulate a local SonarQube MCP process");
if (projectSonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("project SonarQube organization is not pinned");
if (projectSonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("project SonarQube MCP must remain read-only");
if (projectSonar.headers?.Authorization !== tokenReference) fail("project token must remain an environment reference, never a committed credential");

const codex = read(".codex/config.toml");
for (const forbidden of ["sonar.exe", "mcp/sonarqube", "sonarsource/sonarqube-mcp", "localhost:9000", "command = \"sonar"]) {
  if (codex.includes(forbidden)) fail(`Codex config contains forbidden local SonarQube reference: ${forbidden}`);
}
if (!codex.includes(`url = "${expectedUrl}"`)) fail("Codex must use the SonarQube Cloud-hosted MCP endpoint");
if (!codex.includes('bearer_token_env_var = "SONARQUBE_TOKEN"')) fail("Codex must source the SonarQube bearer token from the environment");
if (!codex.includes(`"SONARQUBE_ORG" = "${expectedOrg}"`)) fail("Codex SonarQube organization is not pinned");
if (!codex.includes('"SONARQUBE_READ_ONLY" = "true"')) fail("Codex SonarQube MCP must remain read-only");

const forbiddenLocalSonarPaths = [
  ".agents/hooks.json",
  ".agents/rules/sonar-prompt-secrets.md",
  ".agents/sonar/hooks/pretool-secrets.ps1",
  ".codex/hooks.json",
  ".codex/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/pretool-secrets.ps1",
];
for (const path of forbiddenLocalSonarPaths) {
  if (fs.existsSync(path)) fail(`local Sonar hook path must not exist: ${path}`);
}

const agents = read("AGENTS.md");
for (const forbidden of ["sonar analyze secrets", "sonar hook ", "Get-Command sonar"]) {
  if (agents.includes(forbidden)) fail(`AGENTS.md contains forbidden local Sonar instruction: ${forbidden}`);
}

const claude = read(".claude/settings.json");
if (claude.includes("sonar-secrets") || claude.includes("PreToolUse") || claude.includes("UserPromptSubmit")) {
  fail("Claude settings must not invoke local Sonar hooks");
}

const sonarWorkflow = read(".github/workflows/sonarqube.yml");
for (const forbidden of ["localhost:9000", "SONAR_HOST_URL", "self-hosted"]) {
  if (sonarWorkflow.includes(forbidden)) fail(`SonarQube workflow contains forbidden local/self-hosted dependency: ${forbidden}`);
}
if (!sonarWorkflow.includes("SonarQube Cloud")) fail("SonarQube workflow is not explicitly cloud-owned");

const codeqlWorkflow = read(".github/workflows/codeql.yml");
if (!codeqlWorkflow.includes("github/codeql-action/init@")) fail("CodeQL must run through GitHub code scanning on hosted CI");
if (!codeqlWorkflow.includes("github/codeql-action/analyze@")) fail("CodeQL analysis action is missing");
if (!codeqlWorkflow.includes("runs-on: ubuntu-24.04")) fail("CodeQL must execute on GitHub-hosted runners");

const installer = read("tools/scripts/install-oss-toolchain-binaries.sh");
for (const required of [
  'GITHUB_ACTIONS:-',
  'SEMGREP_VERSION="1.172.0"',
  'semgrep==${SEMGREP_VERSION}',
  'MODE="${1:-governance}"',
  'SELECTED_TOOL="${2:-all}"',
]) {
  if (!installer.includes(required)) fail(`remote tool installer is missing invariant: ${required}`);
}

const remoteSecurityWorkflow = read(".github/workflows/security-remote.yml");
for (const required of [
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "run-actionlint.mjs",
  "run-zizmor.mjs",
  "run-shellcheck.mjs",
  "run-hadolint.mjs",
  "run-yamllint.mjs",
  "semgrep scan",
  "Semgrep Code Remote",
  "github/codeql-action/upload-sarif@",
  "remote-security-oss-${{ github.sha }}",
  "semgrep-code-remote-${{ github.sha }}",
  "profile:",
  "tool:",
  "runs-on: ubuntu-24.04",
]) {
  if (!remoteSecurityWorkflow.includes(required)) fail(`remote security workflow is missing: ${required}`);
}
for (const forbidden of ["runs-on: self-hosted", "semgrep/semgrep:latest", "pip install semgrep", "localhost:"]) {
  if (remoteSecurityWorkflow.includes(forbidden)) fail(`remote security workflow contains forbidden non-canonical execution: ${forbidden}`);
}

const openCodeReviewWorkflow = read(".github/workflows/opencodereview.yml");
for (const required of [
  "name: OpenCodeReview",
  "workflow_dispatch:",
  "pull_request:",
  "push:",
  "runs-on: ubuntu-24.04",
  "models: read",
  'OCR_VERSION: "1.9.5"',
  'OCR_MODEL: "openai/gpt-5"',
  'OCR_LLM_URL: "https://models.github.ai/inference/chat/completions"',
  "OCR_LLM_TOKEN: ${{ github.token }}",
  "@alibaba-group/open-code-review@${OCR_VERSION}",
  "--rule .opencodereview/rule.json",
  "evaluate-opencodereview.mjs",
  "opencodereview-${{ needs.scope.outputs.head_sha }}",
  "expected_sha",
]) {
  if (!openCodeReviewWorkflow.includes(required)) fail(`OpenCodeReview remote workflow is missing invariant: ${required}`);
}
for (const forbidden of ["runs-on: self-hosted", "localhost:", "127.0.0.1", "ollama", "@latest", "OCR_LLM_TOKEN: ${{ secrets."]) {
  if (openCodeReviewWorkflow.includes(forbidden)) fail(`OpenCodeReview must remain hosted and deterministic: ${forbidden}`);
}

const openCodeReviewPolicy = read(".agents/tools/open-code-review.md");
for (const required of [
  "MUST NOT install or execute `ocr` locally",
  "[remote-command]",
  '"schema_version": 2',
  '"command": "opencodereview-full"',
  '"command": "opencodereview-diff"',
]) {
  if (!openCodeReviewPolicy.includes(required)) fail(`OpenCodeReview agent policy is missing remote-only invariant: ${required}`);
}

const dependencyReview = read(".github/workflows/dependency-review.yml");
for (const required of ["workflow_dispatch:", "base_ref:", "head_ref:", "expected_sha:", "base-ref:", "head-ref:"]) {
  if (!dependencyReview.includes(required)) fail(`Dependency Review is missing remote-dispatch invariant: ${required}`);
}

const codeqlHygiene = read(".github/workflows/codeql-hygiene.yml");
for (const required of [
  'workflows: ["CodeQL"]',
  "security-events: write",
  "github.event.workflow_run.head_sha",
  "github.event.repository.default_branch",
  "/code-scanning/analyses",
  "confirm_delete=true",
  "/code-scanning/alerts",
  "Verify canonical CodeQL workflow metadata without checkout",
]) {
  if (!codeqlHygiene.includes(required)) fail(`CodeQL metadata hygiene is missing invariant: ${required}`);
}
for (const forbidden of ["branches/master", "refs/heads/master", "/branches/master"]) {
  if (codeqlHygiene.includes(forbidden)) fail(`CodeQL metadata hygiene must not hard-code the default branch: ${forbidden}`);
}
for (const forbidden of [
  "actions/checkout@",
  "node tools/",
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "semgrep scan",
  "ocr review",
  "sonar-scanner",
]) {
  if (codeqlHygiene.includes(forbidden)) fail(`CodeQL metadata hygiene must remain API-only and must not become an execution/scanner authority: ${forbidden}`);
}
if (fs.existsSync("tools/scripts/codeql-hygiene.mjs")) {
  fail("CodeQL metadata hygiene must not execute a repository-owned privileged helper script");
}

const collector = read("tools/scripts/collect-remote-analysis-evidence.mjs");
for (const required of [
  "schemaVersion: 3",
  'name: "OpenCodeReview"',
  "collectSemgrep",
  "workflowArtifacts",
  "semgrep_material_open_alerts",
  '"Dependency Review"',
  '"BThwani Lockfile Integrity"',
]) {
  if (!collector.includes(required)) fail(`remote evidence collector is missing invariant: ${required}`);
}

const remoteEvidence = read(".github/workflows/remote-analysis-evidence.yml");
for (const required of [
  "collect-remote-analysis-evidence.mjs",
  "Remote Analysis Evidence",
  "statuses: write",
  "workflow_run:",
  "cancel-in-progress: false",
  "Canonical remote analysis evidence complete and policy passed",
]) {
  if (!remoteEvidence.includes(required)) fail(`remote analysis evidence is missing read-back invariant: ${required}`);
}
for (const forbidden of [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "semgrep scan",
  "ocr review",
  "ocr scan",
  "sonar-scanner",
]) {
  if (remoteEvidence.includes(forbidden)) fail(`remote analysis evidence must remain read-back only: ${forbidden}`);
}

const remoteCommand = read(".github/workflows/remote-command.yml");
for (const required of [
  "issues:",
  "actions: write",
  "schema_version",
  "schema_version must equal 2",
  "expected_sha",
  "git check-ref-format --branch",
  "unsupported remote command",
  "security-tool",
  "semgrep-full",
  "opencodereview-full",
  "opencodereview-diff",
  "dependency-review",
  "/actions/workflows/${workflow}/dispatches",
]) {
  if (!remoteCommand.includes(required)) fail(`remote command ingress is missing safety/routing invariant: ${required}`);
}
for (const forbidden of [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "semgrep scan",
  "ocr review",
  "ocr scan",
  "sonar-scanner",
  "Invoke-Expression",
]) {
  if (remoteCommand.includes(forbidden)) fail(`remote command ingress must dispatch authorities, not execute them: ${forbidden}`);
}

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] Hosted SonarQube, GitHub CodeQL, GitHub-hosted Remote Security including Semgrep, GitHub-hosted OpenCodeReview, Dependency Review, metadata hygiene, exact-SHA evidence, and SHA-pinned remote dispatch remain separated canonical responsibilities with no local scanner authority.");
