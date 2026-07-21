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
  assert.equal(truth.status, "IMPLEMENTED_VERIFIED_PENDING_INDEPENDENT_EVIDENCE");
  assert.equal(truth.verifiedImplementationCommit, "bda5452525840cbe4b357713032747cfc500bfc4");
  assert.deepEqual(truth.requiredSurfaces, ["app-client", "dsh-backend", "postgresql"]);
  assert.ok(truth.acceptanceCriteria.length >= 15);
  assert.ok(truth.negativeInvariants.length >= 8);
  assert.equal(registry.slices.length, 18);
  assert.equal(registry.codeClosureDecision, "CLOSED");
  assert.deepEqual(registry.openCodeGaps, []);
  assert.deepEqual(registry.slices.slice(0, 4).map(({ id }) => id), ["FS-01", "FS-02", "FS-03", "FS-04"]);
  assert.match(handler, /requireActor\(w, r, "client"\)/);
  assert.doesNotMatch(handler, /Query\(\)\.Get\(["']clientId["']\)/);
  assert.match(checkout, /clientaddress\.GetOwned/);
  assert.doesNotMatch(checkout, /DeliveryAddress\s+string\s+`json:"deliveryAddress"`/);
});

test("JRN-005 FS-05..FS-08 implements persistence, durable retries, OCC and event recovery", () => {
  const baseMigration = read("services/dsh/database/migrations/dsh-056_client_addresses.sql");
  const dedupeMigration = read("services/dsh/database/migrations/dsh-901_client_address_logical_deduplication.sql");
  const receiptMigration = read("services/dsh/database/migrations/dsh-907_jrn_005_address_mutation_receipts.sql");
  const receiptTest = read("services/dsh/database/tests/dsh-907_jrn_005_address_mutation_receipts.sql");
  const geofenceMigration = read("services/dsh/database/migrations/dsh-906_jrn_006_client_address_geofence_binding.sql");
  const address = read("services/dsh/backend/internal/clientaddress/address.go");
  const idempotent = read("services/dsh/backend/internal/clientaddress/idempotent_mutations.go");
  const handler = read("services/dsh/backend/internal/http/client_addresses.go");
  const contract = read("services/dsh/contracts/dsh.client-address.openapi.yaml");

  assert.match(baseMigration, /uq_dsh_client_addresses_single_default/);
  assert.match(baseMigration, /uq_dsh_client_addresses_active_idempotency/);
  assert.match(baseMigration, /dsh_client_address_events/);
  assert.match(dedupeMigration, /uq_dsh_client_addresses_active_fingerprint/);
  assert.match(dedupeMigration, /trg_dsh_client_address_fingerprint/);
  assert.match(receiptMigration, /dsh_client_address_mutation_receipts/);
  assert.match(receiptMigration, /PRIMARY KEY \(client_id, idempotency_key\)/);
  assert.doesNotMatch(receiptMigration, /response_body|recipient_name|phone_e164|address_line/);
  assert.match(receiptTest, /client-scoped idempotency-key reuse was not rejected/);
  assert.match(receiptTest, /mutation receipt schema contains address PII or response body/);
  assert.match(geofenceMigration, /dsh_enforce_client_address_service_area/);
  assert.match(address, /pg_advisory_xact_lock/);
  assert.match(idempotent, /func UpdateIdempotent/);
  assert.match(idempotent, /func DeleteIdempotent/);
  assert.match(idempotent, /func SetDefaultIdempotent/);
  assert.match(idempotent, /loadMutationReceipt/);
  assert.match(idempotent, /saveMutationReceipt/);
  assert.match(idempotent, /recordEvent\(ctx, tx, promotedID, clientID, "defaulted"/);
  assert.match(handler, /addressMutationContext/);
  assert.match(handler, /addressExpectedVersion/);
  assert.match(handler, /UpdateIdempotent/);
  assert.match(handler, /DeleteIdempotent/);
  assert.match(handler, /SetDefaultIdempotent/);
  assert.match(handler, /IDEMPOTENCY_CONFLICT/);
  assert.match(handler, /ValidateServiceArea/);
  for (const operation of [
    "listDshClientAddresses",
    "createDshClientAddress",
    "updateDshClientAddress",
    "deleteDshClientAddress",
    "setDshClientDefaultAddress",
  ]) assert.match(contract, new RegExp(`operationId: ${operation}`));
  assert.match(contract, /durable PII-free idempotency receipts/);
  assert.match(contract, /Reuse with a different request returns IDEMPOTENCY_CONFLICT/);
  assert.match(contract, /ServiceAreaUnverified/);
});

test("JRN-005 FS-09..FS-12 binds retry-safe shared code, client surface and committed readback", () => {
  const api = read("services/dsh/frontend/shared/client-address/client-address.api.ts");
  const controller = read("services/dsh/frontend/shared/client-address/use-client-address-controller.ts");
  const attempt = read("services/dsh/frontend/shared/client-address/client-address-create-attempt.ts");
  const screen = read("services/dsh/frontend/app-client/account/AddressLocationScreen.tsx");
  const cart = read("services/dsh/frontend/app-client/cart/CartScreen.tsx");
  const checkout = read("services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx");
  const consistency = json(consistencyPath);

  assert.match(api, /createDshHttpClient/);
  assert.doesNotMatch(api, /\bfetch\s*\(/);
  assert.match(api, /setDshClientDefaultAddress/);
  assert.match(api, /idempotencyKey: mutation\.idempotencyKey/);
  assert.match(api, /expectedVersion,/);
  assert.match(attempt, /AsyncStorage/);
  assert.match(attempt, /getOrCreateClientAddressAttempt/);
  assert.match(controller, /ADDRESS_ALREADY_EXISTS/);
  assert.match(controller, /ADDRESS_CONFLICT/);
  assert.match(controller, /IDEMPOTENCY_CONFLICT/);
  assert.match(controller, /ADDRESS_SERVICE_AREA_UNVERIFIED/);
  assert.match(controller, /versionedMutationContext/);
  assert.match(controller, /shouldReloadCommittedState/);
  assert.match(controller, /await load\(\)/);
  assert.match(screen, /useClientAddressController/);
  assert.match(screen, /Location\.getCurrentPositionAsync/);
  assert.match(screen, /تأكيد الحذف/);
  assert.match(cart, /selectedAddress\.serviceAreaCode/);
  assert.match(checkout, /deliveryAddressId/);
  assert.ok(consistency.forbiddenTruthSources.includes("cart-owned address copies"));
  assert.doesNotMatch(screen, /\blocalStorage\b|\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/);
});

test("JRN-005 FS-13..FS-16 closes privacy, experience, observability and cleanup in code", () => {
  const privacyHandler = read("services/dsh/backend/internal/http/client_address_privacy.go");
  const privacyMigration = read("services/dsh/database/migrations/dsh-081_client_address_subject_anonymization.sql");
  const receiptMigration = read("services/dsh/database/migrations/dsh-907_jrn_005_address_mutation_receipts.sql");
  const screen = read("services/dsh/frontend/app-client/account/AddressLocationScreen.tsx");
  const controller = read("services/dsh/frontend/shared/client-address/use-client-address-controller.ts");
  const slo = json(sloPath);
  const runbook = read("governance/runbooks/JRN-005_CLIENT_ADDRESS_OPERATIONS.md");
  const guard = read("tools/guards/client-commerce/client-commerce-truth-gate.mjs");

  assert.match(privacyHandler, /requirePermission|requireActor/);
  assert.match(privacyMigration, /subjectLinkSevered/);
  assert.match(privacyMigration, /addressEventsScrubbed/);
  assert.doesNotMatch(receiptMigration, /response_body|recipient_name|phone_e164/);
  assert.match(screen, /textAlign: "right"/);
  assert.match(screen, /disabled=\{controller\.mutating\}/);
  assert.match(screen, /إعادة المحاولة/);
  assert.match(controller, /لن تُنفذ مرتين/);
  assert.equal(slo.journeyId, "JRN-005");
  assert.equal(slo.serviceLevelObjectives.mutationCorrectness.target, 1);
  assert.ok(slo.forbiddenSignalFields.includes("phone_e164"));
  assert.match(runbook, /## Rollback/);
  assert.match(runbook, /## Privacy job/);
  assert.match(guard, /dsh-907_jrn_005_address_mutation_receipts/);
  assert.match(guard, /LOCAL_OR_SEEDED_ADDRESS_TRUTH_FORBIDDEN/);
});

test("JRN-005 FS-17..FS-18 executes the real code gates on one commit", () => {
  const registry = json(sliceRegistryPath);
  const ids = registry.slices.map(({ id }) => id);
  const expected = Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
  const workflow = read(".github/workflows/jrn-005-all-slices.yml");
  const evidence = json("governance/evidence/JRN-005_CLIENT_ADDRESS_BOOK_CLOSURE.json");
  const executionLog = read("governance/evidence/JRN-005_SLICE_EXECUTION_LOG.md");

  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, 18);
  assert.ok(registry.slices.slice(0, 17).every(({ status }) => status === "IMPLEMENTED_VERIFIED"));
  assert.equal(registry.slices[17].status, "CODE_CLOSED_PENDING_INDEPENDENT_EVIDENCE");
  assert.match(workflow, /journeys\/jrn-005\/all-slices/);
  assert.match(workflow, /postgres:16-alpine/);
  assert.match(workflow, /go test \.\/internal\/clientaddress \.\/internal\/http/);
  assert.match(workflow, /tsconfig\.jrn-005-app-client\.json/);
  assert.match(workflow, /dsh-901_client_address_logical_deduplication\.sql/);
  assert.match(workflow, /dsh-907_jrn_005_address_mutation_receipts\.sql/);
  assert.match(workflow, /dsh-908_jrn_005_mutation_receipt_retention\.sql/);
  assert.match(workflow, /dsh-906_jrn_006_client_address_geofence_binding\.sql/);
  assert.match(workflow, /jrn-005-all-slices\.test\.mjs/);
  assert.equal(evidence.journeyId, "JRN-005");
  assert.equal(evidence.codeClosure, "COMPLETE");
  assert.equal(evidence.functionalSlices.registered, 18);
  assert.equal(evidence.functionalSlices.openCodeGaps, 0);
  assert.match(executionLog, /FS-01/);
  assert.match(executionLog, /FS-18/);
});
