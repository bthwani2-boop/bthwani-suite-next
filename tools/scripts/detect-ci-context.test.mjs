import assert from "node:assert/strict";
import test from "node:test";

import { classifyFiles } from "./detect-ci-context.mjs";

test("routes governance-only changes without product checks", () => {
  const result = classifyFiles(["governance/authority/authority-precedence.json"]);
  assert.equal(result.governance, true);
  assert.equal(result.workflow, false);
  assert.equal(result.policy, true);
  assert.equal(result.frontend, false);
  assert.equal(result.dsh, false);
});

test("routes workflow changes to workflow security", () => {
  const result = classifyFiles([".github/workflows/ci.yml"]);
  assert.equal(result.workflow, true);
  assert.equal(result.policy, true);
  assert.equal(result.dsh, false);
  assert.equal(result.wlt, false);
});

test("treats shared DSH frontend changes as heavy cross-surface work", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/cart/cart-controller.ts"]);
  assert.equal(result.dsh, true);
  assert.equal(result.frontend, true);
  assert.equal(result.shared_brain, true);
  assert.equal(result.heavy, true);
  assert.equal(result.journey_scope, "PROJECT-WIDE");
});

test("detects JRN-040 targeted platform verification", () => {
  const result = classifyFiles([
    "core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml",
    "services/dsh/tsconfig.jrn-040.json"
  ]);
  assert.equal(result.platform, true);
  assert.equal(result.contracts, true);
  assert.equal(result.jrn040, true);
  assert.equal(result.journey_scope, "JRN-040");
});

test("supports an explicit journey for manual dispatch", () => {
  const result = classifyFiles([], { journey: "43" });
  assert.equal(result.journey, true);
  assert.equal(result.node, true);
  assert.equal(result.journey_scope, "JRN-043");
});

test("keeps an isolated app change lightweight", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.runtime, true);
  assert.equal(result.dsh, false);
  assert.equal(result.heavy, true);
});

test("full mode intentionally enables every verification domain", () => {
  const result = classifyFiles([], { mode: "full" });
  for (const key of ["governance", "workflow", "frontend", "contracts", "journey", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime", "heavy"]) {
    assert.equal(result[key], true, `${key} should be enabled`);
  }
  assert.equal(result.journey_scope, "PROJECT-WIDE");
});
