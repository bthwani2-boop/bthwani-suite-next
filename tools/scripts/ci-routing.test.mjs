import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const orchestratorRoot = path.join(repoRoot, "tools/prompting/bthwani-orchestrator");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));
const orchestratorFiles = [
  "00-ORCHESTRATOR.md",
  "01-SCOPE-AUTHORITY-RULES.md",
  "02-DIAGNOSE-ROOT-CAUSE.md",
  "03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md",
  "04-VERIFY-REDIAGNOSE-CLOSE.md",
  "05-OBJECTIVES-PLAYBOOK.md",
  "focus/code-architecture-organization.md",
  "focus/data-contracts-runtime-security-quality.md",
  "focus/governance-product-design.md",
];

test("orchestrator package keeps its declared nine owners and revision", () => {
  const actual = [];
  for (const entry of fs.readdirSync(orchestratorRoot, {withFileTypes: true})) {
    if (entry.isFile() && entry.name.endsWith(".md")) actual.push(entry.name);
    if (entry.isDirectory()) {
      for (const nested of fs.readdirSync(path.join(orchestratorRoot, entry.name), {withFileTypes: true})) {
        if (nested.isFile() && nested.name.endsWith(".md")) actual.push(`${entry.name}/${nested.name}`);
      }
    }
  }
  assert.deepEqual(actual.sort(), [...orchestratorFiles].sort());
  const entrypoint = read("tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md");
  assert.match(entrypoint, /PACKAGE_REVISION: 22/u);
  assert.match(entrypoint, /Exactly nine files are semantic owners/u);
  for (const relativePath of orchestratorFiles) assert.equal(exists(`tools/prompting/bthwani-orchestrator/${relativePath}`), true, relativePath);
});

test("ci-check is the single manual and reusable controller", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /workflow_call:/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /pull_request:|push:|schedule:/u);
  assert.match(workflow, /Verify exact candidate and resolve affected scope/u);
  assert.match(workflow, /git merge-base --is-ancestor/u);
  assert.match(workflow, /cancel-in-progress: true/u);
  assert.match(workflow, /group: bthwani-ci-\$\{\{ inputs\.pr_number \|\| inputs\.expected_head_sha \|\| github\.ref \}\}/u);
  assert.equal(exists(".github/workflows/ci.yml"), false);
  for (const legacy of ["run_assurance", "verification_tier", "runtime_profile", "previous_head_sha", "incremental-run-history", "github.event.before"]) {
    assert.equal(workflow.includes(legacy), false, legacy);
  }
});

test("ci-check keeps write permission only on the status publisher job", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  const beforeJobs = workflow.slice(0, workflow.indexOf("jobs:"));
  assert.doesNotMatch(beforeJobs, /statuses:\s*write/u);
  assert.match(workflow, /result:[\s\S]*?permissions:[\s\S]*?statuses:\s*write/u);
  assert.match(workflow, /BThwani CI \/ PR result/u);
  assert.match(workflow, /statuses\/\$\{HEAD_SHA\}/u);
  assert.match(workflow, /publish_status success/u);
});

test("CI control-plane checks collect independent failures instead of blocking product verification", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /controls:[\s\S]*?continue-on-error: true[\s\S]*?continue-on-error: true[\s\S]*?continue-on-error: true/u);
  assert.match(workflow, /Enforce complete material control-plane collection/u);
  for (const job of ["diagnostics", "verification", "backends", "runtime"]) {
    assert.match(workflow, new RegExp(`${job}:[\\s\\S]*?needs: \\[context\\]`, "u"), job);
  }
  assert.match(workflow, /needs: \[context, controls, diagnostics, verification, backends, runtime\]/u);
});

test("Node verification collects typecheck lint test and build before aggregate failure", () => {
  const workflow = read(".github/workflows/ci-node-verification.yml");
  assert.match(workflow, /without first-failure masking/u);
  assert.match(workflow, /for target in typecheck lint test build/u);
  assert.match(workflow, /failures=\(\)/u);
  assert.match(workflow, /Enforce complete Node verification collection/u);
  assert.match(workflow, /BLOCKED_BY contract-materialization/u);
});

