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

test("OpenCodeReview uses dedicated Copilot authority and a trusted evaluator", () => {
  const workflow = read(".github/workflows/open-code-review.yml");
  assert.match(workflow, /COPILOT_GITHUB_TOKEN: \$\{\{ secrets\.COPILOT_GITHUB_TOKEN \}\}/u);
  assert.doesNotMatch(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}|copilot-requests:/u);
  assert.match(workflow, /EVALUATOR_SHA: \$\{\{ vars\.OCR_EVALUATOR_SHA \}\}/u);
  assert.match(workflow, /show "\$\{evaluator\}:tools\/scripts\/evaluate-opencodereview\.mjs"/u);
  assert.doesNotMatch(workflow, /show "\$\{HEAD_SHA\}:tools\/scripts\/evaluate-opencodereview\.mjs"/u);
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
