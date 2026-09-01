import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const scopeVocabulary = JSON.parse(read("tools/verification/security-scope-vocabulary.json"));
const capabilityContract = JSON.parse(read("services/dsh/contracts/authorization-capabilities.json"));
const declaredScopes = new Set(
  scopeVocabulary.families.flatMap((family) => family.scopes.map(({ scope }) => scope)),
);

test("platform capability contract is bound to the enforced scope inventory", () => {
  assert.equal(
    Object.hasOwn(scopeVocabulary, "capabilities"),
    false,
    "verification inventory must not own runtime capability semantics",
  );
  assert.equal(capabilityContract.authority, "DSH_CONTROL_PANEL_AUTHORIZATION_CAPABILITIES");
  assert.equal(capabilityContract.owner, "services/dsh");
  assert.ok(Array.isArray(capabilityContract.capabilities));
  const ids = new Set();
  for (const capability of capabilityContract.capabilities) {
    assert.equal(ids.has(capability.id), false, `duplicate capability id: ${capability.id}`);
    ids.add(capability.id);
    for (const action of ["read", "manage", "healthRead", "auditRead", "rollback"]) {
      for (const permission of capability[action] ?? []) {
        assert.equal(
          declaredScopes.has(permission),
          true,
          `${capability.id}.${action} uses undeclared permission ${permission}`,
        );
      }
    }
  }

  const permissionsModule = read("services/dsh/frontend/shared/session/control-panel-permissions.ts");
  assert.match(permissionsModule, /contracts\/authorization-capabilities\.json/);
  assert.doesNotMatch(permissionsModule, /tools\/verification\/security-scope-vocabulary/);
  assert.match(permissionsModule, /CONTROL_PANEL_CAPABILITIES/);
  assert.match(permissionsModule, /hasAllControlPanelPermissions/);
  assert.match(permissionsModule, /dshOperationalProfileRead/);
  assert.match(permissionsModule, /dshOperationalDeliveryModeManage/);
  assert.match(permissionsModule, /dshOperationalSlaManage/);
  assert.match(permissionsModule, /dshOperationalCapacityManage/);
  assert.match(permissionsModule, /dshOperationalPolicyEvaluate/);
  assert.equal(
    capabilityContract.capabilities.some((capability) => capability.id === "dsh-operational-policy-evaluate"),
    true,
  );
  assert.doesNotMatch(permissionsModule, /permission\.(?:service|surface|action)\s*===\s*["'](?:\*|all)["']/);
});

test("platform policy routes use named DSH permission constants", () => {
  const routes = read("services/dsh/backend/internal/http/platformpolicies_routes.go");
  const server = read("services/dsh/backend/internal/http/server.go");
  assert.match(read("services/dsh/backend/internal/http/platformpolicies.go"), /DshPlatformPermissionRead\s+=\s+"platform:read"/);
  assert.match(read("services/dsh/backend/internal/http/platformpolicies.go"), /DshPlatformPermissionManage\s+=\s+"platform\.manage"/);
  assert.match(read("services/dsh/backend/internal/http/platformpolicies.go"), /DshOperationalPolicyEvaluatePermission\s+=\s+"dsh\.operational_policy\.evaluate"/);
  assert.doesNotMatch(routes, /"platform\.(?:read|manage)"/);
  assert.doesNotMatch(server, /"platform\.(?:read|manage)"/);
  assert.match(routes, /service-areas\/\{serviceAreaCode\}.*DshServiceZonesPermissionRead/s);
  assert.match(server, /GET \/dsh\/operator\/platform\/service-areas", protected\.withPermission\("control-panel", DshServiceZonesPermissionRead/);
  assert.match(server, /PUT \/dsh\/operator\/platform\/service-areas\/\{serviceAreaCode\}", protected\.withPermission\("control-panel", DshServiceZonesPermissionManage/);
  assert.match(routes, /operator\/platform\/operational-policy\/evaluate.*DshOperationalPolicyEvaluatePermission/s);
});

test("policy surfaces gate reads and writes before invoking their controllers", () => {
  const screen = read("services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx");
  assert.match(screen, /useIdentitySession/);
  assert.match(screen, /hasAllControlPanelPermissions/);
  for (const prop of ["canReadZones", "canReadProfile", "canManageProfile", "canReadDeliveryModes", "canManageDeliveryModes", "canEvaluate", "canReadAudit", "canRollback"]) {
    assert.match(screen, new RegExp(`${prop}=`));
  }

  const serviceArea = read("services/dsh/frontend/control-panel/platform/ServiceAreaGovernanceSection.tsx");
  const privacy = read("services/dsh/frontend/control-panel/platform/ClientAddressPrivacySection.tsx");
  const operational = read("services/dsh/frontend/control-panel/platform/OperationalPolicySection.tsx");
  assert.match(serviceArea, /useServiceAreaController\(canRead\)/);
  assert.match(privacy, /useClientAddressPrivacyController\(canRead\)/);
  assert.match(operational, /useZonesController\(canReadZones \? "authenticated" : "restricted"\)/);
  assert.match(operational, /evaluateDshOperatorOperationalPolicy/);
  assert.match(operational, /if \(!canManageProfile \|\| !selectedZoneId\) return/);
  assert.match(operational, /if \(!canManageDeliveryModes \|\| !selectedZoneId\) return/);
  assert.match(operational, /if \(!canRollback \|\| !selectedAudit\) return/);
});

test("WLT financial capability uses the canonical DSH facade and registry", () => {
  const facade = read("services/dsh/backend/internal/wlt/facade_client.go");
  const registry = read("services/dsh/backend/internal/wlt/operation_registry.go");
  const responseContract = read("services/dsh/backend/internal/wlt/finance_response_contract.go");
  const payoutSurface = read("services/dsh/backend/internal/http/payout_destination_finance_control.go");
  const settlementSurface = read("services/dsh/backend/internal/http/finance_settlement_sources.go");
  const payoutReadback = read("services/dsh/backend/internal/wlt/payout_destination.go");
  assert.match(facade, /func \(c \*Client\) ExecuteFinanceRead/);
  assert.match(facade, /func \(c \*Client\) ExecuteFinanceWrite/);
  assert.match(facade, /Registry\.GetOperation\(opID\)/);
  assert.match(facade, /setDelegatedOperatorContextHeader/);
  assert.match(facade, /normalizeFinanceResponse/);
  assert.match(registry, /var Registry = NewOperationRegistry\(\)/);
  assert.match(registry, /finance\.settlements\.create/);
  for (const operation of [
    "finance.payout_destinations.read",
    "finance.payout_destinations.upsert",
    "finance.payout_destinations.verify",
    "finance.payout_destinations.deactivate",
  ]) assert.match(registry, new RegExp(operation.replaceAll(".", "\\.")));
  assert.match(registry, /FinanceResponseNoContent/);
  assert.match(responseContract, /func normalizeFinanceResponse/);
  assert.match(payoutSurface, /ExecuteFinance(Read|Write)/);
  assert.match(settlementSurface, /ExecuteFinanceWrite[\s\S]*finance\.settlements\.create/);
  assert.match(payoutReadback, /ExecuteFinance(Read|Write)/);
  assert.doesNotMatch(payoutReadback, /http\.NewRequestWithContext|c\.http\.Do/);
  for (const retiredPath of [
    "services/dsh/backend/internal/wlt/actor_finance_client.go",
    "services/dsh/backend/internal/wlt/settlement_client.go",
    "services/dsh/backend/internal/wlt/legacy_test_compat_test.go",
    "services/dsh/backend/internal/wlt/payment_scope_transport_test.go",
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} must remain retired`);
});

test("local operator grants match the live DSH policy surfaces", () => {
  const permissions = read("core/identity/backend/internal/identity/employee_access.go");
  for (const permission of [
    "platform:read",
    "platform.manage",
    "dsh.fulfillment_sla.read",
    "dsh.fulfillment_sla.manage",
    "dsh.dispatch_capacity.read",
    "dsh.dispatch_capacity.manage",
    "dsh.operational_policy.audit.read",
    "dsh.operational_policy.evaluate",
    "dsh.operational_policy.rollback",
    "finance.manage",
  ]) {
    assert.match(permissions, new RegExp(`"${permission.replaceAll(".", "\\.")}"`));
  }
  assert.doesNotMatch(permissions, /"platform\.read"/);
  for (const deadPermission of [
    "platform:flags:manage",
    "platform:services:manage",
    "platform:health:acknowledge",
    "platform:audit:export",
    "platform:wlt-policy:read",
  ]) {
    assert.doesNotMatch(permissions, new RegExp(`"${deadPermission.replaceAll(":", "\\:")}"`));
  }
});
