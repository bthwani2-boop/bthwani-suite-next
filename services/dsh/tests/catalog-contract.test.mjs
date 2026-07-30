import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { composeContext } from "../../../tools/scripts/openapi-context-composer.mjs";

const dshContract = async () => (await composeContext("dsh", { write: false })).bundle;

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

test("Cart and Serviceability operations are implemented in canonical DSH OpenAPI and runtime", async () => {
  const contract = await dshContract();
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /checkDshCartServiceability/);
  assert.match(contract, /upsertDshCartItem/);
  assert.match(contract, /getDshClientCart/);
  assert.match(contract, /listOperatorCarts/);
  assert.match(router, /dsh\/client\/cart/);
  assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i);
});

test("Order Fulfillment routes are implemented and registered at runtime", async () => {
  const contract = await dshContract();
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

test("Dispatch and Captain Delivery routes are implemented and registered at runtime", async () => {
  const contract = await dshContract();
  const router = fs.readFileSync(new URL("../backend/internal/http/server.go", import.meta.url), "utf8");
  assert.match(contract, /createDshAssignment/);
  assert.match(contract, /listDshCaptainAssignments/);
  assert.match(contract, /updateDshDeliveryStatus/);
  assert.match(contract, /submitDshPoD/);
  assert.match(contract, /getDshClientOrderTracking/);
  assert.match(contract, /operationId: collectDshCaptainCodRecord/);
  assert.match(contract, /operationId: remitDshCaptainCodRecord/);
  assert.match(router, /dsh\/operator\/dispatch\/assignments/);
  assert.match(router, /dsh\/captain\/dispatch\/assignments/);
  assert.match(router, /dsh\/client\/orders\/\{orderId\}\/tracking/);
  assert.doesNotMatch(contract, /\bledger mutation\b|\bsettlement posting\b/i);
});

test("Checkout and WLT handoff routes are implemented", async () => {
  const contract = await dshContract();
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
