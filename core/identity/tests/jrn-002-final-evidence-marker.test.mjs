import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("JRN-002 final marker binds FS-01..FS-18 to all permanent same-commit gates", async () => {
  const [closure, slicesWorkflow, runtimeWorkflow, targetedWorkflow] = await Promise.all([
    read("governance/evidence/JRN-002_IDENTITY_ACTIVATION_SESSIONS_CLOSURE.md"),
    read(".github/workflows/jrn-002-fullstack-slices.yml"),
    read(".github/workflows/jrn-002-identity-runtime.yml"),
    read(".github/workflows/jrn-001-010-sambassam-verify.yml"),
  ]);

  assert.match(closure, /FS-01\.\.FS-18 COMPLETE/);
  assert.match(closure, /Known implementation gaps[\s\S]*`none`/);
  assert.match(closure, /jrn-002-final-evidence-marker\.test\.mjs/);

  assert.match(slicesWorkflow, /journeys\/jrn-002\/fullstack-slices/);
  assert.match(runtimeWorkflow, /journeys\/jrn-002\/runtime-proof/);
  assert.match(targetedWorkflow, /journeys\/jrn-001-010\/targeted-verification/);

  for (let slice = 1; slice <= 18; slice += 1) {
    assert.match(closure, new RegExp(`FS-${String(slice).padStart(2, "0")}`));
  }
});
