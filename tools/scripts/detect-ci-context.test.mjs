import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiles } from "./detect-ci-context.mjs";

test("governance-only changes stay standard and avoid product checks", () => {
  const result = classifyFiles(["governance/authority/authority-precedence.json"]);
  assert.equal(result.governance_policy, true);
  assert.equal(result.workflow_policy, false);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.runtime_profile, "none");
  assert.deepEqual(result.foundation_guard_ids, [
    "source-integrity",
    "governance-schema",
    "agent-governance",
    "authority-separation",
    "sdlc",
    "cleanup-policy",
    "guard-registry",
  ]);
});

test("guard implementation changes use only code-integrity foundation guards", () => {
  const result = classifyFiles(["tools/guards/runtime-config-gate.mjs"]);
  assert.deepEqual(result.foundation_guard_ids, [
    "source-integrity",
    "guard-registry",
    "required-command-integrity",
    "no-broken-imports",
  ]);
  assert.equal(result.foundation_guard_ids.includes("ui-kit-boundary"), false);
  assert.equal(result.foundation_guard_ids.includes("backend-api-binding"), false);
});

test("guard directory names do not widen product risk scope", () => {
  const result = classifyFiles([
    "tools/guards/finance/obsolete-gate.mjs",
    "tools/guards/privacy/obsolete-gate.mjs",
  ]);
  assert.equal(result.financial_changed, false);
  assert.equal(result.privacy_changed, false);
  assert.equal(result.security_scan_policy, false);
  assert.equal(result.runtime_profile, "none");
  assert.equal(result.verification_tier, "standard");
});

test("workflow changes are deep security policy without runtime", () => {
  const result = classifyFiles([".github/workflows/ci.yml"]);
  assert.equal(result.full_scope, false);
  assert.equal(result.workflow_policy, true);
  assert.equal(result.security_policy, true);
  assert.equal(result.workflow_security_policy, true);
  assert.equal(result.security_scan_policy, false);
  assert.equal(result.dsh, false);
  assert.equal(result.wlt, false);
  assert.equal(result.identity, false);
  assert.equal(result.foundation_guard_ids.includes("source-integrity"), true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_profile, "none");
});

test("verification depth does not widen semantic scope", () => {
  const result = classifyFiles([".github/workflows/ci.yml"], { verificationDepth: "full" });
  assert.equal(result.full_scope, false);
  assert.equal(result.verification_depth, "full");
  assert.equal(result.dsh, false);
  assert.equal(result.frontend, false);
  assert.equal(result.contracts, false);
  assert.deepEqual(result.foundation_guard_ids, [
    "source-integrity",
    "required-command-integrity",
    "no-broken-imports",
  ]);
});

test("isolated app code remains fast", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.diagnostics, false);
  assert.equal(result.runtime_profile, "none");
});

test("shared frontend code is standard and requires diagnostics", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/cart/cart-controller.ts"]);
  assert.equal(result.shared_brain, true);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
  assert.equal(result.journey, false);
});

test("non-financial DSH backend remains standard Go verification", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.financial_changed, false);
  assert.equal(result.runtime_profile, "none");
  assert.equal(result.verification_tier, "standard");
});

test("WLT financial code uses finance runtime profile", () => {
  const result = classifyFiles(["services/wlt/backend/internal/ledger/ledger.go"]);
  assert.equal(result.financial_changed, true);
  assert.equal(result.runtime_profile, "wlt-finance");
  assert.equal(result.verification_tier, "deep");
});

test("identity authentication code is deep and uses identity security runtime", () => {
  const result = classifyFiles(["core/identity/backend/internal/auth/token_issuer.go"]);
  assert.equal(result.auth_changed, true);
  assert.equal(result.security_policy, true);
  assert.equal(result.workflow_security_policy, false);
  assert.equal(result.security_scan_policy, true);
  assert.equal(result.runtime_profile, "identity-security");
  assert.equal(result.verification_tier, "deep");
});

test("session revocation code is deep", () => {
  const result = classifyFiles(["core/identity/backend/internal/sessions/revocation.go"]);
  assert.equal(result.session_changed, true);
  assert.equal(result.verification_tier, "deep");
});

test("RBAC and permissions code is deep", () => {
  for (const file of [
    "core/identity/backend/internal/rbac/policy.go",
    "core/identity/backend/internal/permissions/store.go",
    "core/identity/backend/internal/authorization/check.go"
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.rbac_changed, true, file);
    assert.equal(result.verification_tier, "deep", file);
  }
});

test("PII and privacy code is deep", () => {
  const result = classifyFiles(["core/workforce/backend/internal/pii/national-id.go"]);
  assert.equal(result.pii_changed, true);
  assert.equal(result.security_policy, true);
  assert.equal(result.verification_tier, "deep");
});

test("OperatorContext context changes are deep", () => {
  const result = classifyFiles(["services/dsh/backend/internal/OperatorContext-context/context.go"]);
  assert.equal(result.OperatorContext_context_changed, true);
  assert.equal(result.OperatorContext_isolation_changed, true);
  assert.equal(result.runtime_profile, "identity-security");
  assert.equal(result.verification_tier, "deep");
});

