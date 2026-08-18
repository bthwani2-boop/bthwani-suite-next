import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiles } from "./detect-ci-context.mjs";

function assertNoGovernanceControlPlane(result) {
  for (const forbidden of ["governance", "policy", "governance_policy", "policy_required", "authority_change"]) {
    assert.equal(Object.hasOwn(result, forbidden), false, forbidden);
  }
}

test("governance text does not widen executable verification", () => {
  const result = classifyFiles(["governance/policies/engineering.md"]);
  assert.equal(result.full_scope, false);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.verification_required, false);
  assert.equal(result.backend_required, false);
  assert.equal(result.runtime_profile, "none");
  assert.deepEqual(result.foundation_guard_ids, ["source-integrity"]);
});

test("verification authority stays targeted during PR development", () => {
  const result = classifyFiles([".github/workflows/ci.yml"], { executionPhase: "pr" });
  assert.equal(result.full_scope, false);
  assert.equal(result.full_verification, false);
  assert.equal(result.workflow, true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.dsh, false);
  assert.equal(result.wlt, false);
  assert.equal(result.identity, false);
  assert.equal(result.backend_required, false);
  assert.equal(result.runtime_profile, "none");
  assert.equal(result.runtime_required, false);
});

test("verification authority forces full exact-candidate closure verification", () => {
  for (const executionPhase of ["closure", "master"]) {
    const result = classifyFiles([".github/workflows/ci.yml"], { executionPhase });
    assert.equal(result.full_scope, true, executionPhase);
    assert.equal(result.full_verification, true, executionPhase);
    assert.equal(result.dsh, true, executionPhase);
    assert.equal(result.wlt, true, executionPhase);
    assert.equal(result.identity, true, executionPhase);
    assert.equal(result.runtime_profile, "full", executionPhase);
    assert.equal(result.runtime_required, true, executionPhase);
    assert.deepEqual(result.required_jobs, ["diagnostics", "node", "backends", "runtime"], executionPhase);
  }
});

test("verification config itself follows the same phase gate", () => {
  const file = "tools/verification/verification-sets.json";
  assert.equal(classifyFiles([file], { executionPhase: "pr" }).full_scope, false);
  assert.equal(classifyFiles([file], { executionPhase: "closure" }).full_scope, true);
});

test("isolated app code remains fast", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.diagnostics, false);
  assert.equal(result.runtime_profile, "none");
  assert.deepEqual(result.foundation_guard_ids, [
    "source-integrity",
    "no-broken-imports",
    "runtime-config",
    "ui-kit-boundary",
  ]);
});

test("shared frontend code is standard without a second diagnostics job", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/cart/cart-controller.ts"]);
  assert.equal(result.shared_brain, true);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, false);
  assert.equal(result.verification_required, true);
});

test("contract changes own the diagnostics job", () => {
  const result = classifyFiles(["services/dsh/contracts/dsh.openapi.yaml"]);
  assert.equal(result.contracts, true);
  assert.equal(result.diagnostics, true);
  assert.equal(result.verification_required, true);
});

test("non-financial backend remains standard and affected", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.financial_changed, false);
  assert.equal(result.runtime_profile, "none");
  assert.equal(result.verification_tier, "standard");
  assert.deepEqual(result.foundation_guard_ids, [
    "source-integrity",
    "no-broken-imports",
    "runtime-config",
    "api-binding",
    "backend-api-binding",
  ]);
});

test("WLT financial code selects finance runtime profile", () => {
  const result = classifyFiles(["services/wlt/backend/internal/ledger/ledger.go"]);
  assert.equal(result.financial_changed, true);
  assert.equal(result.runtime_profile, "wlt-finance");
  assert.equal(result.verification_tier, "deep");
});

test("authorization scope contract requires identity security proof", () => {
  const result = classifyFiles(["tools/verification/security-scope-vocabulary.json"], { executionPhase: "pr" });
  assert.equal(result.rbac_changed, true);
  assert.equal(result.runtime_profile, "identity-security");
  assert.equal(result.runtime_required, true);
  assert.equal(result.verification_tier, "deep");
});

test("infrastructure is deep but PR runtime is not automatic", () => {
  const result = classifyFiles(["infra/docker/compose.runtime.yml"], { executionPhase: "pr" });
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_required, false);
});

test("migration changes are deep without unrelated runtime", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.migration_changed, true);
  assert.equal(result.database_changed, true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_profile, "none");
});

test("manual journey stays targeted", () => {
  const result = classifyFiles([], { journey: "platform-change-sets" });
  assert.equal(result.journey_scope, "PLATFORM-CHANGE-SETS");
  assert.equal(result.full_scope, false);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.verification_required, true);
});

test("explicit full mode enables all code domains", () => {
  const result = classifyFiles([], { mode: "full" });
  for (const key of ["frontend", "contracts", "journey", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime", "heavy", "diagnostics"]) {
    assert.equal(result[key], true, key);
  }
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.runtime_required, true);
  assert.equal(result.journey_scope, "PROJECT-WIDE");
});

test("explicit runtime proof runs runtime without widening code scope", () => {
  const result = classifyFiles([], { runtimeProof: "true" });
  assert.equal(result.full_scope, false);
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.runtime_required, true);
  assert.deepEqual(result.required_jobs, ["runtime"]);
});

test("router interface has no governance control-plane fields", () => {
  assertNoGovernanceControlPlane(classifyFiles(["README.md"]));
});
