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

const antigravity = JSON.parse(read(".agents/mcp_config.json"));
const antigravitySonar = antigravity?.mcpServers?.sonarqube;
if (!antigravitySonar) fail("Antigravity SonarQube MCP definition is missing");
if (antigravitySonar.serverUrl !== expectedUrl) fail("Antigravity must use the SonarQube Cloud-hosted MCP endpoint");
if ("command" in antigravitySonar || "args" in antigravitySonar) fail("Antigravity must not launch a local SonarQube MCP process");
if (antigravitySonar.headers?.SONARQUBE_ORG !== expectedOrg) fail("Antigravity SonarQube organization is not pinned");
if (antigravitySonar.headers?.SONARQUBE_READ_ONLY !== "true") fail("Antigravity SonarQube MCP must remain read-only");
if (antigravitySonar.headers?.Authorization !== "Bearer ${SONARQUBE_TOKEN}") fail("Antigravity token must remain an environment reference, never a committed credential");

const generic = JSON.parse(read(".mcp.json"));
const genericSonar = generic?.mcpServers?.sonarqube;
if (!genericSonar) fail("generic SonarQube MCP definition is missing");
if (genericSonar.serverUrl !== expectedUrl) fail("generic MCP config must use the SonarQube Cloud-hosted endpoint");
if ("command" in genericSonar || "args" in genericSonar) fail("generic MCP config must not launch a local SonarQube MCP process");

const codex = read(".codex/config.toml");
for (const forbidden of ["sonar.exe", "mcp/sonarqube", "sonarsource/sonarqube-mcp", "localhost:9000"]) {
  if (codex.includes(forbidden)) fail(`Codex config contains forbidden local SonarQube reference: ${forbidden}`);
}
if (!codex.includes(`url = "${expectedUrl}"`)) fail("Codex must use the SonarQube Cloud-hosted MCP endpoint");
if (!codex.includes('bearer_token_env_var = "SONARQUBE_TOKEN"')) fail("Codex must source the SonarQube bearer token from the environment");
if (!codex.includes(`"SONARQUBE_ORG" = "${expectedOrg}"`)) fail("Codex SonarQube organization is not pinned");
if (!codex.includes('"SONARQUBE_READ_ONLY" = "true"')) fail("Codex SonarQube MCP must remain read-only");

const sonarWorkflow = read(".github/workflows/sonarqube.yml");
for (const forbidden of ["localhost:9000", "SONAR_HOST_URL"]) {
  if (sonarWorkflow.includes(forbidden)) fail(`SonarQube workflow contains forbidden self-hosted dependency: ${forbidden}`);
}
if (!sonarWorkflow.includes("SonarQube Cloud")) fail("SonarQube workflow is not explicitly cloud-owned");

const codeqlWorkflow = read(".github/workflows/codeql.yml");
if (!codeqlWorkflow.includes("github/codeql-action/init@")) fail("CodeQL must run through GitHub code scanning on hosted CI");
if (!codeqlWorkflow.includes("github/codeql-action/analyze@")) fail("CodeQL analysis action is missing");

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] SonarQube MCP is remote-only; SonarQube Cloud and GitHub CodeQL remain canonical remote authorities.");