test("CI and Sonar enforce the same repository-wide Sonar ownership contract", () => {
  for (const file of [".github/workflows/ci-check.yml", ".github/workflows/sonarqube.yml"]) {
    const workflow = read(file);
    assert.match(workflow, /sonar-coverage-ownership-gate\.test\.mjs/u, file);
    assert.match(workflow, /sonar-coverage-ownership-gate\.mjs/u, file);
  }
});

test("Sonar trusted analysis has one explicit trusted opt-in", () => {
  const sonar = read(".github/workflows/sonarqube.yml");
  const master = read(".github/workflows/master-sonar.yml");
  assert.match(sonar, /trusted_scan: \{type: boolean, required: false, default: false\}/u);
  assert.match(sonar, /if: \$\{\{ always\(\) && inputs\.trusted_scan && needs\.scope\.result == 'success' && needs\.scope\.outputs\.sonar_required == 'true' && needs\.assemble\.result == 'success' \}\}/u);
  assert.match(master, /trusted_scan: true/u);
  assert.doesNotMatch(master, /head_ref: master|base_ref: master/u);
  assert.doesNotMatch(sonar, /skip_duplicate_push|needs\.ownership|^  ownership:/mu);
});

test("trusted full Sonar analysis generates coverage for every Go source owner", () => {
  const sonar = read(".github/workflows/sonarqube.yml");
  assert.match(sonar, /MODE: \$\{\{ steps\.ci_scope\.outputs\.mode \}\}/u);
  assert.match(sonar, /TRUSTED_SCAN: \$\{\{ inputs\.trusted_scan \}\}/u);
  assert.match(
    sonar,
    /if \[\[ "\$\{MODE\}" == "full" && "\$\{TRUSTED_SCAN\}" == "true" \]\]; then\s+services=\(dsh wlt identity workforce platform providers\)/u,
  );
  assert.match(sonar, /needs\.scope\.outputs\.go_required == 'true'.*-Dsonar\.go\.coverage\.reportPaths/su);
});

test("Sonar scope publishes the computed mode to downstream jobs", () => {
  const sonar = read(".github/workflows/sonarqube.yml");
  assert.match(
    sonar,
    /CI_MODE="\$\{mode\}" \\\s*node tools\/scripts\/detect-ci-context\.mjs\s+echo "mode=\$\{mode\}" >> "\$\{GITHUB_OUTPUT\}"/u,
  );
});

test("the affected router is based on the exact caller-supplied verification window", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(router, /\["diff", "--name-only"/u);
  assert.match(router, /baseSha, headSha/u);
  assert.match(workflow, /verification_base_sha: \$\{\{ steps\.scope\.outputs\.verification_base_sha \}\}/u);
  assert.doesNotMatch(router, /previous|run.?history|semantic|financial|security_scan/u);
});

test("human review is one centralized changed-candidate risk decision", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  const closure = read(".github/workflows/final-closure.yml");
  assert.match(router, /human_review_required/u);
  assert.match(closure, /human_review_required: \$\{\{ steps\.classification\.outputs\.human_review_required \}\}/u);
  assert.match(closure, /HUMAN_REVIEW_REQUIRED/u);
  assert.doesNotMatch(closure, /catastrophic domains|always require.*approval/iu);
});

test("backend changes cannot become green by skipping backend verification", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /backend_required == 'true'/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ci-backends\.yml/u);
  assert.doesNotMatch(workflow, /run_assurance/u);
});

