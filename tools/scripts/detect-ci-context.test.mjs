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
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, false);
});

test("routes workflow changes to workflow security without runtime", () => {
  const result = classifyFiles([".github/workflows/ci.yml"]);
  assert.equal(result.workflow, true);
  assert.equal(result.security, true);
  assert.equal(result.policy, true);
  assert.equal(result.dsh, false);
  assert.equal(result.wlt, false);
  assert.equal(result.runtime, false);
  assert.equal(result.verification_tier, "deep");
});

test("treats the contextual router itself as workflow policy", () => {
  const result = classifyFiles(["tools/scripts/detect-ci-context.mjs"]);
  assert.equal(result.workflow, true);
  assert.equal(result.security, true);
  assert.equal(result.policy, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes sovereign mobile tooling through policy frontend and runtime proof", () => {
  const result = classifyFiles([
    "tools/mobile/defineBthwaniExpoApp.js",
    "tools/scripts/guard-mobile-apps.mjs",
  ]);
  assert.equal(result.governance, true);
  assert.equal(result.policy, true);
  assert.equal(result.frontend, true);
  assert.equal(result.node, true);
  assert.equal(result.runtime, true);
  assert.equal(result.heavy, true);
  assert.equal(result.verification_tier, "deep");
  assert.equal(result.diagnostics, true);
  assert.equal(result.workflow, false);
});

test("routes runtime tooling changes to mandatory runtime proof", () => {
  for (const file of [
    "tools/scripts/invoke-runtime-phase.ps1",
    "tools/scripts/runtime/diagnose-dsh-smoke-auth-boundary.ps1",
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.runtime, true, `${file} must require runtime proof`);
    assert.equal(result.heavy, true, `${file} must require heavy verification`);
    assert.equal(result.verification_tier, "deep", `${file} must use deep verification`);
  }
});

test("routes infrastructure without product-wide verification", () => {
  const result = classifyFiles(["infra/docker/compose.runtime.yml"]);
  assert.equal(result.infrastructure, true);
  assert.equal(result.database, true);
  assert.equal(result.runtime, true);
  assert.equal(result.policy, true);
  assert.equal(result.frontend, false);
  assert.equal(result.verification_tier, "deep");
});

test("routes shared DSH frontend changes as standard cross-surface work without project-wide journey gates", () => {
  const result = classifyFiles(["services/dsh/frontend/shared/cart/cart-controller.ts"]);
  assert.equal(result.dsh, false);
  assert.equal(result.frontend, true);
  assert.equal(result.shared_brain, true);
  assert.equal(result.heavy, false);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
  assert.equal(result.journey, false);
  assert.equal(result.journey_scope, "");
});

test("routes internal non-financial DSH logic changes to standard Go verification only", () => {
  const result = classifyFiles(["services/dsh/backend/internal/cart/cart.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.contracts, false);
  assert.equal(result.node, false);
  assert.equal(result.frontend, false);
  assert.equal(result.wlt, false);
  assert.equal(result.financial_changed, false);
  assert.equal(result.runtime, false);
  assert.equal(result.heavy, false);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, false);
});

test("routes DSH HTTP surface changes to Go and contract parity", () => {
  const result = classifyFiles(["services/dsh/backend/internal/http/server.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.contracts, true);
  assert.equal(result.node, true);
  assert.equal(result.frontend, false);
  assert.equal(result.heavy, false);
  assert.equal(result.node_scope, "contracts");
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
});

test("routes DSH API composition changes to Go and contract parity", () => {
  const result = classifyFiles(["services/dsh/backend/cmd/dsh-api/main.go"]);
  assert.equal(result.dsh, true);
  assert.equal(result.contracts, true);
  assert.equal(result.node, true);
});

test("routes WLT HTTP surface changes to Go contract parity and runtime proof", () => {
  const result = classifyFiles(["services/wlt/backend/internal/http/server.go"]);
  assert.equal(result.wlt, true);
  assert.equal(result.contracts, true);
  assert.equal(result.node, true);
  assert.equal(result.dsh, false);
  assert.equal(result.financial_changed, true);
  assert.equal(result.runtime, true);
  assert.equal(result.heavy, true);
  assert.equal(result.verification_tier, "deep");
});

test("detects JRN-040 targeted platform verification", () => {
  const result = classifyFiles([
    "core/platform-control/contracts/jrn-040-platform-change-sets.openapi.yaml",
    "services/dsh/tsconfig.jrn-040.json"
  ]);
  assert.equal(result.platform, false);
  assert.equal(result.contracts, true);
  assert.equal(result.jrn040, true);
  assert.equal(result.journey_scope, "JRN-040");
});

test("supports an explicit journey for manual dispatch", () => {
  const result = classifyFiles([], { journey: "43" });
  assert.equal(result.journey, true);
  assert.equal(result.node, true);
  assert.equal(result.journey_scope, "JRN-043");
  assert.equal(result.verification_tier, "standard");
});

test("keeps an isolated app change on the fast verification tier", () => {
  const result = classifyFiles(["apps/app-client/runtime/src/App.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.runtime, false);
  assert.equal(result.dsh, false);
  assert.equal(result.heavy, false);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.diagnostics, false);
  assert.equal(result.journey, false);
});

test("keeps an isolated control-panel screen change on the fast verification tier", () => {
  const result = classifyFiles(["services/dsh/frontend/control-panel/catalogs/CatalogDashboardScreen.tsx"]);
  assert.equal(result.frontend, true);
  assert.equal(result.shared_brain, false);
  assert.equal(result.verification_tier, "fast");
  assert.equal(result.diagnostics, false);
  assert.equal(result.runtime, false);
});

test("full mode intentionally enables every verification domain", () => {
  const result = classifyFiles([], { mode: "full" });
  for (const key of ["governance", "workflow", "infrastructure", "security", "frontend", "contracts", "journey", "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime", "heavy", "diagnostics"]) {
    assert.equal(result[key], true, `${key} should be enabled`);
  }
  assert.equal(result.journey_scope, "PROJECT-WIDE");
  assert.equal(result.verification_tier, "deep");
});

test("routes progressive remediation contract and tooling changes separately", () => {
  const result = classifyFiles(["governance/remediation/gap-ledger.json"]);
  assert.equal(result.remediation_governance_changed, true);
  assert.equal(result.task_contract_changed, false);
  assert.equal(result.remediation_tooling_changed, false);
});

test("routes a task contract instance as task_contract_changed", () => {
  const result = classifyFiles(["governance/remediation/tasks/active/GAP-0099.json"]);
  assert.equal(result.task_contract_changed, true);
  assert.equal(result.remediation_governance_changed, true);
});

test("routes remediation tooling scripts separately from the governance contracts", () => {
  const result = classifyFiles(["tools/remediation/orchestrator/select-next-task.mjs"]);
  assert.equal(result.remediation_tooling_changed, true);
  assert.equal(result.remediation_governance_changed, false);
});

test("routes cleanup policy changes to cleanup_changed", () => {
  const result = classifyFiles(["governance/cleanup/repository-retention-policy.json"]);
  assert.equal(result.cleanup_changed, true);
});

test("routes mobile native surfaces to native_changed and deep verification", () => {
  const result = classifyFiles(["apps/app-client/runtime/android/app/build.gradle"]);
  assert.equal(result.native_changed, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes shared UI kit changes to visual_changed and standard verification", () => {
  const result = classifyFiles(["shared/ui-kit/src/Button.tsx"]);
  assert.equal(result.visual_changed, true);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
});

test("routes SaaS tenancy governance to tenant_isolation_changed", () => {
  const result = classifyFiles(["governance/saas/saas-governance.json"]);
  assert.equal(result.tenant_isolation_changed, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes WLT ledger changes to mandatory financial runtime proof", () => {
  const result = classifyFiles(["services/wlt/backend/internal/ledger/ledger.go"]);
  assert.equal(result.financial_changed, true);
  assert.equal(result.runtime, true);
  assert.equal(result.heavy, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes DSH financial outbox and finance surfaces to mandatory runtime proof", () => {
  for (const file of [
    "services/dsh/backend/internal/checkoutfinanceoutbox/outbox.go",
    "services/dsh/backend/internal/fieldcommissionoutbox/worker.go",
    "services/dsh/frontend/shared/finance-wlt-link/actor-wallet.ts",
    "services/dsh/frontend/control-panel/finance/RepresentativeWalletLookup.tsx",
  ]) {
    const result = classifyFiles([file]);
    assert.equal(result.financial_changed, true, `${file} must be financial`);
    assert.equal(result.runtime, true, `${file} must require runtime proof`);
    assert.equal(result.heavy, true, `${file} must require heavy verification`);
    assert.equal(result.verification_tier, "deep", `${file} must use deep verification`);
  }
});

test("routes migration files to migration_changed independent of the broader database flag", () => {
  const result = classifyFiles(["services/dsh/database/migrations/0002_add_column.sql"]);
  assert.equal(result.migration_changed, true);
  assert.equal(result.database, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes OpenAPI contract changes to shared_contract_changed", () => {
  const result = classifyFiles(["services/dsh/contracts/dsh.openapi.yaml"]);
  assert.equal(result.shared_contract_changed, true);
  assert.equal(result.verification_tier, "standard");
  assert.equal(result.diagnostics, true);
});

test("routes runbook and recovery-named paths to recovery_changed", () => {
  const result = classifyFiles(["governance/runbooks/jrn-011-order-truth-operations.md"]);
  assert.equal(result.recovery_changed, true);
  assert.equal(result.verification_tier, "deep");
});

test("routes observability tooling to observability_changed", () => {
  const result = classifyFiles(["tools/observability/otel-node-smoke.mjs"]);
  assert.equal(result.observability_changed, true);
});

test("exposes the complete set of classification output keys", () => {
  const result = classifyFiles(["README.md"]);
  const expectedKeys = [
    "changed_count", "governance", "workflow", "infrastructure", "security", "policy",
    "frontend", "contracts", "journey", "journey_scope", "node", "node_scope",
    "dsh", "wlt", "identity", "workforce", "platform", "providers", "database", "runtime",
    "shared_brain", "heavy", "verification_tier", "diagnostics", "jrn040", "platform_change_sets",
    "task_contract_changed", "cleanup_changed", "native_changed", "visual_changed",
    "tenant_isolation_changed", "financial_changed", "migration_changed",
    "shared_contract_changed", "recovery_changed", "observability_changed",
    "remediation_governance_changed", "remediation_tooling_changed",
  ];
  for (const key of expectedKeys) {
    assert.ok(key in result, `missing output key: ${key}`);
  }
  assert.equal(Object.keys(result).length, expectedKeys.length, "unexpected extra or missing output keys");
});
