import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

test("CI is code-only and has no governance workflow bundle", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.equal(exists(".github/workflows/ci-policy.yml"), false);
  assert.equal(exists(".github/workflows/manual-deep-verification.yml"), false);
  assert.doesNotMatch(workflow, /ci-policy\.yml|guard:governance|guard:sdlc|guard:guard-registry/u);
  assert.doesNotMatch(workflow, /governance\/\*\*|\.agents\/\*\*|AGENTS\.md/u);
  assert.match(workflow, /ci-node-diagnostics\.yml/u);
  assert.match(workflow, /ci-node-verification\.yml/u);
  assert.match(workflow, /ci-backends\.yml/u);
  assert.match(workflow, /ci-runtime\.yml/u);
});

test("router owns scopes and jobs only", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /verification_required:/u);
  assert.match(router, /backend_required:/u);
  assert.match(router, /runtime_required:/u);
  assert.match(router, /diagnostics_required:/u);
  assert.doesNotMatch(router, /foundation_guard_ids|guardSets|verification-sets\.json/u);
  assert.doesNotMatch(router, /governance_policy|policy_required|agent-governance|guard-registry|required-command-integrity|\bsdlc\b/u);
});

test("workflow verification has one remote-security owner", () => {
  const ciWorkflow = read(".github/workflows/ci.yml");
  const securityWorkflow = read(".github/workflows/security-remote.yml");
  assert.match(securityWorkflow, /run-actionlint\.mjs/u);
  assert.match(securityWorkflow, /run-zizmor\.mjs/u);
  assert.match(securityWorkflow, /run-pinact\.mjs --verify/u);
  assert.doesNotMatch(ciWorkflow, /run-actionlint\.mjs|run-zizmor\.mjs|run-pinact\.mjs/u);
  assert.doesNotMatch(ciWorkflow, /run-foundation-gate|guard:foundation/u);
  assert.doesNotMatch(securityWorkflow, /run-foundation-gate|guard:foundation/u);
});

