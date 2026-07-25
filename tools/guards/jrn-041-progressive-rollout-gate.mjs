import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const contains = (path, fragment, message) => {
  assert.ok(read(path).includes(fragment), `${message}: ${path}`);
};
const excludes = (path, fragment, message) => {
  assert.ok(!read(path).includes(fragment), `${message}: ${path}`);
};

const productPath = "governance/product/contracts/jrn-041-progressive-rollout-rollback.product-truth.json";
const product = JSON.parse(read(productPath));
assert.equal(product.capabilityId, "JRN_041_PROGRESSIVE_ROLLOUT_ROLLBACK");
assert.equal(product.acceptance.runtimeEvidenceRequired, true);
assert.equal(product.acceptance.visualEvidenceRequired, true);
assert.ok(product.acceptance.criteria.some((criterion) => criterion.includes("Resume changes only paused to running")));
assert.ok(product.invariants.negative.some((invariant) => invariant.includes("No advance occurs from paused")));
assert.equal(product.owners.productAcceptanceDecision, "PENDING");

const servicePath = "core/platform-control/backend/internal/platformcontrol/rollout_service.go";
contains(servicePath, "rollout.Status != RolloutRunning", "advance must require running state");
contains(servicePath, "rollout.Status != RolloutPaused", "resume must require paused state");
contains(servicePath, "evaluateAndAuditRolloutHealth", "advance and resume must share the health gate");
contains(servicePath, "RecordRolloutHealthGateFailure", "health gate failures must be persisted");

const governancePath = "core/platform-control/backend/internal/platformcontrol/jrn041_rollout_governance.go";
contains(governancePath, "validateRolloutTargetScope", "target scope must be governed");
contains(governancePath, "rollout_resumed", "resume must be audited");
contains(governancePath, "rollout_health_gate_blocked", "blocked health must be audited");
contains(governancePath, "paused_at = NULL", "resume must clear active pause state");
contains(governancePath, "currentPercentage", "recovery must expose the persisted percentage");
contains(governancePath, "RollbackPlan", "recovery must include the approved rollback plan");

const serverPath = "core/platform-control/backend/internal/http/server.go";
contains(serverPath, 'GET /platform/v1/rollouts/{id}/recovery', "recovery route must be registered");
contains(serverPath, 'POST /platform/v1/rollouts/{id}/resume', "resume route must be registered");
contains(serverPath, 'operatorOnly("platform:rollouts:manage"', "mutations must require rollout manage permission");

const migrationPath = "core/platform-control/database/migrations/platform-004_jrn041_rollout_governance.sql";
contains(migrationPath, "platform_rollout_target_scope_governed", "database must enforce target scope");
contains(migrationPath, "platform_rollout_health_gate_governed", "database must enforce health gate shape");
contains(migrationPath, "platform_rollout_terminal_state_consistency", "database must enforce lifecycle consistency");
excludes(migrationPath, "SELECT 1", "check constraints must not contain PostgreSQL-forbidden subqueries");

const contractPath = "core/platform-control/contracts/jrn-041-progressive-rollout.openapi.yaml";
for (const operationId of [
  "createPlatformRollout",
  "advancePlatformRollout",
  "pausePlatformRollout",
  "resumePlatformRollout",
  "abortPlatformRollout",
  "rollbackPlatformRollout",
  "getPlatformRolloutRecovery",
]) {
  contains(contractPath, `operationId: ${operationId}`, `missing JRN-041 operation ${operationId}`);
}
contains(contractPath, "additionalProperties: false", "target and health inputs must reject arbitrary fields");

const apiPath = "services/dsh/frontend/shared/platform/platform-control.api.ts";
contains(apiPath, "resumePlatformRollout", "shared client must bind resume");
contains(apiPath, "fetchPlatformRolloutRecovery", "shared client must bind recovery");
contains(apiPath, 'transition: "advance" | "pause" | "resume" | "abort" | "rollback"', "shared transition union must include resume");

const controllerPath = "services/dsh/frontend/shared/platform/use-platform-rollout-controller.tsx";
contains(controllerPath, "rollout_resume", "controller must expose resume mutation state");
contains(controllerPath, "resumePlatformRollout", "controller must call canonical resume route");

const panelPath = "services/dsh/frontend/control-panel/platform/PlatformRolloutPanel.tsx";
contains(panelPath, "PLATFORM_ROLLOUT_TARGET_SCOPE_INVALID", "control panel must reject invalid target scope");
contains(panelPath, "استئناف دون تغيير النسبة", "control panel must distinguish resume from advance");
contains(panelPath, "fetchPlatformRolloutRecovery", "control panel must expose recovery guidance");
contains(panelPath, "JSON.stringify(rollout.targetScope)", "control panel must display targeting");
excludes(panelPath, '(rollout.status === "running" || rollout.status === "paused") ? (\n        <CpButton onClick={onAdvance}', "paused rollout must not expose advance");
excludes(panelPath, "mock", "rollout surface must not use mock truth");
excludes(panelPath, "fixture", "rollout surface must not use fixture truth");

const manifestPath = "core/platform-control/service.manifest.ts";
contains(manifestPath, '"platform_rollout_resume_contract"', "manifest must declare resume ownership");
contains(manifestPath, '"platform_rollout_recovery_contract"', "manifest must declare recovery ownership");
contains(manifestPath, '"platform_rollout_health_alert_contract"', "manifest must declare health alert ownership");

const integrationPath = "core/platform-control/backend/internal/platformcontrol/rollout_integration_test.go";
contains(integrationPath, "advance while paused must be rejected", "integration must prove paused advance rejection");
contains(integrationPath, "resume while unhealthy must be rejected", "integration must prove unhealthy resume rejection");
contains(integrationPath, "rollout_health_gate_blocked", "integration must prove blocked-health audit");
contains(integrationPath, "rollback completed rollout", "integration must prove baseline restoration");

console.log("JRN-041 progressive rollout gate: PASS");
