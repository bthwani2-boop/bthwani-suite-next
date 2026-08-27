import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

const legacyWorkflows = [
  ".github/workflows/pr-closure-dispatch.yml",
  ".github/workflows/pr-closure-evidence.yml",
  ".github/workflows/pr-closure-invalidate.yml",
  ".github/workflows/pr-closure-request.yml",
  ".github/workflows/remote-command.yml",
  ".github/workflows/remote-analysis-evidence.yml",
  ".github/workflows/codeql-hygiene.yml",
];

test("the fast PR gate owns affected development verification", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /workflow_call:/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /pull_request:/u);
  assert.match(workflow, /Resolve canonical branch\/PR identity/u);
  assert.match(workflow, /PR_IDENTITY_CONFLICT/u);
  assert.match(workflow, /affected/u);
  assert.match(workflow, /cancel-in-progress: true/u);
  assert.match(workflow, /group: bthwani-ci-\$\{\{ inputs\.target_kind \|\| 'branch' \}\}/u);
  assert.match(workflow, /mode="\$\{DISPATCH_MODE:-affected\}"/u);
});

test("PR synchronize routes only the previous exact PR head delta", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /PR_ACTION_EVENT: \$\{\{ github\.event\.action \}\}/u);
  assert.match(workflow, /PR_BEFORE_SHA: \$\{\{ github\.event\.before \}\}/u);
  assert.match(workflow, /EVENT_NAME.*pull_request.*PR_ACTION_EVENT.*synchronize/su);
  assert.match(workflow, /scope_base_sha="\$\{base_sha\}"/u);
  assert.match(workflow, /scope_base_sha="\$\{previous_head_sha\}"/u);
  assert.match(workflow, /incremental-event-before/u);
  assert.match(workflow, /incremental-run-history/u);
  assert.match(workflow, /refusing to widen to base→head/u);
  assert.match(workflow, /canonical_base_sha: \$\{\{ steps\.target\.outputs\.base_sha \}\}/u);
});

test("the fast gate excludes heavy analyzers from its daily DAG", () => {
  const workflow = read(".github/workflows/ci.yml");
  for (const worker of ["sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml", "dependency-review.yml", "lockfile-integrity.yml", "docker-runtime-hardening.yml"]) {
    assert.doesNotMatch(workflow, new RegExp(`uses: \\.\\/.github/workflows/${worker.replace(".", "\\\\.")}`, "u"), worker);
  }
  assert.match(workflow, /needs: \[context, diagnostics, verification, backends, runtime\]/u);
  assert.doesNotMatch(workflow, /run_analyzers/u);
});

test("the final closure is the only final entrypoint and has no polling orchestration", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /name: BThwani Final Closure/u);
  assert.match(workflow, /types: \[ready_for_review, synchronize, reopened\]/u);
  assert.match(workflow, /Resolve exact live PR candidate/u);
  for (const worker of ["ci.yml", "sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml"]) {
    assert.match(workflow, new RegExp(`uses: \\.\\/.github/workflows/${worker.replace(".", "\\.")}`, "u"), worker);
  }
  assert.match(workflow, /name: BThwani \/ Final Closure/u);
  assert.doesNotMatch(workflow, /workflow_run:|repository_dispatch|actions\/workflows\/|\bsleep\b/u);
});

test("final closure executes full exact-candidate assurance and fail-closes every required authority", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /mode: full/u);
  assert.match(workflow, /journey: (?:"true"|\$\{\{ 'true' \}\})/u);
  assert.match(workflow, /runtime_proof: true/u);
  assert.match(workflow, /run_assurance: true/u);
  assert.match(workflow, /needs: \[resolve, ci, sonar, codeql, semgrep, security, semantic, dependency, docker\]/u);
  assert.match(workflow, /"sonar:\$\{SONAR_RESULT\}"/u);
  assert.match(workflow, /"codeql:\$\{CODEQL_RESULT\}"/u);
  assert.match(workflow, /"semgrep:\$\{SEMGREP_RESULT\}"/u);
  assert.match(workflow, /"security:\$\{SECURITY_RESULT\}"/u);
  assert.doesNotMatch(workflow, /Reuse exact valid evidence/u);
  assert.doesNotMatch(workflow, /runtime_proof: false|run_assurance: false/u);
});