test("mobile tooling uses mobile config runtime profile", () => {
  const result = classifyFiles(["tools/mobile/defineBthwaniExpoApp.js"]);
  assert.equal(result.runtime_profile, "mobile-config");
  assert.equal(result.verification_tier, "deep");
});

test("native mobile changes use mobile native runtime profile", () => {
  const result = classifyFiles(["apps/app-field/runtime/android/app/build.gradle"]);
  assert.equal(result.native_changed, true);
  assert.equal(result.mobile, true);
  assert.equal(result.runtime_profile, "mobile-native");
  assert.equal(result.verification_tier, "deep");
});

test("mobile transport authority changes require deep security and live identity-workforce-dsh runtime", () => {
  for (const file of [
    "apps/mobile/start-mobile-runtime.ps1",
    "apps/mobile/mobile-lan.ps1",
    "tools/dev/mobile-dev-gateway.mjs",
    "tools/scripts/verify-mobile-lan-runtime.ps1",
    "services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts",
    "services/dsh/frontend/shared/session/dev-session-broker.adapter.ts",
    "services/dsh/frontend/shared/media/presigned-upload.client.ts",
    "services/dsh/frontend/shared/catalog/catalog-binary-upload.adapter.ts",
    "core/identity/clients/identity-api-config.ts",
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.frontend, true, file);
    assert.equal(result.security_policy, true, file);
    assert.equal(result.runtime, true, file);
    assert.equal(result.runtime_profile, "identity-security", file);
    assert.equal(result.verification_tier, "deep", file);
    assert.equal(result.diagnostics, true, file);
  }
});

test("infrastructure and runtime tooling use full runtime", () => {
  for (const file of ["infra/docker/compose.runtime.yml", "tools/scripts/runtime/smoke.ps1"]) {
    const result = classifyFiles([file]);
    assert.equal(result.runtime_profile, "full", file);
    assert.equal(result.verification_tier, "deep", file);
    assert.equal(result.runtime_required, false, file);
  }
});

test("migration changes are deep without forcing runtime unless another reason exists", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.migration_changed, true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.runtime_profile, "none");
});

test("materialization input changes are routed explicitly", () => {
  const lockfile = classifyFiles(["pnpm-lock.yaml"]);
  assert.equal(lockfile.materialization_inputs_changed, true);
  assert.equal(lockfile.contracts, true);

  const packageManifest = classifyFiles(["package.json"]);
  assert.equal(packageManifest.materialization_inputs_changed, false);
});

test("manual journey is targeted standard verification", () => {
  const result = classifyFiles([], { journey: "platform-change-sets" });
  assert.equal(result.journey_scope, "PLATFORM-CHANGE-SETS");
  assert.equal(result.verification_tier, "standard");
});

test("full mode enables every domain and full runtime", () => {
  const result = classifyFiles([], { mode: "full" });
  for (const key of ["governance", "workflow", "infrastructure", "security", "frontend", "contracts", "journey", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime", "heavy", "diagnostics"]) {
    assert.equal(result[key], true, key);
  }
  assert.equal(result.runtime_profile, "full");
  assert.equal(result.mobile, true);
  assert.equal(result.journey_scope, "PROJECT-WIDE");
});

test("runtime is required only at closure or master phases", () => {
  const files = ["infra/docker/compose.runtime.yml"];
  assert.equal(classifyFiles(files, { executionPhase: "pr" }).runtime_required, false);
  assert.equal(classifyFiles(files, { executionPhase: "closure" }).runtime_required, true);
  assert.equal(classifyFiles(files, { executionPhase: "master" }).runtime_required, true);
});

test("classification exports every required routing key", () => {
  const result = classifyFiles(["README.md"]);
  const expected = [
    "changed_count", "full_scope", "verification_depth", "foundation_guard_ids", "governance", "workflow", "infrastructure", "security", "policy",
    "governance_policy", "workflow_policy", "workflow_security_policy", "security_scan_policy", "security_policy", "infrastructure_policy", "nomenclature_required",
    "frontend", "contracts", "materialization_inputs_changed", "journey", "journey_scope", "node", "node_scope",
    "dsh", "wlt", "identity", "workforce", "platform", "providers", "database",
    "runtime", "runtime_required", "runtime_profile", "mobile", "database_changed", "contracts_changed", "shared_brain", "heavy", "verification_tier", "diagnostics",
    "platform_change_sets", "cleanup_changed", "native_changed", "visual_changed",
    "OperatorContext_isolation_changed", "financial_changed", "migration_changed", "shared_contract_changed",
    "recovery_changed", "observability_changed", "auth_changed", "session_changed", "rbac_changed",
    "privacy_changed", "pii_changed", "secrets_changed", "OperatorContext_context_changed"
  ];
  assert.deepEqual(Object.keys(result).sort(), expected.sort());
});
