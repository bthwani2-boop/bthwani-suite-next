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
const mustNotMatch = (text, patterns, owner) => {
  for (const pattern of patterns) if (pattern.test(text)) fail(`${owner} matches forbidden pattern: ${pattern}`);
};

const workflowDir = path.resolve(".github/workflows");
const workflowFiles = fs.readdirSync(workflowDir).filter((file) => file.endsWith(".yml"));
const workflowEntries = workflowFiles.map((file) => ({file, content: read(path.join(workflowDir, file))}));
const workerWorkflowFiles = workflowFiles.filter((file) => file !== "pr-assurance-trigger.yml");
const workerWorkflowText = workerWorkflowFiles.map((file) => read(path.join(workflowDir, file))).join("\n");
const ci = read(path.join(workflowDir, "ci-check.yml"));
const closure = read(path.join(workflowDir, "final-closure.yml"));
const semanticContext = read(path.join(workflowDir, "open-code-review.yml"));
const repositoryBaseline = read(path.join(workflowDir, "repository-baseline.yml"));
const assuranceDispatcher = read(path.join(workflowDir, "pr-assurance-trigger.yml"));

mustContain(ci, ["workflow_call:", "workflow_dispatch:", "Verify exact candidate and resolve affected scope", "git merge-base --is-ancestor", "BThwani / Change Verification"], "single CI controller");
mustNotContain(ci, ["pull_request:", "push:", "schedule:", "run_assurance", "verification_tier", "runtime_profile", "previous_head_sha", "github.event.before"], "single CI controller");

mustContain(closure, [
  "workflow_dispatch:",
  "Resolve exact live PR candidate",
  "git diff --name-only",
  "name: Full CI preflight",
  "BThwani / Change Closure",
  "statuses/${HEAD_SHA}",
  "semantic-context:",
  "uses: ./.github/workflows/open-code-review.yml",
  "semantic-review:",
  "verify-pr-evidence-comments.mjs",
], "final closure");
mustNotContain(closure, ["pull_request:", "SEMANTIC_RESULT", "workflow_run:", "repository_dispatch", "sleep", "poll"], "final closure control plane");
mustNotMatch(closure, [/\/pulls\/[^\s"']+\/files(?:\?|["'])/u], "final closure changed-file authority");

mustContain(repositoryBaseline, ["workflow_dispatch:", "BThwani / Static Repository Baseline", "BASELINE_OPEN", "exact candidate", "uses: ./.github/workflows/codeql.yml", "uses: ./.github/workflows/sonarqube.yml", "CODEQL_RESULT", "SONAR_RESULT"], "static repository baseline");
mustNotContain(repositoryBaseline, ["BThwani / Change Closure", "BThwani / Change Verification"], "repository baseline status separation");

const dispatchingWorkflows = workflowEntries
  .filter(({content}) => content.includes("/actions/workflows/"))
  .map(({file}) => file);
if (dispatchingWorkflows.length !== 1 || dispatchingWorkflows[0] !== "pr-assurance-trigger.yml") {
  fail(`trusted workflow dispatch authority must be exclusive to pr-assurance-trigger.yml; found=${dispatchingWorkflows.join(",") || "none"}`);
}
mustContain(assuranceDispatcher, [
  "pull_request_target:",
  "actions: write",
  "pull-requests: read",
  "/actions/workflows/final-closure.yml/dispatches",
  "/actions/workflows/ci-check.yml/dispatches",
  "expected_head_sha",
  "expected_base_sha",
  "--arg ref \"${DEFAULT_BRANCH}\"",
], "trusted assurance dispatcher");
mustNotContain(assuranceDispatcher, [
  "actions/checkout@",
  "workflow_run:",
  "repository_dispatch",
  "\n  push:",
  "\n  schedule:",
], "trusted assurance dispatcher");

mustContain(semanticContext, [
  "workflow_call:",
  "deterministic-delegation-context",
  "hostAgentRequired: true",
  "hostAgentExecutedByThisWorkflow: false",
  "semanticReviewClaimedByThisWorkflow: false",
], "OpenCodeReview deterministic context worker");
mustNotContain(semanticContext, [
  "\n  pull_request:",
  "\n  push:",
  "\n  schedule:",
  "hostAgentExecutedByThisWorkflow: true",
  "semanticReviewClaimedByThisWorkflow: true",
], "OpenCodeReview deterministic context worker");

mustNotContain(workerWorkflowText, ["workflow_run:", "repository_dispatch", "actions/workflows/"], "workflow control plane");
for (const file of ["codeql.yml", "semgrep.yml", "security-remote.yml", "sonarqube.yml", "dependency-review.yml", "lockfile-integrity.yml", "docker-runtime-hardening.yml"]) {
  const content = read(path.join(workflowDir, file));
  mustContain(content, ["workflow_call:"], file);
  mustNotContain(content, ["\n  pull_request:", "\n  push:", "\n  schedule:"], file);
}
const sonar = read(path.join(workflowDir, "sonarqube.yml"));
mustContain(sonar, ["SonarSource/sonarqube-scan-action@", "secrets.SONAR_TOKEN", "sonar.pullrequest.key", "sonar.scm.revision"], "SonarQube authority");
mustContain(sonar, ["TRUSTED_SONAR_CLASSIFIER", "api/issues/search", "api/hotspots/search", "api/measures/component"], "Sonar evidence authority");
mustNotContain(sonar, ["SONAR_HOST_URL", "localhost:9000", "vars.SONAR_PROJECT_KEY"], "SonarQube authority");
const semgrep = read(path.join(workflowDir, "semgrep.yml"));
mustContain(semgrep, ["classify-semgrep-evidence.mjs", "compare-assurance-baseline.mjs", "unknownEngineErrors", "Semgrep baseline ratchet rejected new or worsened material findings"], "Semgrep authority");
const security = read(path.join(workflowDir, "security-remote.yml"));
mustContain(security, ["gitleaks detect", "run-osv-scanner.mjs", "run-trivy.mjs", "runs-on: ubuntu-24.04"], "security authority");
mustContain(read(path.join(workflowDir, "codeql.yml")), ["github/codeql-action/init@", "github/codeql-action/analyze@"], "CodeQL authority");
mustContain(read("sonar-project.properties"), ["sonar.organization=bthwani2-boop", "sonar.projectKey=bthwani2-boop_bthwani-suite-next"], "Sonar identity");
console.log("[REMOTE_ANALYSIS_AUTHORITY PASS] Final Closure remains the closure controller; the thin PR trigger is the sole trusted workflow dispatcher and never executes PR source; exact changed-file authority remains Git diff; analyzers remain reusable workers.");
