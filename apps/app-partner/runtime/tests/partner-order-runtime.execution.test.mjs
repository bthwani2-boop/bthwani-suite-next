import assert from "node:assert/strict";
import test from "node:test";

const orderPolicyUrl = new URL(
  "../../../../services/dsh/frontend/shared/orders/partner-order-mutation.policy.ts",
  import.meta.url,
);
const bindingContractsUrl = new URL(
  "../../../../services/dsh/frontend/app-partner/dsh-partner-binding.contracts.ts",
  import.meta.url,
);

const { resolvePartnerOrderMutation } = await import(orderPolicyUrl.href);
const { DSH_PARTNER_BINDING_CONTRACTS, hasDshPartnerBindingContract } = await import(bindingContractsUrl.href);

test("partner order actions fail closed unless DSH explicitly allows the mutation", () => {
  assert.equal(resolvePartnerOrderMutation("accept", ["accept"]), "accept");
  assert.equal(resolvePartnerOrderMutation("accept", []), null);
  assert.equal(resolvePartnerOrderMutation("ready", ["ready"]), "ready");
  assert.equal(resolvePartnerOrderMutation("ready", ["accept"]), null);
  assert.equal(resolvePartnerOrderMutation("handoff", ["handoff"]), "handoff");
  assert.equal(resolvePartnerOrderMutation("handoff", ["ready"]), null);
});

test("partner preparation action preserves the backend-supported ready fallback", () => {
  assert.equal(resolvePartnerOrderMutation("prepare", ["prepare"]), "prepare");
  assert.equal(resolvePartnerOrderMutation("prepare", ["ready"]), "ready");
  assert.equal(resolvePartnerOrderMutation("prepare", []), null);
  assert.equal(resolvePartnerOrderMutation("unknown", ["accept", "prepare", "ready", "handoff"]), null);
});

test("partner route registry binds every critical operational surface", () => {
  const ids = new Set(DSH_PARTNER_BINDING_CONTRACTS.map((contract) => contract.surfaceId));
  for (const required of [
    "home",
    "entry",
    "inbox",
    "detail",
    "bell",
    "inventory-management",
    "order-rejection",
    "store-courier",
    "product-edit",
    "category-management",
    "product-media",
    "product-overrides",
    "team",
    "wallet-bridge",
    "commercial-model",
    "support-directory",
    "support-screen",
  ]) {
    assert.equal(ids.has(required), true, `missing partner binding for ${required}`);
    assert.equal(hasDshPartnerBindingContract(required), true, `route lookup rejected ${required}`);
  }
  assert.equal(ids.size, DSH_PARTNER_BINDING_CONTRACTS.length, "partner bindings must be unique");
});

test("partner finance remains an explicit wallet bridge rather than DSH mutation authority", () => {
  const wallet = DSH_PARTNER_BINDING_CONTRACTS.find((contract) => contract.surfaceId === "wallet-bridge");
  assert.ok(wallet);
  assert.equal(wallet.bindingName, "partner-wallet-bridge");
  assert.match(wallet.description, /Read-only WLT wallet, commission, settlement, and payout/);
});
