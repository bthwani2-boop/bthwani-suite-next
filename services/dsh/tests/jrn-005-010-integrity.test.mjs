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

test("JRN-006 keeps map calls and address writes behind governed service areas", () => {
  const controller = read("frontend/shared/client-map/use-client-map-controller.ts");
  const api = read("frontend/shared/client-map/client-map.api.ts");
  const mapHandler = read("backend/internal/http/client_maps.go");
  const addressHandler = read("backend/internal/http/client_addresses.go");
  const addressBinding = read("backend/internal/clientaddress/address_service_area.go");
  const provider = read("backend/internal/mapproviders/client.go");
  const migration = read("database/migrations/dsh-906_jrn_006_client_address_geofence_binding.sql");
  const contract = read("contracts/dsh.client-address.openapi.yaml");
  const productTruth = JSON.parse(
    read("../../governance/product/contracts/jrn-006-maps-service-area-address-privacy.product-truth.json"),
  );
  const evidence = JSON.parse(
    read("../../governance/evidence/JRN-006_MAPS_SERVICE_AREA_ADDRESS_PRIVACY_EVIDENCE.json"),
  );

  assert.match(controller, /searchDshClientMapLocations/);
  assert.match(controller, /reverseDshClientMapLocation/);
  assert.match(api, /\/dsh\/client\/maps\/search/);
  assert.match(api, /\/dsh\/client\/maps\/reverse/);
  assert.match(mapHandler, /servicearea\.Resolve/);
  assert.match(mapHandler, /ServiceAreaVerified/);
  assert.match(provider, /\/providers\/maps\/search/);
  assert.match(provider, /\/providers\/maps\/reverse/);

  assert.match(addressBinding, /FindCreateReplay/);
  assert.match(addressBinding, /ValidateServiceArea/);
  assert.match(addressBinding, /servicearea\.Resolve/);
  assert.match(addressBinding, /ErrServiceAreaUnverified/);
  assert.match(addressHandler, /clientaddress\.FindCreateReplay/);
  assert.match(addressHandler, /clientaddress\.ValidateServiceArea/);
  assert.match(addressHandler, /ADDRESS_SERVICE_AREA_UNVERIFIED/);
  assert.match(addressHandler, /StatusUnprocessableEntity/);

  assert.match(migration, /dsh_enforce_client_address_service_area/);
  assert.match(migration, /DSH_ADDRESS_COORDINATES_REQUIRED/);
  assert.match(migration, /DSH_ADDRESS_SERVICE_AREA_UNVERIFIED/);
  assert.match(migration, /g\.active = TRUE/);
  assert.match(migration, /FOR SHARE/);
  assert.match(contract, /"422": \{ \$ref: "#\/components\/responses\/ServiceAreaUnverified" \}/);
  assert.match(contract, /required: \[label, recipientName, phoneE164, addressLine, serviceAreaCode, latitude, longitude\]/);

  assert.equal(productTruth.journeyId, "JRN-006");
  assert.equal(productTruth.status, "IMPLEMENTED_PENDING_INDEPENDENT_REVIEW");
  assert.equal(evidence.journeyId, "JRN-006");
  assert.equal(evidence.decision, "READY_FOR_REVIEW");
  assert.equal(evidence.workflowRun.statusContext, "journeys/jrn-006/targeted-verification");
  assert.equal(evidence.checks.postgres16MigrationApply, "PASS");
  assert.equal(evidence.checks.postgresOutsidePolygonRejected, "PASS");
});