test("obsolete control-plane files are deleted instead of retained as compatibility paths", () => {
  for (const workflow of legacyWorkflows) assert.equal(exists(workflow), false, workflow);
});

test("all analyzer workers accept exact reusable candidates", () => {
  for (const workflow of ["codeql.yml", "sonarqube.yml", "security-remote.yml", "semgrep.yml"]) {
    const content = read(`.github/workflows/${workflow}`);
    assert.match(content, /workflow_call:/u, workflow);
    assert.match(content, /head_sha/u, workflow);
    assert.match(content, /base_sha/u, workflow);
  }
});

test("Sonar executes a real current PR analysis", () => {
  const sonar = read(".github/workflows/sonarqube.yml");
  assert.match(sonar, /SonarSource\/sonarqube-scan-action@/u);
  assert.match(sonar, /secrets\.SONAR_TOKEN/u);
  assert.match(sonar, /sonar\.pullrequest\.key/u);
  assert.match(sonar, /sonar\.scm\.revision/u);
  assert.doesNotMatch(sonar, /SONAR_HOST_URL|localhost:9000|vars\.SONAR_PROJECT_KEY/u);
});

test("security analyzers remain fail-closed and Semgrep accounts for engine conditions", () => {
  const security = read(".github/workflows/security-remote.yml");
  assert.match(security, /gitleaks detect/u);
  assert.match(security, /run-osv-scanner\.mjs/u);
  assert.match(security, /run-trivy\.mjs/u);
  assert.match(security, /outcome=BLOCKED/u);
  const semgrep = read(".github/workflows/semgrep.yml");
  assert.match(semgrep, /unknownEngineErrors/u);
  assert.match(semgrep, /allRawFindingsAccounted/u);
  assert.match(semgrep, /Semgrep findings require diagnosis\/disposition before closure/u);
});

test("the workflow control plane has no workflow-run polling or dispatch chains", () => {
  const workflowDir = path.join(repoRoot, ".github/workflows");
  for (const filename of fs.readdirSync(workflowDir)) {
    const content = fs.readFileSync(path.join(workflowDir, filename), "utf8");
    assert.doesNotMatch(content, /workflow_run:|repository_dispatch|actions\/workflows\//u, filename);
  }
});

test("package exposes one simple remote CI interface", () => {
  const scripts = JSON.parse(read("package.json")).scripts ?? {};
  assert.equal(scripts["ci:request"], "node tools/scripts/ci-request.mjs");
  assert.equal(scripts.verify, "node tools/scripts/run-affected-verification.mjs");
  assert.equal(scripts["verify:full"], "pnpm run workspace:verify");
  assert.equal(scripts["runtime:verify"], "pnpm run runtime:full:smoke");
});

test("the request command resolves live identity before dispatch", () => {
  const command = read("tools/scripts/ci-request.mjs");
  assert.match(command, /"gh", \["repo", "view"/u);
  assert.match(command, /"gh", \[\n\s+"pr", "list"/u);
  assert.match(command, /headRefOid/u);
  assert.match(command, /expected_base_sha/u);
  assert.match(command, /gh.*workflow.*run/u);
  assert.doesNotMatch(command, /issue|remote-command|sleep|poll/u);
});

test("CodeQL, Sonar, Semgrep, and security are distinct reusable authorities", () => {
  for (const workflow of ["codeql.yml", "sonarqube.yml", "semgrep.yml", "security-remote.yml"]) {
    assert.equal(exists(`.github/workflows/${workflow}`), true, workflow);
  }
  assert.equal(exists(".github/workflows/final-closure.yml"), true);
});
