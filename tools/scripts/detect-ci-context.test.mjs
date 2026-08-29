import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiles, resolveFullScope } from "./detect-ci-context.mjs";

test("governance text does not widen executable verification", () => {
  const result = classifyFiles(["governance/policies/engineering.md"]);
  assert.equal(result.full_scope, false);
  assert.equal(result.node, false);
  assert.equal(result.backend, false);
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.required_jobs, []);
});

test("backend changes always require the matching backend worker", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.backend_required, true);
  assert.equal(result.runtime_required, false);
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.required_jobs, ["backends"]);
});

test("node-only changes do not require unrelated backends", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.node, true);
  assert.equal(result.backend_required, false);
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.required_jobs, ["node"]);
});

test("contract changes require diagnostics and node verification", () => {
  const result = classifyFiles(["contracts/customer.openapi.yaml"]);
  assert.equal(result.contracts, true);
  assert.equal(result.diagnostics_required, true);
  assert.equal(result.verification_required, true);
  assert.deepEqual(result.required_jobs, ["diagnostics", "node"]);
});

test("database changes route to the owning backend, database checks, and the runtime consumer", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.dsh, true);
  assert.equal(result.database_changed, true);
  assert.equal(result.backend_required, true);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, true);
  assert.deepEqual(result.risk_classes, ["schema_runtime"]);
  assert.deepEqual(result.required_jobs, ["backends", "runtime"]);
});

test("CI control-plane changes run node verification without semantic filename routing", () => {
  const result = classifyFiles([".github/workflows/ci-check.yml"]);
  assert.equal(result.ci_control_plane, true);
  assert.equal(result.node, true);
  assert.equal(result.human_review_required, true);
  assert.deepEqual(result.required_jobs, ["node"]);
});

test("CI control-plane changes do not require product Sonar analysis", () => {
  const result = classifyFiles([".github/workflows/master-sonar.yml"]);
  assert.equal(result.ci_control_plane, true);
  assert.equal(result.sonar_required, false);
});

test("product changes require Sonar analysis", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.sonar_required, true);
});

test("infrastructure changes require the fixed runtime verification", () => {
  const result = classifyFiles(["infra/docker/compose.runtime.yml"]);
  assert.equal(result.infrastructure, true);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.risk_classes, ["infrastructure"]);
  assert.deepEqual(result.required_jobs, ["runtime"]);
});

test("dependency manifests route to node integrity verification", () => {
  const result = classifyFiles(["services/dsh/backend/go.mod"]);
  assert.equal(result.dependency_changed, true);
  assert.equal(result.node, true);
  assert.equal(result.dsh, true);
  assert.deepEqual(result.required_jobs, ["node", "backends"]);
});

test("authorization and OperatorContext changes require runtime proof and human review", () => {
  const result = classifyFiles(["core/identity/backend/internal/rbac/roles.go"]);
  assert.equal(result.identity, true);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, true);
  assert.deepEqual(result.risk_classes, ["authorization", "identity_rbac"]);
  assert.deepEqual(result.required_jobs, ["backends", "runtime"]);
});

test("operator-context authority files require runtime proof", () => {
  const result = classifyFiles(["services/wlt/backend/internal/shared/operator_context.go"]);
  assert.equal(result.wlt, true);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, true);
  assert.ok(result.risk_classes.includes("authorization"));
});

test("idempotency and replay authority changes require runtime proof", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/orders/order-cancellation-attempt.ts"]);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, true);
  assert.ok(result.risk_classes.includes("idempotency"));
  assert.ok(result.risk_classes.includes("order_journey"));
});

test("order journey state machine changes require runtime proof", () => {
  const result = classifyFiles(["services/dsh/backend/internal/orders/transition.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.risk_classes, ["order_journey"]);
  assert.deepEqual(result.required_jobs, ["backends", "runtime"]);
});

test("WLT financial changes require backend, database, runtime proof, and human review", () => {
  const result = classifyFiles(["services/wlt/backend/internal/payout/payout.go"]);
  assert.equal(result.wlt, true);
  assert.equal(result.database_changed, false);
  assert.equal(result.runtime_required, true);
  assert.equal(result.human_review_required, true);
  assert.deepEqual(result.risk_classes, ["wlt_monetary"]);
  assert.deepEqual(result.required_jobs, ["backends", "runtime"]);
});

test("migration authority changes verify every service database and the runtime consumer", () => {
  const result = classifyFiles(["infra/docker/scripts/schema-migration-runner.ps1"]);
  assert.equal(result.migration_authority, true);
  assert.equal(result.human_review_required, true);
  for (const key of ["dsh", "wlt", "identity", "workforce", "platform", "providers"]) {
    assert.equal(result[key], true, key);
  }
  assert.equal(result.database_changed, true);
  assert.equal(result.runtime_required, true);
  assert.deepEqual(result.required_jobs, ["backends", "runtime"]);
});

test("identity authority changes require human review even outside explicit RBAC paths", () => {
  const result = classifyFiles(["core/identity/backend/internal/session/session.go"]);
  assert.equal(result.human_review_required, true);
});

test("fullScope enables every owner without manufacturing human review for unchanged bytes", () => {
  const result = classifyFiles([], { fullScope: true });
  for (const key of ["frontend", "contracts", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime_required", "node", "backend"]) {
    assert.equal(result[key], true, key);
  }
  assert.equal(result.human_review_required, false);
  assert.deepEqual(result.required_jobs, ["diagnostics", "node", "backends", "runtime"]);
});

test("CI_MODE=full enables full scope for reusable Sonar callers", () => {
  assert.equal(resolveFullScope({ fullScope: "false", mode: "full" }), true);
  assert.equal(resolveFullScope({ fullScope: "false", mode: "affected" }), false);
  assert.equal(classifyFiles([], { fullScope: resolveFullScope({ mode: "full" }) }).sonar_required, true);
});

test("router output has no legacy control-plane concepts", () => {
  const result = classifyFiles(["README.md"]);
  for (const key of ["verification_tier", "run_assurance", "runtime_profile", "journey_scope", "previous_head_sha", "financial_changed", "security_scan"]) {
    assert.equal(Object.hasOwn(result, key), false, key);
  }
});