test("final closure resolves once then collects independent analyzers and experience evidence in parallel", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /pull_request:/u);
  assert.match(workflow, /name: Full CI preflight/u);
  assert.match(workflow, /full_scope: true/u);
  assert.match(workflow, /trusted_scan: true/u);
  assert.match(workflow, /codeql\.yml[\s\S]*?full_scope: true/u);
  assert.match(workflow, /semgrep\.yml[\s\S]*?full_scope: true/u);
  for (const worker of ["sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml"]) {
    assert.ok(workflow.includes(`uses: ./.github/workflows/${worker}`), worker);
  }
  for (const job of ["ci", "sonar", "codeql", "semgrep", "security", "semantic-context", "rendered-web-baseline", "mobile-evidence"]) {
    assert.match(workflow, new RegExp(`${job}:[\\s\\S]*?needs: \\[resolve\\]`, "u"), job);
  }
  assert.match(workflow, /semantic-context:[\s\S]*?open-code-review\.yml/u);
  assert.match(workflow, /semantic-review:[\s\S]*?needs: \[resolve, semantic-context\]/u);
  assert.match(workflow, /rendered-web-evidence:[\s\S]*?needs: \[resolve, rendered-web-baseline\]/u);
  assert.doesNotMatch(workflow, /needs: \[resolve, ci\]/u);
  assert.match(
    workflow,
    /needs: \[resolve, ci, sonar, codeql, semgrep, security, semantic-review, rendered-web-baseline, rendered-web-evidence, mobile-evidence, dependency, lockfile, docker\]/u,
  );
  assert.match(workflow, /after complete evidence collection/u);
  assert.doesNotMatch(workflow, /SEMANTIC_RESULT/u);
  assert.match(workflow, /BThwani \/ Final Closure/u);
  assert.match(workflow, /target:head-moved/u);
  assert.match(workflow, /target:base-moved/u);
  assert.doesNotMatch(workflow, /workflow_run:|repository_dispatch|actions\/workflows\/|sleep|poll/u);
});

test("Final Closure is a protected-definition privileged boundary with least privilege", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  const beforeJobs = workflow.slice(0, workflow.indexOf("jobs:"));
  assert.match(beforeJobs, /permissions:\s*\n\s*contents:\s*read/u);
  assert.doesNotMatch(beforeJobs, /security-events:\s*write|statuses:\s*write/u);
  assert.match(workflow, /GITHUB_REF_NAME.*DEFAULT_BRANCH/su);
  assert.match(workflow, /codeql:[\s\S]*?security-events:\s*write/u);
  assert.match(workflow, /final:[\s\S]*?statuses:\s*write/u);
});

test("final closure derives applicability from one exact Git diff and trusted router", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /git diff --name-only/u);
  assert.match(workflow, /BASE_SHA.*HEAD_SHA/su);
  assert.match(workflow, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(workflow, /contents\/tools\/scripts\/detect-ci-context\.mjs/u);
  assert.doesNotMatch(workflow, /pulls\/.*\/files\?per_page=100/u);
});

test("CodeQL and Semgrep expose explicit final full-scope contracts", () => {
  const codeql = read(".github/workflows/codeql.yml");
  const semgrep = read(".github/workflows/semgrep.yml");
  assert.match(codeql, /full_scope: \{type: boolean, required: false, default: false\}/u);
  assert.match(codeql, /INPUT_FULL_SCOPE/u);
  assert.match(codeql, /if \[\[ "\$\{INPUT_FULL_SCOPE\}" == "true" \]\]; then\s+full=true/u);
  assert.match(semgrep, /full_scope: \{type: boolean, required: false, default: false\}/u);
  assert.match(semgrep, /if \[\[ "\$\{FULL_SCOPE\}" == "true" \]\]; then\s+mode=full/u);
  assert.match(semgrep, /args\+=\(--baseline-commit "\$\{BASE_SHA\}"\)/u);
});

