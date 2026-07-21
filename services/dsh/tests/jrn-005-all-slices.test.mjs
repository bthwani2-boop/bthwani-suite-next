import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));

const productTruthPath = "governance/product/contracts/jrn-005-client-address-book.product-truth.json";
const sliceRegistryPath = "services/dsh/contracts/jrn-005-all-slices-registry.json";
const consistencyPath = "services/dsh/contracts/jrn-005-consistency-registry.json";
const sloPath = "services/dsh/contracts/jrn-005-observability-slo.json";

test("JRN-005 FS-01..FS-04 fixes product truth, actors, states and ownership boundaries", () => {
  const truth = json(productTruthPath);
  const registry = json(sliceRegistryPath);
  const handler = read("services/dsh/backend/internal/http/client_addresses.go");
  const checkout = read("services/dsh/backend/internal/http/checkout.go");

  assert.equal(truth.journeyId, "JRN-005");
  assert.equal(truth.status, "IMPLEMENTED_PENDING_SAME_COMMIT_EVIDENCE");
  assert.deepEqual(truth.requiredSurfaces, ["app-client", "dsh-backend", "postgresql"]);
  assert.ok(truth.acceptanceCriteria.length >= 10);
  assert.ok(truth.negativeInvariants.length >= 6);
  assert.equal(registry.slices.length, 18);
  assert.deepEqual(registry.slices.slice(0, 4).map(({ id }) => id), ["FS-01", "FS-02", "FS-03", "FS-04"]);
  assert.match(handler, /requireActor\(w, r, "client"\)/);
  assert.doesNotMatch(handler, /Query\(\)\.Get\(["']clientId["']\)/);
  assert.match(checkout, /clientaddress\.GetOwned/);
  assert.doesNotMatch(checkout, /DeliveryAddress\s+string\s+`json:"deliveryAddress"`/);
});

test("JRN-005 FS-05..FS-08 closes persistence, contract, backend and event recovery", () => {
  const baseMigration = read("services/dsh/database/migrations/dsh-056_client_addresses.sql");
  const dedupeMigration = read("services/dsh/database/migrations/dsh-901_client_address_logical_deduplication.sql");
  const geofenceMigration = read("services/dsh/database/migrations/dsh-906_jrn_006_client_address_geofence_binding.sql");
  const address = read("services/dsh/backend/internal/clientaddress/address.go");
  const handler = read("services/dsh/backend/internal/http/client_addresses.go");
  const contract = read("services/dsh/contracts/dsh.client-address.openapi.yaml");

  assert.match(baseMigration, /uq_dsh_client_addresses_single_default/);
  assert.match(baseMigration, /uq_dsh_client_addresses_active_idempotency/);
  assert.match(baseMigration, /dsh_client_address_events/);
  assert.match(dedupeMigration, /uq_dsh_client_addresses_active_fingerprint/);
  assert.match(dedupeMigration, /trg_dsh_client_address_fingerprint/);
  assert.match(geofenceMigration, /dsh_enforce_client_address_service_area/);
  assert.match(address, /pg_advisory_xact_lock/);
  assert.match(address, /ExpectedVersion/);
  assert.match(handler, /FindCreateReplay/);
  assert.match(handler, /ValidateServiceArea/);
  assert.match(handler, /ADDRESS_ALREADY_EXISTS/);
  for (const operation of [
    "listDshClientAddresses",
    "createDshClientAddress",
    "updateDshClientAddress",
    "deleteDshClientAddress",
    "setDshClientDefaultAddress",
  ]) assert.match(contract, new RegExp(`operationId: ${operation}`));
  assert.match(contract, /duplicate-address/);
  assert.match(contract, /ServiceAreaUnverified/);
});

test("JRN-005 FS-09..FS-12 binds one shared brain, client surface and committed readback", () => {
  const api = read("services/dsh/frontend/shared/client-address/client-address.api.ts");
  const controller = read("services/dsh/frontend/shared/client-address/use-client-address-controller.ts");
  const attempt = read("services/dsh/frontend/shared/client-address/client-address-create-attempt.ts");
  const screen = read("services/dsh/frontend/app-client/account/AddressLocationScreen.tsx");
  const cart = read("services/dsh/frontend/app-client/cart/CartScreen.tsx");
  const checkout = read("services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx");
  const consistency = json(consistencyPath);

  assert.match(api, /createDshHttpClient/);
  assert.doesNotMatch(api, /\bfetch\s*\(/);
  assert.match(attempt, /AsyncStorage/);
  assert.match(attempt, /getOrCreateClientAddressAttempt/);
  assert.match(controller, /ADDRESS_ALREADY_EXISTS/);
  assert.match(controller, /ADDRESS_CONFLICT/);
  assert.match(controller, /await load\(\)/);
  assert.match(screen, /useClientAddressController/);
  assert.match(screen, /Location\.getCurrentPositionAsync/);
  assert.match(screen, /تأكيد الحذف/);
  assert.match(cart, /selectedAddress\.serviceAreaCode/);
  assert.match(checkout, /deliveryAddressId/);
  assert.ok(consistency.forbiddenTruthSources.includes("cart-owned address copies"));
  assert.doesNotMatch(screen, /\blocalStorage\b|\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/);
});

test("JRN-005 FS-13..FS-16 closes privacy, experience, observability and cleanup", () => {
  const privacyHandler = read("services/dsh/backend/internal/http/client_address_privacy.go");
  const privacyMigration = read("services/dsh/database/migrations/dsh-081_client_address_subject_anonymization.sql");
  const screen = read("services/dsh/frontend/app-client/account/AddressLocationScreen.tsx");
  const slo = json(sloPath);
  const runbook = read("governance/runbooks/JRN-005_CLIENT_ADDRESS_OPERATIONS.md");
  const guard = read("tools/guards/client-commerce/client-commerce-truth-gate.mjs");

  assert.match(privacyHandler, /requirePermission|requireActor/);
  assert.match(privacyMigration, /subjectLinkSevered/);
  assert.match(privacyMigration, /addressEventsScrubbed/);
  assert.match(screen, /textAlign: "right"/);
  assert.match(screen, /disabled=\{controller\.mutating\}/);
  assert.match(screen, /إعادة المحاولة/);
  assert.equal(slo.journeyId, "JRN-005");
  assert.equal(slo.serviceLevelObjectives.mutationCorrectness.target, 1);
  assert.ok(slo.forbiddenSignalFields.includes("phone_e164"));
  assert.match(runbook, /## Rollback/);
  assert.match(runbook, /## Privacy job/);
  assert.match(guard, /dsh-901_client_address_logical_deduplication/);
  assert.match(guard, /LOCAL_OR_SEEDED_ADDRESS_TRUTH_FORBIDDEN/);
});

test("JRN-005 FS-17..FS-18 registers targeted same-commit verification and evidence", () => {
  const registry = json(sliceRegistryPath);
  const ids = registry.slices.map(({ id }) => id);
  const expected = Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
  const workflow = read(".github/workflows/jrn-005-all-slices.yml");
  const evidence = json("governance/evidence/JRN-005_CLIENT_ADDRESS_BOOK_CLOSURE.json");
  const executionLog = read("governance/evidence/JRN-005_SLICE_EXECUTION_LOG.md");

  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, 18);
  assert.match(workflow, /journeys\/jrn-005\/all-slices/);
  assert.match(workflow, /postgres:16-alpine/);
  assert.match(workflow, /dsh-901_client_address_logical_deduplication\.sql/);
  assert.match(workflow, /jrn-005-all-slices\.test\.mjs/);
  assert.equal(evidence.journeyId, "JRN-005");
  assert.equal(evidence.functionalSlices.registered, 18);
  assert.match(executionLog, /FS-01/);
  assert.match(executionLog, /FS-18/);
});
