import fs from "node:fs";

const fail = (message) => {
  console.error(`[REMOTE_ANALYSIS_AUTHORITY FAIL] ${message}`);
  process.exit(1);
};
const read = (file) => {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  return fs.readFileSync(file, "utf8");
};
const requireAll = (label, text, values) => {
  for (const value of values) if (!text.includes(value)) fail(`${label} is missing invariant: ${value}`);
};
const forbidAll = (label, text, values) => {
  for (const value of values) if (text.includes(value)) fail(`${label} contains forbidden local/parallel authority: ${value}`);
};

const sonarUrl = "https://api.sonarcloud.io/mcp";
const sonarOrg = "bthwani2-boop";
const tokenRef = "Bearer ${SONARQUBE_TOKEN}";

const antigravity = JSON.parse(read(".agents/mcp_config.json"))?.mcpServers?.sonarqube;
if (!antigravity) fail("Antigravity SonarQube MCP definition is missing");
if (antigravity.serverUrl !== sonarUrl) fail("Antigravity must use hosted SonarQube MCP");
if ("command" in antigravity || "args" in antigravity) fail("Antigravity must not launch local SonarQube MCP");
if (antigravity.headers?.SONARQUBE_ORG !== sonarOrg || antigravity.headers?.SONARQUBE_READ_ONLY !== "true") fail("Antigravity SonarQube MCP identity/read-only policy drifted");
if (antigravity.headers?.Authorization !== tokenRef) fail("Antigravity Sonar token must remain an environment reference");

const projectSonar = JSON.parse(read(".mcp.json"))?.mcpServers?.sonarqube;
if (!projectSonar || projectSonar.type !== "http" || projectSonar.url !== sonarUrl) fail("project MCP must use hosted SonarQube HTTP transport");
if ("command" in projectSonar || "args" in projectSonar || "serverUrl" in projectSonar) fail("project MCP must not launch local SonarQube");
if (projectSonar.headers?.SONARQUBE_ORG !== sonarOrg || projectSonar.headers?.SONARQUBE_READ_ONLY !== "true" || projectSonar.headers?.Authorization !== tokenRef) fail("project SonarQube hosted MCP policy drifted");

const codex = read(".codex/config.toml");
forbidAll("Codex config", codex, ["sonar.exe", "mcp/sonarqube", "sonarsource/sonarqube-mcp", "localhost:9000", 'command = "sonar']);
requireAll("Codex SonarQube", codex, [`url = "${sonarUrl}"`, 'bearer_token_env_var = "SONARQUBE_TOKEN"', `"SONARQUBE_ORG" = "${sonarOrg}"`, '"SONARQUBE_READ_ONLY" = "true"']);

for (const file of [
  ".agents/hooks.json",
  ".agents/rules/sonar-prompt-secrets.md",
  ".agents/sonar/hooks/pretool-secrets.ps1",
  ".codex/hooks.json",
  ".codex/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/prompt-secrets.ps1",
  ".claude/hooks/sonar-secrets/build-scripts/pretool-secrets.ps1",
]) if (fs.existsSync(file)) fail(`forbidden local Sonar hook exists: ${file}`);

const agents = read("AGENTS.md");
forbidAll("AGENTS.md", agents, ["sonar analyze secrets", "sonar hook ", "Get-Command sonar"]);
const claude = read(".claude/settings.json");
forbidAll("Claude settings", claude, ["sonar-secrets", "PreToolUse", "UserPromptSubmit"]);

const sonar = read(".github/workflows/sonarqube.yml");
requireAll("SonarQube workflow", sonar, ["SonarQube Cloud", "runs-on: ubuntu-24.04"]);
forbidAll("SonarQube workflow", sonar, ["localhost:9000", "SONAR_HOST_URL", "runs-on: self-hosted"]);

const codeql = read(".github/workflows/codeql.yml");
requireAll("CodeQL workflow", codeql, ["github/codeql-action/init@", "github/codeql-action/analyze@", "runs-on: ubuntu-24.04"]);
forbidAll("CodeQL workflow", codeql, ["runs-on: self-hosted"]);

const installer = read("tools/scripts/install-oss-toolchain-binaries.sh");
requireAll("remote security installer", installer, [
  "GITHUB_ACTIONS:-",
  'MODE="${1:-governance}"',
  'SELECTED_TOOL="${2:-all}"',
  'SEMGREP_VERSION="1.172.0"',
  'semgrep==${SEMGREP_VERSION}',
]);

const security = read(".github/workflows/security-remote.yml");
requireAll("Remote Security", security, [
  "runs-on: ubuntu-24.04",
  "profile:", "tool:",
  "gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "run-actionlint.mjs", "run-zizmor.mjs",
  "pinact run --verify", "run-shellcheck.mjs", "run-hadolint.mjs", "run-yamllint.mjs",
  "Semgrep Code Remote", "semgrep scan", "github/codeql-action/upload-sarif@",
  "remote-security-oss-${{ github.sha }}", "semgrep-code-remote-${{ github.sha }}",
]);
forbidAll("Remote Security", security, ["runs-on: self-hosted", "semgrep/semgrep:latest", "pip install semgrep", "localhost:"]);