test("PR closure uses a trusted reusable workflow with immutable candidate provenance", () => {
  const ciWorkflow = read(".github/workflows/ci.yml");
  const requestWorkflow = read(".github/workflows/pr-closure-request.yml");
  const dispatchWorkflow = read(".github/workflows/pr-closure-dispatch.yml");
  const evidenceWorkflow = read(".github/workflows/pr-closure-evidence.yml");
  const remoteCommandWorkflow = read(".github/workflows/remote-command.yml");

  assert.doesNotMatch(ciWorkflow, /PR Closure Evidence|statuses:\s*write|security-events:\s*read|secrets\.SONAR_TOKEN/u);
  assert.match(ciWorkflow, /run-name:[^\n]*closure-pr-/u);

  assert.equal(requestWorkflow.includes("<!-- bthwani:closure-request -->"), true);
  assert.match(requestWorkflow, /(?:^|\n)\s{2}pull_request:/u);
  assert.doesNotMatch(requestWorkflow, /pull_request_target:|actions:\s*write/u);
  assert.doesNotMatch(requestWorkflow, /actions\/checkout|Wait for canonical closure result/u);

  assert.match(dispatchWorkflow, /issues:[\s\S]*?types: \[labeled\]/u);
  assert.doesNotMatch(dispatchWorkflow, /pull_request_target:|pull_request:/u);
  assert.match(dispatchWorkflow, /github\.event\.label\.name == 'bthwani:closure-request'/u);
  assert.match(dispatchWorkflow, /\.head\.repo\.full_name/u);
  assert.match(dispatchWorkflow, /admin\|maintain\|write/u);
  assert.doesNotMatch(
    dispatchWorkflow,
    /must be independent from the PR author|independent from the head repository owner/u
  );
  assert.match(dispatchWorkflow, /Solo-maintenance authority policy/u);
  assert.match(dispatchWorkflow, /Candidate SHA: \$\{head_sha\}/u);
  assert.match(dispatchWorkflow, /default_branch/u);
  assert.equal(dispatchWorkflow.includes("<!-- bthwani:closure-request -->"), true);
  assert.doesNotMatch(dispatchWorkflow, /actions\/checkout/u);

  assert.match(evidenceWorkflow, /on:\n  workflow_call:/u);
  assert.doesNotMatch(evidenceWorkflow, /workflow_run:/u);
  for (const input of [
    "pr_number",
    "head_ref",
    "head_sha",
    "base_ref",
    "base_sha",
    "closure_approver",
    "default_sha",
  ]) {
    assert.match(evidenceWorkflow, new RegExp(`\\n      ${input}:\\n        required: true`, "u"), input);
  }
  assert.match(evidenceWorkflow, /permissions:\s*\{\}/u);
  assert.match(evidenceWorkflow, /GITHUB_ACTOR,,.*CLOSURE_APPROVER/u);
  assert.match(evidenceWorkflow, /GITHUB_SHA.*DEFAULT_SHA/u);
  assert.match(evidenceWorkflow, /pulls\/\$\{PR_NUMBER\}/u);
  assert.match(evidenceWorkflow, /\.head\.sha.*HEAD_SHA/u);
  assert.match(evidenceWorkflow, /\.base\.sha.*BASE_SHA/u);
  assert.match(evidenceWorkflow, /ref "\$\{DEFAULT_BRANCH\}"[\s\S]*?\{ref:\$ref,inputs:\$inputs\}/u);
  assert.match(evidenceWorkflow, /actions\/workflows\/ci\.yml\/dispatches/u);
  assert.doesNotMatch(evidenceWorkflow, /actions\/checkout/u);
  assert.match(evidenceWorkflow, /--arg ref "\$\{DEFAULT_BRANCH\}"[\s\S]*?\{ref:\$ref,inputs:\$inputs\}/u);
  assert.match(evidenceWorkflow, /pr_number:\$pr,head_sha:\$head,base_sha:\$base/u);
  assert.match(evidenceWorkflow, /\/code-scanning\/analyses/u);
  assert.match(evidenceWorkflow, /\/code-scanning\/alerts/u);
  assert.match(evidenceWorkflow, /\/actions\/runs\/\$\{codeql_run\}\/jobs/u);
  assert.match(evidenceWorkflow, /check_run_url/u);
  assert.doesNotMatch(evidenceWorkflow, /\/commits\/\$\{HEAD_SHA\}\/check-runs/u);
  assert.match(evidenceWorkflow, /\/language:javascript-typescript/u);
  assert.match(evidenceWorkflow, /\/language:actions/u);
  for (const module of ["dsh", "wlt", "identity", "workforce", "platform-control", "providers"]) {
    assert.match(evidenceWorkflow, new RegExp(`/language:go-${module}`), module);
  }

  assert.doesNotMatch(remoteCommandWorkflow, /\bpr-closure\b/u);
  assert.match(remoteCommandWorkflow, /codeql-full\|sonar-full\|security-full\|semgrep-full\|lockfile-integrity\)[\s\S]*?dispatch_ref="\$\{DEFAULT_BRANCH\}"/u);
});

test("closure analyzers accept immutable PR scope while executing trusted default definitions", () => {
  for (const workflow of [
    ".github/workflows/codeql.yml",
    ".github/workflows/sonarqube.yml",
    ".github/workflows/security-remote.yml",
    ".github/workflows/semgrep.yml",
    ".github/workflows/docker-runtime-hardening.yml",
    ".github/workflows/lockfile-integrity.yml",
  ]) {
    const content = read(workflow);
    assert.match(content, /workflow_dispatch:[\s\S]*?pr_number:/u, workflow);
    assert.match(content, /workflow_dispatch:[\s\S]*?head_sha:/u, workflow);
    assert.match(content, /workflow_dispatch:[\s\S]*?base_sha:/u, workflow);
    assert.match(content, /inputs\.head_sha \|\| github\.event\.pull_request\.head\.sha \|\| github\.sha/u, workflow);
  }
});

