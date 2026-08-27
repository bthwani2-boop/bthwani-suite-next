import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

test("the canonical check controller is manual and has no PR event trigger", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /workflow_call:/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.doesNotMatch(workflow, /pull_request:/u);
  assert.match(workflow, /Resolve exact live candidate and affected scope/u);
  assert.match(workflow, /git merge-base --is-ancestor/u);
  assert.match(workflow, /cancel-in-progress: true/u);
  assert.match(workflow, /group: bthwani-ci-\$\{\{ inputs\.target_kind \|\| 'branch' \}\}/u);
  for (const legacy of ["run_assurance", "verification_tier", "runtime_profile", "previous_head_sha", "incremental-run-history", "github.event.before"]) {
    assert.equal(workflow.includes(legacy), false, legacy);
  }
});

test("the affected router is based on the exact current Base-to-Head diff", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /\["diff", "--name-only"/u);
  assert.match(router, /baseSha, headSha/u);
  assert.doesNotMatch(router, /previous|run.?history|semantic|financial|security_scan/u);
});

test("backend changes cannot become green by skipping backend verification", () => {
  const workflow = read(".github/workflows/ci.yml");
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
    assert.match(command, /gh.*repo.*view/su);
    assert.match(command, /gh.*pr.*list/su);
    assert.match(command, /headRefOid/u);
    assert.match(command, /workflow.*run/su);
    assert.doesNotMatch(command, /sleep|poll|previous/u);
  }
});

test("analyzer workers are reusable only and no workflow-run orchestration exists", () => {
  const workflowDir = path.join(repoRoot, ".github/workflows");
  for (const filename of fs.readdirSync(workflowDir)) {
    const content = fs.readFileSync(path.join(workflowDir, filename), "utf8");
    assert.doesNotMatch(content, /workflow_run:|repository_dispatch|actions\/workflows\//u, filename);
    if (["sonarqube.yml", "codeql.yml", "semgrep.yml", "security-remote.yml", "dependency-review.yml", "lockfile-integrity.yml", "docker-runtime-hardening.yml", "open-code-review.yml"].includes(filename)) {
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
