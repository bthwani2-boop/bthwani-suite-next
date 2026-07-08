import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("catalog UI roots delegate runtime logic to shared", () => {
  for (const file of [
    "frontend/app-client/store/StoreDetailScreen.tsx",
    "frontend/app-partner/Catalog/PartnerCatalogManagementScreen.tsx",
    "frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
  ]) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /process\.env/);
  }
});

test("Cart & Serviceability cart operations are implemented in dsh.openapi.yaml and registered at runtime", () => {
  const contract = fs.readFileSync(new URL("../contracts/dsh.openapi.yaml", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  // Cart & Serviceability real operations are in the contract
  assert.match(contract, /checkDshCartServiceability/);
  assert.match(contract, /upsertDshCartItem/);
  assert.match(contract, /getDshClientCart/);
  assert.match(contract, /listOperatorCarts/);
  // Cart & Serviceability cart routes are registered in server.go
  assert.match(router, /dsh\/client\/cart/);
  assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i);
});

test("Order Fulfillment order fulfillment routes are implemented and registered at runtime", () => {
  const contract = fs.readFileSync(new URL("../contracts/dsh.openapi.yaml", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  // Order Fulfillment operations are in the contract
  assert.match(contract, /createDshOrder/);
  assert.match(contract, /listDshClientOrders/);
  assert.match(contract, /getDshClientOrder/);
  assert.match(contract, /listDshPartnerOrders/);
  assert.match(contract, /acceptDshOrder/);
  assert.match(contract, /rejectDshOrder/);
  assert.match(contract, /markDshOrderPreparing/);
  assert.match(contract, /markDshOrderReadyForPickup/);
  assert.match(contract, /listDshOperatorOrders/);
  // Order Fulfillment routes are registered in server.go
  assert.match(router, /dsh\/client\/orders/);
  assert.match(router, /dsh\/partner\/orders/);
  assert.match(router, /dsh\/operator\/orders/);
  assert.match(router, /handleAcceptOrder/);
  assert.match(router, /handleRejectOrder/);
  // No financial mutation — wlt_payment_ref_id is a read-only reference only
  assert.doesNotMatch(contract, /\bledger mutation\b|\brefund finalization\b|\bsettlement posting\b/i);
});

test("Dispatch & Captain Delivery dispatch routes are implemented and registered at runtime", () => {
  const contract = fs.readFileSync(new URL("../contracts/dsh.openapi.yaml", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /createDshAssignment/);
  assert.match(contract, /listDshCaptainAssignments/);
  assert.match(contract, /updateDshDeliveryStatus/);
  assert.match(contract, /submitDshPoD/);
  assert.match(contract, /getDshClientOrderTracking/);
  assert.match(router, /dsh\/operator\/dispatch\/assignments/);
  assert.match(router, /dsh\/captain\/dispatch\/assignments/);
  assert.match(router, /dsh\/client\/orders\/\{orderId\}\/tracking/);
  assert.doesNotMatch(contract, /\bcaptain earnings\b|\bCOD collection\b|\bledger mutation\b|\bsettlement posting\b/i);
});

test("Checkout & WLT Handoff checkout intent routes are implemented and registered at runtime; WLT payment-session-event callback is implemented", () => {
  const contract = fs.readFileSync(new URL("../contracts/dsh.openapi.yaml", import.meta.url), "utf8");
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  // Checkout & WLT Handoff real operations are in the contract
  assert.match(contract, /createDshCheckoutIntent/);
  assert.match(contract, /getDshCheckoutIntent/);
  assert.match(contract, /cancelDshCheckoutIntent/);
  assert.match(contract, /listOperatorCheckoutIntents/);
  // Checkout & WLT Handoff checkout-intent routes are registered at runtime
  assert.match(router, /checkout-intents/);
  // WLT payment-session-event callback is implemented (no longer CONTRACT_DRAFT):
  // WLT (the sole owner of payment authorization/capture truth) reports terminal
  // payment outcomes to DSH, which only ever consumes opaque status references.
  assert.match(contract, /reportWltPaymentSessionEvent/);
  assert.doesNotMatch(contract, /x-contract-state: CONTRACT_DRAFT/);
  assert.match(router, /payment-session-events/);
  // No financial mutation language in DSH contract
  assert.doesNotMatch(contract, /ledger entry|refund finalization/i);
});
