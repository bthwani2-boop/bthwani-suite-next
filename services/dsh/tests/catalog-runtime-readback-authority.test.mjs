import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runtimeWorkflow = fs.readFileSync(
  new URL("../../../.github/workflows/ci-runtime.yml", import.meta.url),
  "utf8",
);
const runtimePhase = fs.readFileSync(
  new URL("../../../tools/scripts/invoke-runtime-phase.ps1", import.meta.url),
  "utf8",
);

test("runtime proof uses live central-catalog readback", () => {
  assert.match(runtimeWorkflow, /runtime:catalog-readback/);
  assert.match(runtimeWorkflow, /-Action catalog-readback/);
  assert.match(runtimePhase, /tools\/scripts\/verify-catalog\.ps1/);
  assert.match(runtimePhase, /Central catalog readback failed/);
});

test("runtime proof does not depend on the retired fixture bootstrap", () => {
  assert.doesNotMatch(runtimeWorkflow, /runtime:bootstrap-dev/);
  assert.doesNotMatch(runtimeWorkflow, /-Action bootstrap-dev/);
  assert.doesNotMatch(runtimePhase, /bootstrap-dev-data\.mjs/);
});