const ocr = read(".github/workflows/opencodereview.yml");
requireAll("OpenCodeReview", ocr, [
  "name: OpenCodeReview", "workflow_dispatch:", "pull_request:", "push:", "runs-on: ubuntu-24.04", "models: read",
  'OCR_VERSION: "1.9.5"', 'OCR_LLM_MODEL: "openai/gpt-5"',
  'OCR_LLM_URL: "https://models.github.ai/inference/chat/completions"', "OCR_LLM_TOKEN: ${{ github.token }}",
  "@alibaba-group/open-code-review@${OCR_VERSION}", "--rule .opencodereview/rule.json",
  "evaluate-opencodereview.mjs", "opencodereview-${{ needs.scope.outputs.head_sha }}", "expected_sha",
]);
forbidAll("OpenCodeReview", ocr, ["runs-on: self-hosted", "localhost:", "127.0.0.1", "ollama", "@latest", "OCR_LLM_TOKEN: ${{ secrets."]);

const ocrPolicy = read(".agents/tools/open-code-review.md");
requireAll("OpenCodeReview agent policy", ocrPolicy, [
  "MUST NOT install or execute `ocr` locally", "[remote-command]", '"schema_version": 2',
  '"command": "opencodereview-full"', '"command": "opencodereview-diff"',
]);

const dependencyReview = read(".github/workflows/dependency-review.yml");
requireAll("Dependency Review", dependencyReview, ["workflow_dispatch:", "base_ref:", "head_ref:", "expected_sha:", "base-ref:", "head-ref:"]);

const codeqlHygiene = read(".github/workflows/codeql-hygiene.yml");
requireAll("CodeQL metadata hygiene", codeqlHygiene, [
  'workflows: ["CodeQL"]', "security-events: write", "github.event.workflow_run.head_sha",
  "github.event.repository.default_branch", "/code-scanning/analyses", "confirm_delete=true",
  "/code-scanning/alerts", "Verify canonical CodeQL workflow metadata without checkout",
]);
forbidAll("CodeQL metadata hygiene", codeqlHygiene, [
  "branches/master", "refs/heads/master", "/branches/master", "actions/checkout@", "node tools/",
  "github/codeql-action/init@", "github/codeql-action/analyze@", "gitleaks detect", "run-osv-scanner.mjs",
  "run-trivy.mjs", "semgrep scan", "ocr review", "sonar-scanner",
]);
if (fs.existsSync("tools/scripts/codeql-hygiene.mjs")) fail("CodeQL metadata hygiene must remain API-only");

const collector = read("tools/scripts/collect-remote-analysis-evidence.mjs");
requireAll("Remote Analysis Evidence collector", collector, [
  "schemaVersion: 3", 'name: "OpenCodeReview"', "collectSemgrep", "workflowArtifacts",
  "semgrep_material_open_alerts", '"Dependency Review"', '"BThwani Lockfile Integrity"',
]);

const evidence = read(".github/workflows/remote-analysis-evidence.yml");
requireAll("Remote Analysis Evidence workflow", evidence, [
  "collect-remote-analysis-evidence.mjs", "Remote Analysis Evidence", "statuses: write", "workflow_run:",
  "cancel-in-progress: false", "Canonical remote analysis evidence complete and policy passed",
]);
forbidAll("Remote Analysis Evidence workflow", evidence, [
  "github/codeql-action/init@", "github/codeql-action/analyze@", "gitleaks detect", "run-osv-scanner.mjs",
  "run-trivy.mjs", "semgrep scan", "ocr review", "ocr scan", "sonar-scanner",
]);

const remoteCommand = read(".github/workflows/remote-command.yml");
requireAll("Remote Command", remoteCommand, [
  "issues:", "actions: write", "schema_version", "schema_version must equal 2", "expected_sha",
  "git check-ref-format --branch", "unsupported remote command", "security-tool", "semgrep-full",
  "opencodereview-full", "opencodereview-diff", "dependency-review", "/actions/workflows/${workflow}/dispatches",
]);
forbidAll("Remote Command", remoteCommand, [
  "github/codeql-action/init@", "github/codeql-action/analyze@", "gitleaks detect", "run-osv-scanner.mjs",
  "run-trivy.mjs", "semgrep scan", "ocr review", "ocr scan", "sonar-scanner", "Invoke-Expression",
]);

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] SonarQube Cloud, CodeQL, Remote Security with Semgrep, OpenCodeReview, Dependency Review, exact-SHA evidence, and SHA-pinned remote dispatch remain GitHub-hosted canonical authorities with no local scanner authority.");
