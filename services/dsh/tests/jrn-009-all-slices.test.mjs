import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const handler = read("backend/internal/http/cart.go");
const cartRepository = read("backend/internal/cart/cart.go");
const closure = read("backend/internal/cart/jrn009_closure.go");
const ownership = read("backend/internal/cart/ownership.go");
const evidence = read("backend/internal/cart/jrn009_serviceability_evidence.go");
const migration = read("database/migrations/dsh-096_jrn009_cart_slice_closure.sql");
const api = read("frontend/shared/cart/cart.api.ts");
const types = read("frontend/shared/cart/cart.types.ts");
const controller = read("frontend/shared/cart/use-cart-controller.tsx");
const clientScreen = read("frontend/app-client/cart/CartScreen.tsx");
const operatorScreen = read("frontend/control-panel/operations/CartActivityScreen.tsx");
const smoke = read("../../tools/scripts/smoke-jrn-009-cart.ps1");
const registry = JSON.parse(read("contracts/jrn-009-slice-verification-registry.json"));
const productTruth = JSON.parse(
  read("../../governance/product/contracts/jrn-009-cart-serviceability.product-truth.json"),
);

test("JRN-009 S01 loads persisted cart truth with read-after-write states", () => {
  assert.match(handler, /cart\.GetCart\(r\.Context\(\), s\.db, actor\.ID, storeID\)/);
  assert.match(handler, /cart\.ValidateCart\(r\.Context\(\), s\.db, current\.ID\)/);
  assert.match(api, /fetchCart/);
  assert.match(controller, /await load\(\)/);
  for (const state of ["loading", "empty", "offline", "permission_denied", "error", "success"]) {
    assert.match(types, new RegExp(`"${state}"`));
  }
});

test("JRN-009 S02 owns add quantity remove and explicit clear", () => {
  assert.match(handler, /cart\.UpsertOwnedItem\(r\.Context\(\), s\.db, actor\.ID/);
  assert.match(handler, /cart\.RemoveOwnedItem\(r\.Context\(\), s\.db, actor\.ID/);
  assert.match(handler, /cart\.ClearOwnedCart\(r\.Context\(\), s\.db, actor\.ID/);
  assert.match(ownership, /SET state = 'abandoned'/);
  assert.match(ownership, /FOR UPDATE/);
  assert.match(controller, /await clearCart\(cart\.id\);[\s\S]*await load\(\)/);
});

test("JRN-009 S03 snapshots sovereign product price and assortment", () => {
  assert.match(cartRepository, /JOIN dsh_master_products mp ON mp\.id = a\.master_product_id/);
  assert.match(cartRepository, /a\.unit_price, a\.available/);
  assert.match(cartRepository, /store_assortment_id/);
  assert.match(cartRepository, /unit_price/);
  assert.doesNotMatch(handler, /UnitPrice\s+float64\s+`json:"unitPrice"`/);
  assert.doesNotMatch(api, /unitPrice:\s*input/);
});

test("JRN-009 S04 binds store mode and owned address", () => {
  assert.match(handler, /clientaddress\.GetOwned\(r\.Context\(\), s\.db, actor\.ID, body\.AddressID\)/);
  assert.match(handler, /body\.StoreID/);
  assert.match(handler, /body\.FulfillmentMode/);
  assert.match(handler, /cart\.CheckGovernedServiceability/);
  assert.doesNotMatch(handler, /ServiceAreaCode string\s+`json:"serviceAreaCode"`/);
  assert.doesNotMatch(handler, /Latitude\s+\*float64\s+`json:"latitude"`/);
  assert.match(api, /body: \{ storeId, addressId, fulfillmentMode \}/);
});

test("JRN-009 S05 evaluates coverage capacity readiness and SLA", () => {
  assert.match(closure, /CheckServiceability\(ctx, db, storeID, serviceAreaCode, clientLat, clientLng\)/);
  assert.match(closure, /dsh_platform_capacity_configs/);
  assert.match(closure, /dsh_platform_sla_rules/);
  assert.match(closure, /capacity_exhausted/);
  assert.match(closure, /capacity_throttled/);
  assert.match(closure, /SlaPrepMinutes/);
  assert.match(clientScreen, /حالة السعة/);
  assert.match(clientScreen, /SLA:/);
  assert.match(evidence, /dsh_cart_serviceability_checks/);
});

test("JRN-009 S06 reconciles unavailability price and assortment changes", () => {
  for (const status of [
    "product_unlinked",
    "assortment_unavailable",
    "unavailable",
    "assortment_changed",
    "unpriced",
    "price_changed",
  ]) {
    assert.match(closure, new RegExp(`"${status}"`));
    assert.match(types, new RegExp(`"${status}"`));
  }
  assert.match(closure, /math\.Round\(item\.SnapshotUnitPrice\*100\)/);
  assert.match(clientScreen, /اعتماد السعر الحالي/);
  assert.match(clientScreen, /cartReady/);
  assert.match(operatorScreen, /validationLabel/);
});

test("JRN-009 S07 enforces one active store cart in code and PostgreSQL", () => {
  assert.match(closure, /GetOrCreateSingleStoreCart/);
  assert.match(closure, /pg_advisory_xact_lock/);
  assert.match(closure, /current\.StoreID != storeID/);
  assert.match(handler, /CART_STORE_CONFLICT/);
  assert.match(migration, /uq_dsh_carts_single_active_client/);
  assert.match(migration, /WHERE state = 'active'/);
  assert.match(migration, /ranked\.position > 1/);
});

test("JRN-009 S08 gives operators read-only persisted item and reconciliation visibility", () => {
  assert.match(handler, /requirePermission\(w, r, "control-panel", OperationsPermissionRead, "operator"\)/);
  assert.match(handler, /cart\.HydrateOperatorCartItems/);
  assert.match(handler, /cart\.ValidateCart/);
  assert.match(operatorScreen, /سلامة التشكيلة/);
  assert.match(operatorScreen, /لا توجد كتابة أو حقيقة مالية/);
  assert.doesNotMatch(operatorScreen, /payment|refund|settlement|ledger/i);
});

test("JRN-009 registry and runtime proof cover exactly eight slices", () => {
  assert.equal(productTruth.journeyId, "JRN-009");
  assert.equal(productTruth.productDecisions.activeCartPolicy, "one-active-cart-per-client-across-stores");
  assert.equal(productTruth.productDecisions.addressPolicy, "delivery-serviceability-requires-authenticated-client-owned-address");
  assert.equal(registry.journeyId, "JRN-009");
  assert.equal(registry.slices.length, 8);
  assert.deepEqual(
    registry.slices.map((slice) => slice.sliceId),
    Array.from({ length: 8 }, (_, index) => `JRN-009-S0${index + 1}`),
  );
  assert.match(smoke, /all-slices runtime cart smoke/);
  assert.match(smoke, /priceChanged/);
  assert.match(smoke, /unavailableCount/);
  assert.match(smoke, /second active store cart/);
  assert.match(smoke, /capacityConfigured/);
  assert.match(smoke, /slaConfigured/);
});
