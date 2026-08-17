import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const scopeVocabulary = JSON.parse(read("governance/contracts/scope-vocabulary.json"));
const declaredScopes = new Set(
  scopeVocabulary.families.flatMap((family) => family.scopes.map(({ scope }) => scope)),
);

test("platform capability registry is bound to the canonical scope vocabulary", () => {
  assert.ok(Array.isArray(scopeVocabulary.capabilities));
  const ids = new Set();
  for (const capability of scopeVocabulary.capabilities) {
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
  assert.match(permissionsModule, /scope-vocabulary\.json/);
  assert.match(permissionsModule, /CONTROL_PANEL_CAPABILITIES/);
  assert.match(permissionsModule, /hasAllControlPanelPermissions/);
});

test("platform policy routes use named DSH permission constants", () => {
  const routes = read("services/dsh/backend/internal/http/platformpolicies_routes.go");
  const server = read("services/dsh/backend/internal/http/server.go");
  assert.match(read("services/dsh/backend/internal/http/platformpolicies.go"), /DshPlatformPermissionRead\s+=\s+"platform\.read"/);
  assert.match(read("services/dsh/backend/internal/http/platformpolicies.go"), /DshPlatformPermissionManage\s+=\s+"platform\.manage"/);
  assert.doesNotMatch(routes, /"platform\.(?:read|manage)"/);
  assert.doesNotMatch(server, /"platform\.(?:read|manage)"/);
});

test("policy surfaces gate reads and writes before invoking their controllers", () => {
  const screen = read("services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx");
  assert.match(screen, /useIdentitySession/);
  assert.match(screen, /hasAllControlPanelPermissions/);
  for (const prop of ["canRead", "canManage", "canReadAudit", "canRollback"]) {
    if (["canReadAudit", "canRollback"].includes(prop)) continue;
    assert.match(screen, new RegExp(`${prop}=`));
  }

  const serviceArea = read("services/dsh/frontend/control-panel/platform/ServiceAreaGovernanceSection.tsx");
  const privacy = read("services/dsh/frontend/control-panel/platform/ClientAddressPrivacySection.tsx");
  const operational = read("services/dsh/frontend/control-panel/platform/OperationalPolicySection.tsx");
  const governance = read("services/dsh/frontend/control-panel/platform/OperationalPolicyGovernanceSection.tsx");
  assert.match(serviceArea, /useServiceAreaController\(canRead\)/);
  assert.match(privacy, /useClientAddressPrivacyController\(canRead\)/);
  assert.match(operational, /useZonesController\(canRead \? "authenticated" : "restricted"\)/);
  assert.match(governance, /const authKind = canRead \? "authenticated" : "restricted"/);
  assert.match(operational, /if \(!canManage \|\| !selectedZoneId\) return/);
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
    "platform.read",
    "platform.manage",
    "dsh.fulfillment_sla.read",
    "dsh.fulfillment_sla.manage",
    "dsh.dispatch_capacity.read",
    "dsh.dispatch_capacity.manage",
    "dsh.operational_policy.audit.read",
    "dsh.operational_policy.rollback",
    "finance.manage",
  ]) {
    assert.match(permissions, new RegExp(`Action: "${permission.replaceAll(".", "\\.")}"`));
  }
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
