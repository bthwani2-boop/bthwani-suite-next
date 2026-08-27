import fs from "node:fs";
import path from "node:path";

const fail = (message) => {
  console.error(`[REMOTE_ANALYSIS_AUTHORITY FAIL] ${message}`);
  process.exit(1);
};
const read = (file) => {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  return fs.readFileSync(file, "utf8");
};
const mustContain = (text, patterns, owner) => {
  for (const pattern of patterns) if (!text.includes(pattern)) fail(`${owner} missing: ${pattern}`);
};
const mustNotContain = (text, patterns, owner) => {
  for (const pattern of patterns) if (text.includes(pattern)) fail(`${owner} contains forbidden path: ${pattern}`);
};

const workflows = fs.readdirSync(path.resolve(".github/workflows"))
  .filter((file) => file.endsWith(".yml"))
  .map((file) => `.github/workflows/${file}`);
const allWorkflowText = workflows.map(read).join("\n");

mustContain(read(".github/workflows/ci.yml"), [
  "workflow_call:",
  "workflow_dispatch:",
  "Resolve canonical branch/PR identity",
  "PR_IDENTITY_CONFLICT",
], "fast PR gate");
mustContain(read(".github/workflows/final-closure.yml"), [
  "name: BThwani Final Closure",
  "types: [ready_for_review, synchronize, reopened]",
  "Resolve exact live PR candidate",
  "uses: ./.github/workflows/ci.yml",
  "uses: ./.github/workflows/sonarqube.yml",
  "uses: ./.github/workflows/codeql.yml",
  "uses: ./.github/workflows/semgrep.yml",
  "uses: ./.github/workflows/security-remote.yml",
  "name: BThwani / Final Closure",
  "statuses/${HEAD_SHA}",
], "final closure");
mustNotContain(allWorkflowText, ["workflow_run:", "repository_dispatch", "actions/workflows/"], "workflow control plane");
mustNotContain(read(".github/workflows/final-closure.yml"), ["sleep", "poll", "workflow_run:", "repository_dispatch", "actions/workflows/"], "final closure control plane");

for (const file of [
  ".github/workflows/pr-closure-dispatch.yml",
  ".github/workflows/pr-closure-evidence.yml",
  ".github/workflows/pr-closure-invalidate.yml",
  ".github/workflows/pr-closure-request.yml",
  ".github/workflows/remote-command.yml",
  ".github/workflows/remote-analysis-evidence.yml",
  ".github/workflows/codeql-hygiene.yml",
]) if (fs.existsSync(file)) fail(`obsolete workflow remains: ${file}`);

for (const file of ["codeql.yml", "semgrep.yml", "security-remote.yml", "sonarqube.yml"]) {
  const content = read(`.github/workflows/${file}`);
  mustContain(content, ["workflow_call:", "head_sha", "base_sha"], file);
}
const sonar = read(".github/workflows/sonarqube.yml");
mustContain(sonar, [
  "SonarSource/sonarqube-scan-action@",
  "secrets.SONAR_TOKEN",
  "sonar.pullrequest.key",
  "sonar.scm.revision",
], "SonarQube authority");
mustNotContain(sonar, ["SONAR_HOST_URL", "localhost:9000", "vars.SONAR_PROJECT_KEY"], "SonarQube authority");
const semgrep = read(".github/workflows/semgrep.yml");
mustContain(semgrep, ["classify-semgrep-evidence.mjs", "unknownEngineErrors", "Semgrep findings require diagnosis/disposition before closure"], "Semgrep authority");
const security = read(".github/workflows/security-remote.yml");
mustContain(security, ["gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "runs-on: ubuntu-24.04"], "security authority");
mustContain(read(".github/workflows/codeql.yml"), ["github/codeql-action/init@", "github/codeql-action/analyze@"], "CodeQL authority");
mustContain(read("sonar-project.properties"), ["sonar.organization=bthwani2-boop", "sonar.projectKey=bthwani2-boop_bthwani-suite-next"], "Sonar identity");

console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] The repository has one fast PR gate, one exact non-polling final closure, reusable analyzer workers, live candidate binding, and no legacy dispatch or workflow-run polling paths.");
