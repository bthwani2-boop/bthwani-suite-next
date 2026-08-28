import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiles } from "./detect-ci-context.mjs";

test("governance text does not widen executable verification", () => {
  const result = classifyFiles(["governance/policies/engineering.md"]);
  assert.equal(result.full_scope, false);
  assert.equal(result.node, false);
  assert.equal(result.backend, false);
  assert.deepEqual(result.required_jobs, []);
});

test("backend changes always require the matching backend worker", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.backend_required, true);
  assert.deepEqual(result.required_jobs, ["backends"]);
});

test("node-only changes do not require unrelated backends", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.node, true);
  assert.equal(result.backend_required, false);
  assert.deepEqual(result.required_jobs, ["node"]);
});

test("contract changes require diagnostics and node verification", () => {
  const result = classifyFiles(["contracts/customer.openapi.yaml"]);
  assert.equal(result.contracts, true);
  assert.equal(result.diagnostics_required, true);
  assert.equal(result.verification_required, true);
  assert.deepEqual(result.required_jobs, ["diagnostics", "node"]);
});

test("database changes route to the owning backend and database checks", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.dsh, true);
  assert.equal(result.database_changed, true);
  assert.equal(result.backend_required, true);
  assert.deepEqual(result.required_jobs, ["backends"]);
});

test("CI control-plane changes run node verification without semantic filename routing", () => {
  const result = classifyFiles([".github/workflows/ci-check.yml"]);
  assert.equal(result.ci_control_plane, true);
  assert.equal(result.node, true);
  assert.deepEqual(result.required_jobs, ["node"]);
});

test("infrastructure changes require the fixed runtime verification", () => {
  const result = classifyFiles(["infra/docker/compose.runtime.yml"]);
  assert.equal(result.infrastructure, true);
  assert.equal(result.runtime_required, true);
  assert.deepEqual(result.required_jobs, ["runtime"]);
});

test("dependency manifests route to node integrity verification", () => {
  const result = classifyFiles(["services/dsh/backend/go.mod"]);
  assert.equal(result.dependency_changed, true);
  assert.equal(result.node, true);
  assert.equal(result.dsh, true);
  assert.deepEqual(result.required_jobs, ["node", "backends"]);
});

test("fullScope enables every owner without adding a tier or profile", () => {
  const result = classifyFiles([], { fullScope: true });
  for (const key of ["frontend", "contracts", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime_required", "node", "backend"]) {
    assert.equal(result[key], true, key);
  }
  assert.deepEqual(result.required_jobs, ["diagnostics", "node", "backends", "runtime"]);
});

test("router output has no legacy control-plane concepts", () => {
  const result = classifyFiles(["README.md"]);
  for (const key of ["verification_tier", "run_assurance", "runtime_profile", "journey_scope", "previous_head_sha", "financial_changed", "security_scan"]) {
    assert.equal(Object.hasOwn(result, key), false, key);
  }
});
