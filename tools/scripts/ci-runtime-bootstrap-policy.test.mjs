import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci-runtime.yml"), "utf8");

test("DSH runtime profiles bootstrap exactly once before catalog readback and smoke", () => {
  const bootstrap = workflow.indexOf('Invoke-Phase "runtime:bootstrap-dev"');
  const readback = workflow.indexOf('Invoke-Phase "runtime:catalog-readback"');
  const smoke = workflow.indexOf('Invoke-Phase "runtime:smoke"');
  assert.ok(bootstrap > 0, "DSH bootstrap phase is missing");
  assert.match(workflow, /-Action bootstrap-dev -Profiles \$profiles -Force/);
  assert.equal(workflow.match(/Invoke-Phase "runtime:bootstrap-dev"/g)?.length, 1);
  assert.ok(readback > bootstrap, "catalog readback must follow bootstrap");
  assert.ok(smoke > readback, "smoke must follow catalog readback");
});

test("identity-security includes WLT because local Workforce provisioning prepares captain standing", () => {
  assert.match(workflow, /"identity-security"\s*\{\s*"identity,workforce,dsh,wlt,media"\s*\}/g);
});

test("profiles without DSH retain the non-mutating up path", () => {
  assert.match(workflow, /if \(\$requiresDshBootstrap\)[\s\S]*?else \{[\s\S]*?Invoke-Phase "runtime:up"/);
  assert.match(workflow, /-Action up -Profiles \$profiles/);
});