test("JRN-007 scopes discovery to the persisted selected address", () => {
  const screen = read("frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx");
  const controller = read("frontend/shared/home-discovery/use-home-discovery-controller.tsx");

  assert.match(screen, /useClientAddressController/);
  assert.match(screen, /serviceAreaCode = addressController\.selectedAddress\?\.serviceAreaCode/);
  assert.match(screen, /enabled: addressController\.state\.kind === "ready"/);
  assert.match(controller, /fetchHomeDiscovery\(\{/);
  assert.match(controller, /\.\.\.\(cityCode !== undefined \? \{ cityCode \} : \{\}\)/);
  assert.match(controller, /\.\.\.\(serviceAreaCode !== undefined \? \{ serviceAreaCode \} : \{\}\)/);
  assert.match(controller, /limit: 20,/);
});

test("JRN-008 retains one central catalog truth and governed proposal readback", () => {
  const router = read("backend/internal/http/server.go");
  const unifiedRoutes = read("backend/internal/http/catalog_unified_routes.go");
  const readbackHandler = read("backend/internal/http/catalog_proposal_readback.go");
  const readbackApi = read("frontend/shared/catalog/product-proposal-readback.api.ts");
  const fieldController = read("frontend/shared/partner/use-field-catalog-controller.tsx");
  const partnerScreen = read("frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx");
  const readbackContract = read("contracts/dsh.catalog-proposal-readback.openapi.yaml");
  const masterContract = read("../../contracts/master.openapi.yaml");
  const migration = read("database/migrations/dsh-036_central_catalog_runtime_closure.sql");

  assert.match(router, /registerUnifiedCatalogRoutes\(mux, protected\)/);
  assert.match(unifiedRoutes, /GET \/dsh\/partner\/catalog\/taxonomy/);
  assert.match(unifiedRoutes, /GET \/dsh\/operator\/catalog\/master-products/);
  assert.match(unifiedRoutes, /GET \/dsh\/partner\/stores\/\{storeId\}\/assortment/);
  assert.match(unifiedRoutes, /GET \/dsh\/partner\/catalog\/product-proposals/);
  assert.match(unifiedRoutes, /GET \/dsh\/field\/partners\/\{partnerId\}\/catalog\/product-proposals/);

  assert.match(readbackHandler, /s\.partnerStore\(w, r\)/);
  assert.match(readbackHandler, /s\.fieldPartnerStore\(w, r\)/);
  assert.match(readbackHandler, /StoreID: storeID/);
  assert.doesNotMatch(readbackHandler, /Query\(\)\.Get\("storeId"\)/);

  assert.match(readbackApi, /fetchPartnerProductProposals/);
  assert.match(readbackApi, /fetchFieldProductProposals/);
  assert.match(readbackApi, /\/dsh\/partner\/catalog\/product-proposals/);
  assert.match(readbackApi, /\/dsh\/field\/partners\/\$\{encodeURIComponent\(partnerId\)\}\/catalog\/product-proposals/);
  assert.match(fieldController, /fetchFieldProductProposals\(partnerId/);
  assert.match(fieldController, /setProposals\(proposalPage\.items\)/);
  assert.match(partnerScreen, /اقتراحات المنتجات وحالة المراجعة/);

  assert.match(readbackContract, /operationId: listPartnerProductProposals/);
  assert.match(readbackContract, /operationId: listFieldProductProposals/);
  assert.match(masterContract, /dshCatalogProposalReadback:/);

  assert.match(migration, /DROP TABLE IF EXISTS dsh_catalog_products/);
  assert.match(migration, /DROP TABLE IF EXISTS dsh_catalog_categories/);
  assert.match(migration, /INSERT INTO dsh_master_products/);
  assert.match(migration, /INSERT INTO dsh_store_assortments/);
});

test("JRN-009 enforces cart ownership, store integrity, server pricing, and operator readback", () => {
  const handler = read("backend/internal/http/cart.go");
  const ownership = read("backend/internal/cart/ownership.go");
  const integrity = read("backend/internal/cart/item_integrity.go");
  const repository = read("backend/internal/cart/cart.go");
  const operatorScreen = read("frontend/control-panel/operations/CartActivityScreen.tsx");

  assert.match(handler, /cart\.UpsertOwnedItem\(r\.Context\(\), s\.db, actor\.ID, body\.StoreID, c\.ID/);
  assert.doesNotMatch(handler, /cart\.UpsertItem\(r\.Context\(\), s\.db/);
  assert.match(integrity, /AND client_id = \$2[\s\S]*AND store_id = \$3[\s\S]*AND state = 'active'/);
  assert.match(integrity, /return UpsertItem\(ctx, db, storeID, cartID, input\)/);

  assert.match(repository, /JOIN dsh_master_products mp ON mp\.id = a\.master_product_id/);
  assert.match(repository, /a\.unit_price, a\.available/);
  assert.match(repository, /priceReference := fmt\.Sprintf\("%\.2f", unitPrice\)/);

  assert.match(handler, /cart\.RemoveOwnedItem\(r\.Context\(\), s\.db, actor\.ID, cartID, itemID\)/);
  assert.match(handler, /cart\.ClearOwnedCart\(r\.Context\(\), s\.db, actor\.ID, cartID\)/);
  assert.doesNotMatch(handler, /cart\.RemoveItem\(r\.Context\(\), s\.db, cartID, itemID\)/);
  assert.match(ownership, /cart\.client_id = \$3/);
  assert.match(ownership, /WHERE id = \$1 AND client_id = \$2 AND state = 'active'/);

  assert.match(handler, /cart\.HydrateOperatorCartItems\(r\.Context\(\), s\.db, carts\)/);
  assert.match(integrity, /WHERE cart_id = ANY\(\$1\)/);
  assert.match(integrity, /itemsByCartID\[item\.CartID\]/);
  assert.match(operatorScreen, /c\.items\.length/);
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
