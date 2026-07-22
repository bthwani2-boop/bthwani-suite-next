import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

test("JRN-029 Product Truth keeps independent acceptance pending", async () => {
  const truth = await json(
    "governance/product/contracts/jrn-029-zones-sla-capacity-delivery-modes.product-truth.json",
  );
  assert.equal(truth.capabilityId, "JRN_029_ZONES_SLA_CAPACITY_DELIVERY_MODES");
  assert.equal(truth.owners.productManagerApproval, "PENDING");
  assert.equal(truth.owners.productOwnerApproval, "PENDING");
  assert.equal(truth.owners.productAcceptanceDecision, "PENDING");
  assert.equal(truth.acceptance.runtimeEvidenceRequired, true);
  assert.equal(truth.acceptance.visualEvidenceRequired, true);
  assert.ok(truth.acceptance.criteria.some((item) => item.includes("Assignment SLA")));
  assert.ok(truth.acceptance.criteria.some((item) => item.includes("cart, checkout, order and dispatch")));
});

test("JRN-029 migration owns SLA assignment pause modes and rollback audit", async () => {
  const migration = await text(
    "services/dsh/database/migrations/dsh-129_jrn029_operational_policy_closure.sql",
  );
  for (const required of [
    "max_assignment_mins",
    "is_paused",
    "pause_reason",
    "dsh_platform_delivery_mode_policies",
    "bthwani_delivery",
    "partner_delivery",
    "client_pickup",
    "rolled_back",
  ]) {
    assert.match(migration, new RegExp(required));
  }
  assert.doesNotMatch(migration, /wlt_|wallet|ledger/i);
});

test("JRN-029 backend returns one fail-closed cross-surface decision", async () => {
  const domain = await text(
    "services/dsh/backend/internal/platformpolicies/jrn029_closure.go",
  );
  const profile = await text(
    "services/dsh/backend/internal/platformpolicies/jrn029_profile.go",
  );
  const storeEffects = await text(
    "services/dsh/backend/internal/platformpolicies/jrn029_store_effects.go",
  );
  for (const required of [
    "ZONE_INACTIVE",
    "SERVICE_AREA_MISMATCH",
    "SLA_NOT_CONFIGURED",
    "CAPACITY_NOT_CONFIGURED",
    "ZONE_CAPACITY_PAUSED",
    "FULFILLMENT_MODE_DISABLED",
    "CAPACITY_EXHAUSTED",
    "CAPACITY_THROTTLED",
    "CartAllowed",
    "CheckoutAllowed",
    "OrderCreationAllowed",
    "DispatchAllowed",
    "RollbackPolicyEvent",
  ]) {
    assert.match(domain, new RegExp(required));
  }
  assert.match(profile, /MaxAssignmentMins/);
  assert.match(profile, /ExpectedCapacityVersion/);
  assert.match(profile, /insertEvent/);
  assert.match(storeEffects, /EvaluateOperationalPolicyForStore/);
  assert.match(storeEffects, /COUNT\(\*\)/);
  assert.match(storeEffects, /dsh_orders/);
  assert.match(storeEffects, /"pickup", FulfillmentModeClientPickup/);
  assert.doesNotMatch(domain + profile + storeEffects, /internal\/wlt|wlt\./);
});

test("JRN-029 routes expose profile modes evaluation audit and rollback", async () => {
  const routes = await text(
    "services/dsh/backend/internal/http/platformpolicies_routes.go",
  );
  const handler = await text(
    "services/dsh/backend/internal/http/jrn029_operational_policy.go",
  );
  for (const route of [
    "operational-profiles/{zoneId}",
    "delivery-modes/{fulfillmentMode}",
    "operational-policy/evaluate",
    "operational-policy/audit",
    "audit/{eventId}/rollback",
  ]) {
    assert.match(routes, new RegExp(route.replace(/[{}]/g, "\\$&")));
  }
  assert.match(handler, /PlatformPermissionRead/);
  assert.match(handler, /PlatformPermissionManage/);
  assert.match(handler, /requireActor\(w, r, "client", "partner", "captain", "operator"\)/);
  assert.match(handler, /platformPolicyMutation/);
});

test("JRN-029 runtime guard enforces cart checkout order and dispatch effects", async () => {
  const guard = await text(
    "services/dsh/backend/internal/http/jrn029_effects_middleware.go",
  );
  const main = await text("services/dsh/backend/cmd/dsh-api/main.go");
  for (const route of [
    "/dsh/client/cart/items",
    "/dsh/client/cart/serviceability",
    "/dsh/client/checkout-intents",
    "/dsh/client/orders",
    "/dsh/operator/dispatch/assignments",
  ]) {
    assert.match(guard, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const effect of [
    "CartAllowed",
    "CheckoutAllowed",
    "OrderCreationAllowed",
    "DispatchAllowed",
  ]) {
    assert.match(guard, new RegExp(effect));
  }
  assert.match(guard, /OPERATIONAL_POLICY_DENIED/);
  assert.match(guard, /EvaluateOperationalPolicyForStore/);
  assert.match(main, /OperationalPolicyEffectsMiddleware\(db, router\)/);
});

test("JRN-029 shared brain and control panel consume canonical APIs", async () => {
  const api = await text(
    "services/dsh/frontend/shared/platform/jrn029-operational-policy.api.ts",
  );
  const panel = await text(
    "services/dsh/frontend/control-panel/platform/Jrn029OperationalPolicySection.tsx",
  );
  const screen = await text(
    "services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx",
  );
  for (const operation of [
    "fetchDshOperationalProfile",
    "upsertDshOperationalProfile",
    "fetchDshOperationalDeliveryModes",
    "upsertDshOperationalDeliveryMode",
    "evaluateDshOperationalPolicy",
    "fetchDshOperationalPolicyAudit",
    "rollbackDshOperationalPolicy",
  ]) {
    assert.match(api, new RegExp(operation));
    assert.match(panel, new RegExp(operation));
  }
  assert.match(panel, /maxAssignmentMins/);
  assert.match(panel, /إيقاف تشغيلي/);
  assert.match(panel, /السلة وCheckout والطلب والتوزيع/);
  assert.match(screen, /Jrn029OperationalPolicySection/);
  assert.doesNotMatch(panel, /mock|fixture|Math\.random/i);
});

test("JRN-029 OpenAPI contract covers every new operation", async () => {
  const contract = await text("services/dsh/contracts/dsh.jrn-029.openapi.yaml");
  for (const operationId of [
    "getDshOperationalProfile",
    "upsertDshOperationalProfile",
    "listDshOperationalDeliveryModes",
    "upsertDshOperationalDeliveryMode",
    "evaluateDshOperationalPolicy",
    "listDshOperationalPolicyAudit",
    "rollbackDshOperationalPolicy",
  ]) {
    assert.match(contract, new RegExp(`operationId: ${operationId}`));
  }
  assert.match(contract, /maxAssignmentMins/);
  assert.match(contract, /client_pickup/);
  assert.match(contract, /expectedCurrentVersion/);
});
