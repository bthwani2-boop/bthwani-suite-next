import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { composeDshOpenApi } from "../../../tools/scripts/dsh-openapi-modular-lib.mjs";

const dshContract = () => composeDshOpenApi({ write: false });

test("catalog UI roots delegate runtime logic to shared", () => {
  for (const file of [
    "frontend/app-client/store/StoreDetailScreen.tsx",
    "frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx",
    "frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
  ]) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /process\.env/);
  }
});

test("Cart & Serviceability cart operations are implemented in composed DSH OpenAPI and registered at runtime", () => {
  const contract = dshContract();
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /checkDshCartServiceability/);
  assert.match(contract, /upsertDshCartItem/);
  assert.match(contract, /getDshClientCart/);
  assert.match(contract, /listOperatorCarts/);
  assert.match(router, /dsh\/client\/cart/);
  assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i);
});

test("Order Fulfillment order fulfillment routes are implemented and registered at runtime", () => {
  const contract = dshContract();
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /createDshOrder/);
  assert.match(contract, /listDshClientOrders/);
  assert.match(contract, /getDshClientOrder/);
  assert.match(contract, /listDshPartnerOrders/);
  assert.match(contract, /acceptDshOrder/);
  assert.match(contract, /rejectDshOrder/);
  assert.match(contract, /markDshOrderPreparing/);
  assert.match(contract, /markDshOrderReadyForPickup/);
  assert.match(contract, /listDshOperatorOrders/);
  assert.match(router, /dsh\/client\/orders/);
  assert.match(router, /dsh\/partner\/orders/);
  assert.match(router, /dsh\/operator\/orders/);
  assert.match(router, /handleAcceptOrder/);
  assert.match(router, /handleRejectOrder/);
  assert.doesNotMatch(contract, /\bledger mutation\b|\brefund finalization\b|\bsettlement posting\b/i);
});

test("Dispatch & Captain Delivery dispatch routes are implemented and registered at runtime", () => {
  const contract = dshContract();
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
  const contract = dshContract();
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /createDshCheckoutIntent/);
  assert.match(contract, /getDshCheckoutIntent/);
  assert.match(contract, /cancelDshCheckoutIntent/);
  assert.match(contract, /listOperatorCheckoutIntents/);
  assert.match(router, /checkout-intents/);
  assert.match(contract, /reportWltPaymentSessionEvent/);
  assert.doesNotMatch(contract, /x-contract-state: CONTRACT_DRAFT/);
  assert.match(router, /payment-session-events/);
  assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i);
});
