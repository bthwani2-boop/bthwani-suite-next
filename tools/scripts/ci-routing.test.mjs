import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

test("CI is code-only and has no governance policy bundle", () => {
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

test("router exports code verification scope without governance control-plane fields", () => {
  const router = read("tools/scripts/detect-ci-context.mjs");
  assert.match(router, /foundation_guard_ids:/u);
  assert.match(router, /verification_required:/u);
  assert.match(router, /backend_required:/u);
  assert.match(router, /runtime_required:/u);
  assert.doesNotMatch(router, /governance_policy|policy_required|agent-governance|guard-registry|required-command-integrity|\bsdlc\b/u);
});

test("foundation routing has one code-only selector path", () => {
  const foundation = read("tools/scripts/run-foundation-gate.ps1");
  assert.match(foundation, /detect-ci-context\.mjs/u);
  assert.match(foundation, /registeredFoundationSet\.Contains/u);
  assert.doesNotMatch(foundation, /governance-schema|agent-governance|authority-separation|guard-registry|required-command-integrity|\bsdlc\b/u);
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

test("package verification entrypoints contain no governance tail", () => {
  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts ?? {};
  assert.equal(scripts["verify:full"], "pnpm run workspace:verify");
  for (const key of Object.keys(scripts)) {
    assert.doesNotMatch(key, /^guard:(?:governance|sdlc|guard-registry|required-command-integrity|agent-governance|authority-separation|tools-v5)/u);
  }
});