test("closure security evidence fails closed and analyzer ownership is disjoint", () => {
  const securityWorkflow = read(".github/workflows/security-remote.yml");
  const semgrepWorkflow = read(".github/workflows/semgrep.yml");

  assert.match(securityWorkflow, /WARN\|SKIP\|BLOCKED/u);
  assert.match(securityWorkflow, /outcome=BLOCKED/u);
  assert.match(securityWorkflow, /\[\[ "\$\{outcome\}" == "PASS" \]\]/u);

  assert.match(semgrepWorkflow, /--exclude="\.github\/workflows\/\*\*"/u);
  assert.match(semgrepWorkflow, /unknown_engine_errors/u);
  assert.match(semgrepWorkflow, /\[\[ "\$\{unknown_engine_errors\}" == "0" \]\]/u);
});

test("secret and write-bearing remote analysis jobs never execute candidate scripts", () => {
  const codeql = read(".github/workflows/codeql.yml");
  const sonar = read(".github/workflows/sonarqube.yml");

  assert.equal((codeql.match(/security-events:\s*write/gu) ?? []).length, 1);
  const codeqlWriteBoundary = codeql.slice(codeql.indexOf("  upload:\n"), codeql.indexOf("  result:\n"));
  assert.match(codeqlWriteBoundary, /name: Upload trusted CodeQL SARIF/u);
  assert.doesNotMatch(codeqlWriteBoundary, /actions\/checkout|go build|uses: \.\/|run: (?:node|pnpm|go)\b/u);
  for (const analysis of ["analyze-javascript-typescript", "analyze-go", "analyze-actions"]) {
    const start = codeql.indexOf(`  ${analysis}:\n`);
    assert.ok(start >= 0, analysis);
    const nextJobOffset = codeql.slice(start + 3).search(/\n  [a-z0-9-]+:\n/u);
    const end = nextJobOffset < 0 ? codeql.length : start + 3 + nextJobOffset;
    assert.doesNotMatch(codeql.slice(start, end), /security-events:\s*write/u, analysis);
  }

  assert.doesNotMatch(sonar, /secrets\.BTHWANI_CI_POSTGRES_PASSWORD/u);
  const sonarCoverage = sonar.slice(sonar.indexOf("  coverage:\n"), sonar.indexOf("  scan:\n"));
  const sonarScan = sonar.slice(sonar.indexOf("  scan:\n"), sonar.indexOf("  result:\n"));
  assert.doesNotMatch(sonarCoverage, /secrets\.|SONAR_TOKEN/u);
  assert.match(sonarScan, /secrets\.SONAR_TOKEN/u);
  assert.doesNotMatch(sonarScan, /uses: \.\/|run: (?:node|pnpm|go|pwsh)\b/u);
  assert.match(sonarScan, /github\.ref_name == github\.event\.repository\.default_branch/u);
});

test("push and pull-request result checks have distinct names", () => {
  for (const workflow of [
    ".github/workflows/ci.yml",
    ".github/workflows/codeql.yml",
    ".github/workflows/sonarqube.yml",
    ".github/workflows/security-remote.yml",
    ".github/workflows/semgrep.yml",
  ]) {
    const content = read(workflow);
    assert.match(content, /github\.event_name == 'pull_request'[\s\S]*?PR result/u, workflow);
    assert.match(content, /github\.event_name == 'push'[\s\S]*?push result/u, workflow);
  }
});

test("verification authority is phase-gated", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /verificationAuthorityChanged && \["closure", "default-branch"\]\.includes\(executionPhase\)/u);
  assert.doesNotMatch(router, /\["closure", "master"\]|executionPhase === "(?:master|b|c)"/u);
  const tests = read("tools/scripts/detect-ci-context.test.mjs");
  assert.match(tests, /verification authority stays targeted during PR development/u);
  assert.match(tests, /verification authority forces full exact-candidate closure verification/u);
});