test("OpenCodeReview specialized rules match the live core authorities", () => {
  const rules = read(".opencodereview/rule.json");
  for (const path of ["core/identity/**/*", "core/workforce/**/*", "core/platform-control/**/*", "core/providers/**/*"]) {
    assert.ok(rules.includes(`\"path\": \"${path}\"`), path);
  }
  assert.doesNotMatch(rules, /services\/(identity|workforce)\/\*\*\/*/u);
});

test("obsolete control-plane scripts are deleted", () => {
  for (const file of ["tools/scripts/ci-request.mjs", "tools/scripts/ci-local-gate.ps1", "tools/scripts/verification-requirement.mjs"]) {
    assert.equal(exists(file), false, file);
  }
});

test("package exposes exactly the two remote user commands", () => {
  const scripts = JSON.parse(read("package.json")).scripts ?? {};
  assert.equal(scripts["ci:check"], "node tools/scripts/ci-check.mjs");
  assert.equal(scripts["ci:close"], "node tools/scripts/ci-close.mjs");
  assert.equal(Object.hasOwn(scripts, "ci:request"), false);
  assert.equal(Object.hasOwn(scripts, "ci:local"), false);
});

test("ci commands dispatch protected default-branch workflow definitions against exact candidate data", () => {
  for (const file of ["tools/scripts/ci-check.mjs", "tools/scripts/ci-close.mjs"]) {
    const command = read(file);
    assert.match(command, /git.*status.*--porcelain=v1/su);
    assert.match(command, /working tree is not clean/u);
    assert.match(command, /gh.*repo.*view/su);
    assert.match(command, /gh.*pr.*list/su);
    assert.match(command, /headRefOid/u);
    assert.match(command, /workflow.*run/su);
    assert.match(command, /--ref.*defaultBranch/su);
    assert.match(command, /workflowDefinitionRef: defaultBranch/u);
    assert.match(command, file.includes("ci-check") ? /ci-check\.yml/u : /final-closure\.yml/u);
    assert.doesNotMatch(command, /sleep|poll|previous/u);
  }
});

test("analyzer workers are reusable only and no workflow-run orchestration exists", () => {
  const workflowDir = path.join(repoRoot, ".github/workflows");
  for (const filename of fs.readdirSync(workflowDir)) {
    const content = fs.readFileSync(path.join(workflowDir, filename), "utf8");
    assert.doesNotMatch(content, /workflow_run:|repository_dispatch|actions\/workflows\//u, filename);
    if (["sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml", "dependency-review.yml", "lockfile-integrity.yml", "docker-runtime-hardening.yml"].includes(filename)) {
      assert.match(content, /workflow_call:/u, filename);
      assert.doesNotMatch(content, /^\s{2}(push|pull_request|schedule):/mu, filename);
    }
  }
});

test("exact candidate and fail-closed status remain the final authority", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /expected_head_sha/u);
  assert.match(workflow, /expected_base_sha/u);
  assert.match(workflow, /statuses\/\$\{HEAD_SHA\}/u);
  assert.match(workflow, /state=success/u);
  assert.match(workflow, /state=failure/u);
});

test("remaining evidence collectors do not mask independently executable failures", () => {
  const contracts = read(".github/workflows/ci-node-diagnostics.yml");
  const runtime = read(".github/workflows/ci-runtime.yml");
  const backends = read(".github/workflows/ci-backends.yml");
  assert.match(contracts, /Enforce complete contract diagnostic collection/u);
  assert.match(contracts, /BLOCKED_BY materialize/u);
  assert.match(runtime, /Enforce complete runtime evidence collection/u);
  assert.match(runtime, /BLOCKED_BY bootstrap/u);
  assert.match(backends, /Collect Go test and build evidence/u);
  assert.match(backends, /go-test:/u);
  assert.match(backends, /go-build:/u);
});

test("full Node verification bypasses Nx computation cache while affected verification stays incremental", () => {
  const workflow = read(".github/workflows/ci-node-verification.yml");
  assert.match(workflow, /run-many -t "\$\{target\}" --all --outputStyle=stream --skip-nx-cache/u);
  assert.match(workflow, /run-affected-verification\.mjs/u);
});

test("orchestrator forbids false green and broad rerun churn", () => {
  const verify = read("tools/prompting/bthwani-orchestrator/04-VERIFY-REDIAGNOSE-CLOSE.md");
  assert.match(verify, /NOT_COVERED/u);
  assert.match(verify, /BLOCKED_BY/u);
  assert.match(verify, /Discovery is an evidence stream, not an execution barrier/u);
  assert.match(verify, /do not dispatch another broad remote wave/u);
  assert.match(verify, /rerun only invalidated\/newly-required proof/u);
});

test("assurance routing includes semantic control-plane authorities", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  for (const path of [".agents/", ".opencodereview/", "tools/prompting/", "governance/"]) {
    assert.ok(router.includes(`"${path}"`), path);
  }
  assert.ok(router.includes('file === "sonar-project.properties"'));
});

test("deep discovery utilities are evidence tools, not durable truth registries", () => {
  assert.equal(exists("tools/scripts/run-deep-discovery.mjs"), true);
  assert.equal(exists("tools/scripts/run-rendered-control-panel-proof.mjs"), true);
  const discovery = read("tools/scripts/run-deep-discovery.mjs");
  assert.match(discovery, /tmpdir\(\)/u);
  assert.doesNotMatch(discovery, /closure-registry|root-status|project-status/u);
});
