import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("CI workflow separates semantic scope from verification depth", () => {
  const workflow = read(".github/workflows/ci.yml");
  assert.match(workflow, /CI_MODE="\$\{MODE\}"/u);
  assert.match(workflow, /CI_VERIFICATION_DEPTH="\$\{VERIFICATION_DEPTH\}"/u);
  assert.match(workflow, /full_scope == 'true'/u);
  assert.doesNotMatch(workflow, /if:.*full_verification == 'true'.*frontend/u);
  assert.match(read("tools/scripts/detect-ci-context.mjs"), /full_scope: fullScope/u);
});

test("workflow security and repository vulnerability scans have separate cadence inputs", () => {
  const policy = read(".github/workflows/ci-policy.yml");
  assert.match(policy, /workflow_security_policy:/u);
  assert.match(policy, /security_scan_policy:/u);
  assert.match(policy, /guard:workflow-security/u);
  assert.match(policy, /security_scan_policy == 'true'/u);
});

test("backend verification skips an empty development package cone", () => {
  const backend = read(".github/workflows/ci-backends.yml");
  assert.match(backend, /packages=none reason=no-package-in-semantic-cone/u);
  assert.equal(backend.includes('full_backend == "true" || "${#package_args[@]}" -eq 0'), false);
});

test("foundation and SDLC execution have one registered routing path", () => {
  const foundation = read("tools/scripts/run-foundation-gate.ps1");
  const sdlc = read("tools/guards/sdlc/Invoke-SdlcGate.ps1");
  assert.match(foundation, /detect-ci-context\.mjs/u);
  assert.doesNotMatch(foundation, /source-integrity-gate\.mjs|source-integrity-gate\.test\.mjs/u);
  assert.doesNotMatch(sdlc, /governance-schema-gate|agent-governance-gate|authority-separation-gate|guard-registry-gate/u);
  assert.match(read("governance/guards/guard-registry.json"), /"id":"source-integrity"/u);
});

test("OpenAPI materialization has no lifecycle-hook authority", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(Object.hasOwn(packageJson.scripts ?? {}, "postinstall"), false);
  assert.match(read("nx.json"), /target": "materialize"/u);
  assert.doesNotMatch(read(".github/actions/setup-node-workspace/action.yml"), /materialize_generated|postinstall/u);
});

test("affected jobs use shallow checkout plus exact commit hydration", () => {
  for (const workflow of [
    ".github/workflows/ci-node-diagnostics.yml",
    ".github/workflows/ci-node-verification.yml",
    ".github/workflows/ci-policy.yml",
    ".github/workflows/ci-backends.yml",
  ]) {
    const content = read(workflow);
    assert.match(content, /fetch-exact-commits/u, workflow);
    assert.match(content, /fetch-depth: 1/u, workflow);
  }
  assert.match(read(".github/actions/fetch-exact-commits/action.yml"), /git fetch --no-tags --depth=1/u);
  for (const workflow of [
    ".github/workflows/ci-node-diagnostics.yml",
    ".github/workflows/ci-policy.yml",
    ".github/workflows/manual-deep-verification.yml",
    ".github/workflows/sonarqube.yml",
  ]) {
    assert.match(read(workflow), /pnpm exec nx run contracts:materialize/u, workflow);
  }
});