test("reusable jobs execute the routed immutable candidate instead of the PR merge ref", () => {
  for (const workflow of [
    ".github/workflows/ci-node-diagnostics.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-backends.yml",
    ".github/workflows/ci-runtime.yml",
  ]) {
    const content = read(workflow);
    assert.match(content, /candidate_sha:[\s\S]*?CANDIDATE_SHA: \$\{\{ inputs\.candidate_sha \}\}/u, workflow);
    assert.doesNotMatch(content, /CANDIDATE_SHA: \$\{\{ github\.sha \}\}/u, workflow);
    assert.doesNotMatch(content, /inputs\.head_sha/u, workflow);
  }
});

test("OpenCodeReview owns deterministic delegation context without model authority", () => {
  const workflow = read(".github/workflows/open-code-review.yml");
  assert.match(workflow, /ocr delegate preview/u);
  assert.match(workflow, /ocr delegate rule/u);
  assert.match(workflow, /mode: "deterministic-delegation-context"/u);
  assert.match(workflow, /hostAgentRequired: true/u);
  assert.match(workflow, /hostAgentExecutedByThisWorkflow: false/u);
  assert.match(workflow, /semanticReviewClaimedByThisWorkflow: false/u);
  assert.doesNotMatch(
    workflow,
    /COPILOT_GITHUB_TOKEN|@github\/copilot|delegation-copilot-cli|OCR_LLM_|llm_auth_token|llm_url|llm_model/u,
  );
  assert.doesNotMatch(workflow, /OCR_EVALUATOR_SHA|evaluate-opencodereview\.mjs/u);
});

test("backend verification skips an empty development package cone", () => {
  const backend = read(".github/workflows/ci-backends.yml");
  assert.match(backend, /packages=none reason=no-package-in-semantic-cone/u);
  assert.equal(backend.includes('full_backend == "true" || "${#package_args[@]}" -eq 0'), false);
});

test("OpenAPI materialization has no lifecycle-hook authority", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(Object.hasOwn(packageJson.scripts ?? {}, "postinstall"), false);
  assert.match(read("nx.json"), /target": "materialize"/u);
  assert.doesNotMatch(read(".github/actions/setup-node-workspace/action.yml"), /materialize_generated|postinstall/u);
});

test("affected code jobs use shallow checkout plus exact commit hydration", () => {
  for (const workflow of [
    ".github/workflows/ci-node-diagnostics.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-backends.yml",
  ]) {
    const content = read(workflow);
    assert.match(content, /fetch-exact-commits/u, workflow);
    assert.match(content, /fetch-depth: 1/u, workflow);
  }
  assert.match(read(".github/actions/fetch-exact-commits/action.yml"), /git fetch --no-tags --depth=1/u);
});

test("package exposes simple verification entrypoints without governance aliases", () => {
  const scripts = JSON.parse(read("package.json")).scripts ?? {};
  assert.equal(scripts.verify, "node tools/scripts/run-affected-verification.mjs");
  assert.equal(scripts["verify:full"], "pnpm run workspace:verify");
  assert.equal(scripts["runtime:verify"], "pnpm run runtime:full:smoke");
  assert.equal(Object.hasOwn(scripts, "guard:foundation"), false);
  assert.equal(Object.hasOwn(scripts, "diagnose"), false);
  assert.equal(Object.hasOwn(scripts, "guard:journey-runtime"), false);
  assert.equal(Object.hasOwn(scripts, "guard:journey:full"), false);
  for (const key of Object.keys(scripts)) {
    assert.doesNotMatch(key, /^guard:(?:governance|sdlc|guard-registry|required-command-integrity|agent-governance|authority-separation|tools-v5)/u);
  }
});
