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
for (const forbidden of ["localhost:9000", "SONAR_HOST_URL"]) {
  if (sonarWorkflow.includes(forbidden)) fail(`SonarQube workflow contains forbidden self-hosted dependency: ${forbidden}`);
}
if (!sonarWorkflow.includes("SonarQube Cloud")) fail("SonarQube workflow is not explicitly cloud-owned");

const codeqlWorkflow = read(".github/workflows/codeql.yml");
if (!codeqlWorkflow.includes("github/codeql-action/init@")) fail("CodeQL must run through GitHub code scanning on hosted CI");
if (!codeqlWorkflow.includes("github/codeql-action/analyze@")) fail("CodeQL analysis action is missing");

const remoteSecurityWorkflow = read(".github/workflows/security-remote.yml");
for (const required of ["gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "runs-on: ubuntu-24.04"]) {
  if (!remoteSecurityWorkflow.includes(required)) fail(`remote security workflow is missing: ${required}`);
}

const codeqlHygiene = read(".github/workflows/codeql-hygiene.yml");
for (const required of [
  'workflows: ["CodeQL"]',
  "security-events: write",
  "codeql-hygiene.mjs",
  "github.event.workflow_run.head_sha",
  "branches/master",
]) {
  if (!codeqlHygiene.includes(required)) fail(`CodeQL metadata hygiene is missing invariant: ${required}`);
}
for (const forbidden of [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "sonar-scanner",
]) {
  if (codeqlHygiene.includes(forbidden)) fail(`CodeQL metadata hygiene must not become a scanner authority: ${forbidden}`);
}

const remoteEvidence = read(".github/workflows/remote-analysis-evidence.yml");
for (const required of [
  "collect-remote-analysis-evidence.mjs",
  "Remote Analysis Evidence",
  "statuses: write",
  "workflow_run:",
]) {
  if (!remoteEvidence.includes(required)) fail(`remote analysis evidence is missing read-back invariant: ${required}`);
}
for (const forbidden of [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "sonar-scanner",
]) {
  if (remoteEvidence.includes(forbidden)) fail(`remote analysis evidence must remain read-back only: ${forbidden}`);
}

const remoteCommand = read(".github/workflows/remote-command.yml");
for (const required of [
  "issues:",
  "actions: write",
  "expected_sha",
  "git check-ref-format --branch",
  "unsupported remote command",
  "actions/workflows/${WORKFLOW}/dispatches",
]) {
  if (!remoteCommand.includes(required)) fail(`remote command ingress is missing safety invariant: ${required}`);
}
for (const forbidden of [
  "github/codeql-action/init@",
  "github/codeql-action/analyze@",
  "gitleaks detect",
  "run-osv-scanner.mjs",
  "run-trivy.mjs",
  "sonar-scanner",
  "Invoke-Expression",
]) {
  if (remoteCommand.includes(forbidden)) fail(`remote command ingress must dispatch authorities, not execute them: ${forbidden}`);
}

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] Hosted SonarQube, GitHub CodeQL, GitHub-hosted security scans, read-only evidence, metadata hygiene, and SHA-pinned remote dispatch remain separated canonical responsibilities.");
