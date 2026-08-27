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

const workflowDir = path.resolve(".github/workflows");
const workflowFiles = fs.readdirSync(workflowDir).filter((file) => file.endsWith(".yml"));
const allWorkflowText = workflowFiles.map((file) => read(path.join(workflowDir, file))).join("\n");
const ci = read(path.join(workflowDir, "ci-check.yml"));
const closure = read(path.join(workflowDir, "final-closure.yml"));
mustContain(ci, ["workflow_call:", "workflow_dispatch:", "Verify exact candidate and resolve affected scope", "git merge-base --is-ancestor"], "single CI controller");
mustNotContain(ci, ["pull_request:", "push:", "schedule:", "run_assurance", "verification_tier", "runtime_profile", "previous_head_sha", "github.event.before"], "single CI controller");
mustContain(closure, ["workflow_dispatch:", "Resolve exact live PR candidate", "git diff --name-only", "name: Full CI preflight", "BThwani / Final Closure", "statuses/${HEAD_SHA}"], "final closure");
mustNotContain(closure, ["pull_request:", "open-code-review.yml", "SEMANTIC_RESULT", "pulls/.*?/files?", "per_page=100", "workflow_run:", "repository_dispatch", "sleep", "poll"], "final closure control plane");
mustNotContain(allWorkflowText, ["workflow_run:", "repository_dispatch", "actions/workflows/"], "workflow control plane");
for (const file of ["codeql.yml", "semgrep.yml", "security-remote.yml", "sonarqube.yml", "dependency-review.yml", "lockfile-integrity.yml", "docker-runtime-hardening.yml"]) {
  const content = read(path.join(workflowDir, file));
  mustContain(content, ["workflow_call:"], file);
  mustNotContain(content, ["\n  pull_request:", "\n  push:", "\n  schedule:"], file);
}
const sonar = read(path.join(workflowDir, "sonarqube.yml"));
mustContain(sonar, ["SonarSource/sonarqube-scan-action@", "secrets.SONAR_TOKEN", "sonar.pullrequest.key", "sonar.scm.revision"], "SonarQube authority");
mustNotContain(sonar, ["SONAR_HOST_URL", "localhost:9000", "vars.SONAR_PROJECT_KEY"], "SonarQube authority");
const semgrep = read(path.join(workflowDir, "semgrep.yml"));
mustContain(semgrep, ["classify-semgrep-evidence.mjs", "unknownEngineErrors", "Semgrep findings require diagnosis/disposition before closure"], "Semgrep authority");
const security = read(path.join(workflowDir, "security-remote.yml"));
mustContain(security, ["gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "runs-on: ubuntu-24.04"], "security authority");
mustContain(read(path.join(workflowDir, "codeql.yml")), ["github/codeql-action/init@", "github/codeql-action/analyze@"], "CodeQL authority");
mustContain(read("sonar-project.properties"), ["sonar.organization=bthwani2-boop", "sonar.projectKey=bthwani2-boop_bthwani-suite-next"], "Sonar identity");
console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] Manual check and explicit fail-fast closure are the only controllers; analyzers remain reusable workers.");
