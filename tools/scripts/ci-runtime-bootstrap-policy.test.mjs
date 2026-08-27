import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci-runtime.yml"), "utf8");
const contextualWorkflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
const runtimeAuthority = fs.readFileSync(path.join(repoRoot, "infra/docker/scripts/runtime.ps1"), "utf8");

test("runtime verification uses one fixed full component set in the correct order", () => {
  assert.match(workflow, /RUNTIME_COMPONENTS: identity,workforce,dsh,wlt,providers,platform,financial-simulators,mail,media-storage/u);
  const bootstrap = workflow.indexOf("-Action bootstrap-dev");
  const readback = workflow.indexOf("-Action catalog-readback");
  const smoke = workflow.indexOf("-Action smoke");
  assert.ok(bootstrap >= 0, "bootstrap phase is missing");
  assert.ok(readback > bootstrap, "catalog readback must follow bootstrap");
  assert.ok(smoke > readback, "smoke must follow catalog readback");
});

test("runtime worker has no profile matrix or assurance switch", () => {
  for (const legacy of ["runtime_profile", "RUNTIME_PROFILE", "run_assurance", "journey", "verification_tier"]) {
    assert.equal(workflow.includes(legacy), false, legacy);
  }
  assert.match(workflow, /candidate_sha: \{type: string, required: true\}/u);
});

test("CI invokes runtime only from the canonical runtime_required owner decision", () => {
  assert.match(contextualWorkflow, /runtime_required == 'true'/u);
  assert.match(contextualWorkflow, /uses: \.\/\.github\/workflows\/ci-runtime\.yml/u);
  assert.doesNotMatch(contextualWorkflow, /run_assurance|runtime_profile|verification_tier/u);
});

test("runtime authority retains the unavailable local media safety guard", () => {
  assert.match(runtimeAuthority, /services\/dsh\/database\/seeds\/media\/local-media\.manifest\.json/u);
  assert.match(runtimeAuthority, /Use media-storage for MinIO\/runtime upload infrastructure/u);
});
