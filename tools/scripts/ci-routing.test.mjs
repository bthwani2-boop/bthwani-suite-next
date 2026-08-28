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
  assert.match(entrypoint, /PACKAGE_REVISION: 20/u);
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

test("ci-check exposes the one manual affected-verification entrypoint", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /name: BThwani CI/u);
  assert.match(workflow, /full_scope: \{description: Run all owner checks, required: false, default: false, type: boolean\}/u);
  assert.match(workflow, /BThwani CI \/ PR result/u);
  assert.match(workflow, /statuses: write/u);
  assert.match(workflow, /statuses\/\$\{HEAD_SHA\}/u);
  assert.match(workflow, /publish_status success/u);
  assert.doesNotMatch(workflow, /workflow_run:|repository_dispatch|actions\/workflows\//u);
});

test("the affected router is based on the exact current Base-to-Head diff", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /\["diff", "--name-only"/u);
  assert.match(router, /baseSha, headSha/u);
  assert.doesNotMatch(router, /previous|run.?history|semantic|financial|security_scan/u);
});

test("backend changes cannot become green by skipping backend verification", () => {
  const workflow = read(".github/workflows/ci-check.yml");
  assert.match(workflow, /backend_required == 'true'/u);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/ci-backends\.yml/u);
  assert.doesNotMatch(workflow, /run_assurance/u);
});

test("final closure is explicit only and runs Full CI before analyzers", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /pull_request:/u);
  assert.match(workflow, /name: Full CI preflight/u);
  assert.match(workflow, /needs: \[resolve, ci\]/u);
  for (const worker of ["sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml"]) {
    assert.match(workflow, new RegExp(`uses: \.\/.github/workflows/${worker.replace(".", "\\.")}`, "u"), worker);
    assert.match(workflow, new RegExp(`needs: \\[resolve, ci\\]`, "u"), worker);
  }
  assert.doesNotMatch(workflow, /open-code-review\.yml|SEMANTIC_RESULT/u);
  assert.match(workflow, /BThwani \/ Final Closure/u);
  assert.match(workflow, /target:head-moved/u);
  assert.match(workflow, /target:base-moved/u);
  assert.doesNotMatch(workflow, /workflow_run:|repository_dispatch|actions\/workflows\/|sleep|poll/u);
});

test("final closure derives all applicability from one exact Git diff", () => {
  const workflow = read(".github/workflows/final-closure.yml");
  assert.match(workflow, /git diff --name-only/u);
  assert.match(workflow, /BASE_SHA.*HEAD_SHA/su);
  assert.doesNotMatch(workflow, /pulls\/.*\/files\?per_page=100/u);
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

test("ci commands resolve live identity before dispatch", () => {
  for (const file of ["tools/scripts/ci-check.mjs", "tools/scripts/ci-close.mjs"]) {
    const command = read(file);
    assert.match(command, /git.*status.*--porcelain=v1/su);
    assert.match(command, /working tree is not clean/u);
    assert.match(command, /gh.*repo.*view/su);
    assert.match(command, /gh.*pr.*list/su);
    assert.match(command, /headRefOid/u);
    assert.match(command, /workflow.*run/su);
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
