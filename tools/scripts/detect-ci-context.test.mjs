import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiles } from "./detect-ci-context.mjs";

const FORBIDDEN_META_GUARDS = new Set([
  "governance-schema",
  "agent-governance",
  "authority-separation",
  "guard-registry",
  "sdlc",
  "required-command-integrity",
  "tool-catalog-coverage",
  "toolchain-activation",
  "oss-toolchain-policy",
]);

function assertCodeOnlyFoundation(result) {
  for (const id of result.foundation_guard_ids) {
    assert.equal(FORBIDDEN_META_GUARDS.has(id), false, `meta-governance guard leaked into routing: ${id}`);
  }
}

test("governance-only changes do not widen code verification", () => {
  const result = classifyFiles(["governance/authority/authority-precedence.json"]);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.runtime_profile, "none");
  assert.equal(result.frontend, false);
  assert.equal(result.contracts, false);
  assert.equal(result.backend_required, false);
  assert.equal(result.verification_required, false);
  assert.deepEqual(result.foundation_guard_ids, ["source-integrity"]);
  assertCodeOnlyFoundation(result);
});

test("guard implementation changes use code-integrity checks only", () => {
  const result = classifyFiles(["tools/guards/runtime-config-gate.mjs"]);
  assert.deepEqual(result.foundation_guard_ids, ["source-integrity", "no-broken-imports"]);
  assertCodeOnlyFoundation(result);
});

test("verification authority changes force full code verification", () => {
  const result = classifyFiles([".github/workflows/ci.yml"]);
  assert.equal(result.full_scope, true);
  assert.equal(result.full_verification, true);
  assert.equal(result.workflow, true);
  assert.equal(result.security, true);
  assert.equal(result.dsh, true);
  assert.equal(result.wlt, true);
  assert.equal(result.identity, true);
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.runtime_required, true);
  assert.deepEqual(result.required_jobs, ["diagnostics", "node", "backends", "runtime"]);
  assert.deepEqual(result.verification_requirement, {
    scope: "all",
    depth: "full",
    runtime_required: true,
    required_jobs: ["diagnostics", "node", "backends", "runtime"],
    reason: "verification-authority-change",
  });
  assertCodeOnlyFoundation(result);
});

test("verification depth alone does not widen semantic scope", () => {
  const result = classifyFiles(["README.md"], { verificationDepth: "full" });
  assert.equal(result.full_scope, false);
  assert.equal(result.full_verification, true);
  assert.equal(result.dsh, false);
  assert.equal(result.frontend, false);
  assert.equal(result.contracts, false);
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

test("shared frontend code is standard and diagnostic", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/cart/cart-controller.ts"]);
  assert.equal(result.shared_brain, true);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
  assert.equal(result.journey, false);
});

test("non-financial DSH backend remains standard", () => {
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

test("WLT financial code uses finance runtime profile", () => {
  const result = classifyFiles(["services/wlt/backend/internal/ledger/ledger.go"]);
  assert.equal(result.financial_changed, true);
  assert.equal(result.runtime_profile, "wlt-finance");
  assert.equal(result.verification_tier, "deep");
});

test("identity authentication code is deep and requires identity runtime proof", () => {
  const result = classifyFiles(["core/identity/backend/internal/auth/token_issuer.go"]);
  assert.equal(result.auth_changed, true);
  assert.equal(result.security, true);
  assert.equal(result.security_scan, true);
  assert.equal(result.runtime_profile, "identity-security");
  assert.equal(result.runtime_required, true);
  assert.equal(result.verification_tier, "deep");
});

test("authorization model changes require runtime proof", () => {
  for (const file of [
    "governance/contracts/scope-vocabulary.json",
    "services/dsh/frontend/shared/session/control-panel-permissions.ts",
    "core/identity/backend/internal/identity/employee_access.go",
  ]) {
    const result = classifyFiles([file], { executionPhase: "pr" });
    assert.equal(result.rbac_changed, true, file);
    assert.equal(result.runtime_profile, "identity-security", file);
    assert.equal(result.runtime_required, true, file);
    assert.equal(result.verification_tier, "deep", file);
  }
});

test("mobile transport changes require deep identity runtime", () => {
  for (const file of [
    "apps/mobile/start-mobile-runtime.ps1",
    "tools/dev/mobile-dev-gateway.mjs",
    "services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts",
    "core/identity/clients/identity-api-config.ts",
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.frontend, true, file);
    assert.equal(result.security, true, file);
    assert.equal(result.runtime_profile, "identity-security", file);
    assert.equal(result.verification_tier, "deep", file);
  }
});

test("infrastructure uses full runtime profile without forcing PR runtime", () => {
  const result = classifyFiles(["infra/docker/compose.runtime.yml"]);
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_required, false);
});

test("migration changes are deep without unrelated runtime", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.migration_changed, true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_profile, "none");
});

test("manual journey is targeted standard verification", () => {
  const result = classifyFiles([], { journey: "platform-change-sets" });
  assert.equal(result.journey_scope, "PLATFORM-CHANGE-SETS");
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.verification_required, true);
});

test("full mode enables all code domains and full runtime", () => {
  const result = classifyFiles([], { mode: "full" });
  for (const key of ["workflow", "infrastructure", "security", "frontend", "contracts", "journey", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime", "heavy", "diagnostics"]) {
    assert.equal(result[key], true, key);
  }
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.runtime_required, true);
  assert.equal(result.mobile, true);
  assert.equal(result.journey_scope, "PROJECT-WIDE");
  assertCodeOnlyFoundation(result);
});

test("runtime is required at closure/master but not ordinary infrastructure PR", () => {
  const files = ["infra/docker/compose.runtime.yml"];
  assert.equal(classifyFiles(files, { executionPhase: "pr" }).runtime_required, false);
  assert.equal(classifyFiles(files, { executionPhase: "closure" }).runtime_required, true);
  assert.equal(classifyFiles(files, { executionPhase: "master" }).runtime_required, true);
});

test("explicit runtime proof becomes the only required job when no code scope is selected", () => {
  const result = classifyFiles([], { runtimeProof: "true" });
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.runtime_required, true);
  assert.deepEqual(result.required_jobs, ["runtime"]);
});

test("router interface contains no governance control-plane fields", () => {
  const result = classifyFiles(["README.md"]);
  for (const forbidden of ["governance", "policy", "governance_policy", "policy_required", "authority_change"]) {
    assert.equal(Object.hasOwn(result, forbidden), false, forbidden);
  }
  assertCodeOnlyFoundation(result);
});
