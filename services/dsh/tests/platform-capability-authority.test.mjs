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
  const governance = read("services/dsh/frontend/control-panel/platform/OperationalPolicyGovernanceSection.tsx");
  assert.match(serviceArea, /useServiceAreaController\(canRead\)/);
  assert.match(privacy, /useClientAddressPrivacyController\(canRead\)/);
  assert.match(operational, /useZonesController\(canReadZones \? "authenticated" : "restricted"\)/);
  assert.match(operational, /evaluateDshOperatorOperationalPolicy/);
  assert.match(operational, /if \(!canManageProfile \|\| !selectedZoneId\) return/);
  assert.match(operational, /if \(!canManageDeliveryModes \|\| !selectedZoneId\) return/);
  assert.match(governance, /useZonesController\(canReadZones \? "authenticated" : "restricted"\)/);
  assert.match(governance, /useSlaRulesController\(canReadSla \? "authenticated" : "restricted"\)/);
  assert.match(governance, /useAreaCapacityController\(canReadCapacity \? "authenticated" : "restricted"/);
  assert.match(operational, /if \(!canRollback \|\| !selectedAudit\) return/);
});

test("WLT payout-destination client exposes only operator-context methods", () => {
  const client = read("services/dsh/backend/internal/wlt/actor_finance_client.go");
  assert.doesNotMatch(client, /Finance(?:Read|Upsert|Deactivate)PayoutDestination\s*\(/);
  for (const method of [
    "FinanceReadPayoutDestinationWithOperatorContext",
    "FinanceUpsertPayoutDestinationWithOperatorContext",
    "FinanceDeactivatePayoutDestinationWithOperatorContext",
  ]) {
    assert.match(client, new RegExp(`func \\(c \\*Client\\) ${method}\\s*\\(`));
  }
});

test("local operator grants match the live DSH policy surfaces", () => {
  const permissions = read("core/identity/backend/internal/identity/local_operator_permissions.go");
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
    assert.match(permissions, new RegExp(`Action: "${permission.replaceAll(".", "\\.")}"`));
  }
  assert.doesNotMatch(permissions, /Action: "platform\.read"/);
  for (const deadPermission of [
    "platform:flags:manage",
    "platform:services:manage",
    "platform:health:acknowledge",
    "platform:audit:export",
    "platform:wlt-policy:read",
  ]) {
    assert.doesNotMatch(permissions, new RegExp(`Action: "${deadPermission.replaceAll(":", "\\:")}"`));
  }
});
