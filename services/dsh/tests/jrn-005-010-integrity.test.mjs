import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("JRN-005 persists address retry identity across application restarts", () => {
  const attempt = read("frontend/shared/client-address/client-address-create-attempt.ts");
  const controller = read("frontend/shared/client-address/use-client-address-controller.ts");

  assert.match(attempt, /AsyncStorage/);
  assert.match(attempt, /getOrCreateClientAddressAttempt/);
  assert.match(attempt, /clearClientAddressAttempt/);
  assert.match(controller, /createDshClientAddress\(input, attempt\.context\)/);
  assert.match(controller, /clearClientAddressAttempt\(attempt\.fingerprint\)/);
  assert.doesNotMatch(controller, /createAttempt\s*=\s*useRef/);
});

test("JRN-006 keeps map calls behind DSH and service-area governance", () => {
  const controller = read("frontend/shared/client-map/use-client-map-controller.ts");
  const api = read("frontend/shared/client-map/client-map.api.ts");
  const handler = read("backend/internal/http/client_map.go");
  const provider = read("backend/internal/mapprovider/client.go");

  assert.match(controller, /searchClientMap/);
  assert.match(controller, /reverseClientMap/);
  assert.match(api, /\/dsh\/client\/map\/search/);
  assert.match(api, /\/dsh\/client\/map\/reverse/);
  assert.match(handler, /SearchServiceAreas/);
  assert.match(handler, /ReverseServiceAreas/);
  assert.match(provider, /\/providers\/maps\/search/);
  assert.match(provider, /\/providers\/maps\/reverse/);
});

test("JRN-007 scopes discovery to the persisted selected address", () => {
  const screen = read("frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx");
  const controller = read("frontend/shared/home-discovery/use-home-discovery-controller.tsx");

  assert.match(screen, /useClientAddressController/);
  assert.match(screen, /serviceAreaCode: addressController\.selectedAddress\?\.serviceAreaCode/);
  assert.match(screen, /enabled: addressController\.state\.kind === "ready"/);
  assert.match(controller, /fetchHomeDiscovery\(\{ cityCode, serviceAreaCode, limit: 20 \}\)/);
});

test("JRN-008 retains one central catalog truth and no retired local routes", () => {
  const router = read("backend/internal/http/server.go");
  const migration = read("database/migrations/dsh-036_central_catalog_runtime_closure.sql");

  assert.match(router, /GET \/dsh\/partner\/catalog\/taxonomy/);
  assert.match(router, /GET \/dsh\/partner\/catalog\/master-products/);
  assert.match(migration, /DROP TABLE IF EXISTS dsh_catalog_products/);
  assert.match(migration, /DROP TABLE IF EXISTS dsh_catalog_categories/);
  assert.match(migration, /INSERT INTO dsh_master_products/);
  assert.match(migration, /INSERT INTO dsh_store_assortments/);
});

test("JRN-009 cart mutations require authenticated cart ownership", () => {
  const handler = read("backend/internal/http/cart.go");
  const ownership = read("backend/internal/cart/ownership.go");

  assert.match(handler, /cart\.RemoveOwnedItem\(r\.Context\(\), s\.db, actor\.ID, cartID, itemID\)/);
  assert.match(handler, /cart\.ClearOwnedCart\(r\.Context\(\), s\.db, actor\.ID, cartID\)/);
  assert.doesNotMatch(handler, /cart\.RemoveItem\(r\.Context\(\), s\.db, cartID, itemID\)/);
  assert.match(ownership, /cart\.client_id = \$3/);
  assert.match(ownership, /WHERE id = \$1 AND client_id = \$2 AND state = 'active'/);
});

test("JRN-010 reuses one checkout and one WLT session for retries", () => {
  const attempt = read("frontend/shared/checkout/checkout-create-attempt.ts");
  const api = read("frontend/shared/checkout/checkout.api.ts");
  const controller = read("frontend/shared/checkout/use-checkout-controller.tsx");
  const handler = read("backend/internal/http/checkout.go");
  const idempotency = read("backend/internal/checkout/create_idempotency.go");
  const session = read("backend/internal/checkout/wlt_session_idempotency.go");
  const migration = read("database/migrations/dsh-901_checkout_create_idempotency.sql");

  assert.match(attempt, /AsyncStorage/);
  assert.match(controller, /getOrCreateCheckoutAttempt/);
  assert.match(controller, /createCheckoutIntent\(input, attempt\.context\)/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(handler, /r\.Header\.Get\("Idempotency-Key"\)/);
  assert.match(handler, /LockCreateIdempotencyTx/);
  assert.match(handler, /FindCreateIdempotencyTx/);
  assert.match(handler, /BindCreateIdempotencyTx/);
  assert.match(handler, /AttachWltPaymentSessionIdempotent/);
  assert.match(idempotency, /pg_advisory_xact_lock/);
  assert.match(session, /state = 'payment_pending' AND wlt_payment_session_id = \$2/);
  assert.match(migration, /PRIMARY KEY \(tenant_id, client_id, idempotency_key\)/);
});
