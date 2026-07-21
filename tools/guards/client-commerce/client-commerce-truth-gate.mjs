import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-commerce-truth-gate";
const violations = [];

const rules = [
  ["services/dsh/frontend/app-client/account/AddressLocationScreen.tsx", [
    [/\blocalStorage\b|\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/g, "LOCAL_OR_SEEDED_ADDRESS_TRUTH_FORBIDDEN"],
    [/Math\.random\s*\(/g, "RANDOM_LOCATION_SUCCESS_FORBIDDEN"],
    [/دفتر العناوين غير مفعّل/g, "ADDRESS_PLACEHOLDER_FORBIDDEN"],
  ], ["useClientAddressController", "createAddress", "updateAddress", "deleteAddress", "makeDefault", "Location.getCurrentPositionAsync", "position.mocked === true", "تأكيد الحذف"]],
  ["services/dsh/frontend/shared/client-address/client-address.api.ts", [
    [/\bfetch\s*\(/g, "RAW_ADDRESS_FETCH_FORBIDDEN"],
    [/\blocalStorage\b|\bsessionStorage\b/g, "LOCAL_ADDRESS_PERSISTENCE_FORBIDDEN"],
  ], ["createDshHttpClient", "setDshClientDefaultAddress", "idempotencyKey: mutation.idempotencyKey", "correlationId:", "expectedVersion,", "/dsh/client/addresses"]],
  ["services/dsh/frontend/shared/client-address/use-client-address-controller.ts", [], ["ADDRESS_ALREADY_EXISTS", "ADDRESS_CONFLICT", "IDEMPOTENCY_CONFLICT", "ADDRESS_SERVICE_AREA_UNVERIFIED", "versionedMutationContext", "shouldReloadCommittedState", "لن تُنفذ مرتين", "await load()"]],
  ["services/dsh/frontend/shared/_kernel/dsh-http-request.ts", [
    [/Math\.random\s*\(/g, "RANDOM_CORRELATION_FALLBACK_FORBIDDEN"],
  ], ["readonly expectedVersion?: number", '"If-Match-Version": String(options.expectedVersion)', "correlationFallbackSequence"]],
  ["services/dsh/frontend/app-client/cart/CartScreen.tsx", [
    [/\balert\s*\(/g, "ALERT_ONLY_COMMERCE_ACTION_FORBIDDEN"],
    [/\bbuildCartPriceSummary\b|\bfindClosestCartLandmark\b|\bmapPositionToCartCoordinates\b/g, "LOCAL_CART_OR_MAP_TRUTH_FORBIDDEN"],
    [/setAddress\s*\(|setAreaCode\s*\(|latitudeText|longitudeText|parseCoordinates/g, "DUPLICATE_CART_ADDRESS_TRUTH_FORBIDDEN"],
    [/\bas\s+any\b/g, "UNSAFE_CART_ANY_FORBIDDEN"],
  ], ["selectedAddress.serviceAreaCode", "selectedAddress.latitude", "selectedAddress.longitude", "onManageAddresses", "deliveryAddressId", "useWltDshPaymentController"]],
  ["services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx", [
    [/serviceAreaCode\s*=\s*["'][^"']+["']/g, "DEFAULT_CHECKOUT_AREA_FORBIDDEN"],
    [/\bwantsCheckout\b/g, "DEFERRED_AUTH_GATE_FORBIDDEN"],
    [/deliveryAddress:\s*/g, "CLIENT_ADDRESS_SNAPSHOT_FORBIDDEN"],
  ], ["useClientAddressController", "selectedAddress={addressController.selectedAddress}", 'authKind="authenticated"', "deliveryAddressId"]],
  ["services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx", [[/deliveryAddress\s*=/g, "RAW_ADDRESS_PROP_FORBIDDEN"]], ["deliveryAddressId", "intent.deliveryAddress"]],
  ["services/dsh/backend/internal/http/checkout.go", [
    [/DeliveryAddress\s+string\s+`json:"deliveryAddress"`/g, "CLIENT_ADDRESS_SNAPSHOT_INPUT_FORBIDDEN"],
    [/DeliveryAddress:\s*body\./g, "UNTRUSTED_ADDRESS_SNAPSHOT_FORBIDDEN"],
  ], ["DeliveryAddressID string `json:\"deliveryAddressId\"`", "clientaddress.GetOwned", "cart.CheckServiceability", "address.CheckoutSnapshot()", "CreatePricedIntentWithAddressTx"]],
  ["services/dsh/backend/internal/http/client_addresses.go", [
    [/r\.URL\.Query\(\)\.Get\(["']clientId["']\)/g, "ENUMERABLE_ADDRESS_OWNER_FORBIDDEN"],
    [/clientaddress\.Update\s*\(/g, "NON_IDEMPOTENT_ADDRESS_UPDATE_FORBIDDEN"],
    [/clientaddress\.Delete\s*\(/g, "NON_IDEMPOTENT_ADDRESS_DELETE_FORBIDDEN"],
    [/clientaddress\.SetDefault\s*\(/g, "NON_IDEMPOTENT_ADDRESS_DEFAULT_FORBIDDEN"],
  ], ['requireActor(w, r, "client")', "addressMutationContext", "addressExpectedVersion", "clientaddress.FindUpdateReplay", "clientaddress.UpdateIdempotent", "clientaddress.DeleteIdempotent", "clientaddress.SetDefaultIdempotent", "observeClientAddressOperation", "clientaddress.RecordOperation", "clientaddress.IsDuplicateError", "IDEMPOTENCY_CONFLICT", "ADDRESS_ALREADY_EXISTS", "ValidateServiceArea"]],
  ["services/dsh/backend/internal/clientaddress/address.go", [], ["WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL", "create_idempotency_key = $2", "CheckoutSnapshot", "pg_advisory_xact_lock", "ErrConflict"]],
  ["services/dsh/backend/internal/clientaddress/idempotent_mutations.go", [], ["ErrMutationIdempotencyConflict", "fingerprintMutation", "loadMutationReceipt", "saveMutationReceipt", "func UpdateIdempotent", "func DeleteIdempotent", "func SetDefaultIdempotent", 'recordEvent(ctx, tx, promotedID, clientID, "defaulted"'] ],
  ["services/dsh/backend/internal/clientaddress/update_replay.go", [], ["FindUpdateReplay", "loadMutationReceipt", "replayAddressMutation", "lockClient", "mutable service-area validation"]],
  ["services/dsh/backend/internal/clientaddress/mutation_receipt_retention.go", [], ["normalizeReceiptPurgeLimit", "PurgeExpiredMutationReceipts", "dsh_purge_expired_client_address_mutation_receipts"]],
  ["services/dsh/backend/internal/http/client_address_privacy.go", [], ["clientaddress.PurgeExpiredMutationReceipts", "expiredMutationReceiptsPurged"]],
  ["services/dsh/backend/internal/clientaddress/telemetry.go", [[/RecipientName|PhoneE164|AddressLine|Latitude|Longitude|CorrelationID/g, "ADDRESS_TELEMETRY_PII_FIELD_FORBIDDEN"]], ["aggregate-only", "func RecordOperation", "func TelemetrySnapshot", "idempotency_conflict", "service_area_unverified"]],
  ["services/dsh/backend/internal/clientaddress/diagnostics.go", [[/recipient_name|phone_e164|address_line|delivery_instructions/g, "ADDRESS_DIAGNOSTICS_PII_QUERY_FORBIDDEN"]], ["ClientsWithMultipleDefaults", "ClientsWithoutDefault", "DuplicateActiveFingerprints", "MutationReceipts", "func DiagnoseIntegrity"]],
  ["services/dsh/backend/internal/http/unified_handler_aliases.go", [], ["client-address-book", "s.handlePlatformKpis(w, r)", "AnalyticsPermissionRead", "clientaddress.DiagnoseIntegrity", "clientaddress.TelemetrySnapshot", '"clientAddressBook"']],
  ["services/dsh/backend/internal/clientaddress/duplicate_error.go", [], ["uq_dsh_client_addresses_active_fingerprint", "23505", "IsDuplicateError"]],
  ["services/dsh/database/migrations/dsh-056_client_addresses.sql", [[/UNIQUE \(client_id, create_idempotency_key\)/g, "FULL_HISTORY_IDEMPOTENCY_UNIQUE_FORBIDDEN"]], ["uq_dsh_client_addresses_active_idempotency", "uq_dsh_client_addresses_single_default", "WHERE deleted_at IS NULL", "dsh_client_address_events"]],
  ["services/dsh/database/migrations/dsh-057_checkout_address_reference.sql", [], ["delivery_address_id", "fk_dsh_checkout_intents_delivery_address", "REFERENCES dsh_client_addresses(id)"]],
  ["services/dsh/database/migrations/dsh-901_client_address_logical_deduplication.sql", [], ["dsh_client_address_fingerprint", "trg_dsh_client_address_fingerprint", "uq_dsh_client_addresses_active_fingerprint", "deduplicated", "canonicalAddressId"]],
  ["services/dsh/database/migrations/dsh-907_jrn_005_address_mutation_receipts.sql", [[/response_body|recipient_name|phone_e164|address_line/g, "ADDRESS_RECEIPT_PII_FORBIDDEN"]], ["dsh_client_address_mutation_receipts", "PRIMARY KEY (client_id, idempotency_key)", "request_fingerprint", "result_deleted", "PII-free"]],
  ["services/dsh/database/migrations/dsh-908_jrn_005_mutation_receipt_retention.sql", [], ["expires_at", "30 days", "FOR UPDATE SKIP LOCKED", "dsh_purge_expired_client_address_mutation_receipts", "idx_dsh_client_address_mutation_receipts_expiry"]],
  ["services/dsh/database/tests/dsh-901_client_address_logical_deduplication.sql", [], ["logical duplicate insert was not rejected", "logical duplicate update was not rejected", "uq_dsh_client_addresses_active_fingerprint"]],
  ["services/dsh/database/tests/dsh-907_jrn_005_address_mutation_receipts.sql", [], ["client-scoped idempotency-key reuse was not rejected", "mutation receipt schema contains address PII or response body", "idx_dsh_client_address_mutation_receipts_address"]],
  ["services/dsh/database/tests/dsh-908_jrn_005_mutation_receipt_retention.sql", [], ["expired mutation receipt was not purged", "fresh mutation receipt was purged", "invalid purge limit was accepted", "idx_dsh_client_address_mutation_receipts_expiry"]],
  ["services/dsh/backend/internal/clientaddress/idempotent_mutations_db_test.go", [], ["TestIdempotentAddressMutationsAreExactlyOnceAndClientScoped", "ErrMutationIdempotencyConflict", "updated events", "defaulted events", "deleted events", "active=1 default=1"]],
  ["services/dsh/contracts/dsh.client-address.openapi.yaml", [], ["version: 0.3.0", "durable PII-free idempotency receipts", "updateDshClientAddress", "deleteDshClientAddress", "setDshClientDefaultAddress", "Reuse with a different request returns IDEMPOTENCY_CONFLICT", "ExpectedVersion", "ServiceAreaUnverified"]],
  ["governance/product/contracts/jrn-005-client-address-book.product-truth.json", [], ["JRN-005", "acceptanceCriteria", "negativeInvariants", "No address PII"]],
  ["services/dsh/contracts/jrn-005-all-slices-registry.json", [], ["FS-01", "FS-18", "READY_FOR_TARGETED_VERIFICATION", "NEEDS_SAME_COMMIT_CI_AND_INDEPENDENT_APPROVALS"]],
  ["services/dsh/contracts/jrn-005-consistency-registry.json", [], ["schemaVersion\": 2", "uq_dsh_client_addresses_active_fingerprint", "prevent-active-logical-duplicates", "ADDRESS_ALREADY_EXISTS", "journeys/jrn-005/all-slices"]],
  ["services/dsh/contracts/jrn-005-observability-slo.json", [], ["mutationCorrectness", "forbiddenSignalFields", "ADDRESS_PRIVACY_JOB_FAILURE", "journeys/jrn-005/all-slices"]],
  ["governance/runbooks/JRN-005_CLIENT_ADDRESS_OPERATIONS.md", [], ["## 5xx burn", "## Privacy job", "## Rollback", "CLOSED_WITH_EVIDENCE"]],
  ["services/dsh/tests/jrn-005-all-slices.test.mjs", [], ["FS-01..FS-04", "FS-05..FS-08", "FS-09..FS-12", "FS-13..FS-16", "FS-17..FS-18"]],
  ["services/dsh/tests/jrn-005-runtime-observability.test.mjs", [], ["aggregate telemetry", "database invariant diagnostics", "clientaddress.DiagnoseIntegrity", "clientaddress.TelemetrySnapshot"]],
  ["services/dsh/tests/jrn-005-replay-compatibility.test.mjs", [], ["FindUpdateReplay", "service-area validation must run after replay lookup", "client-address-book", "s.handlePlatformKpis"]],
  [".github/workflows/jrn-005-all-slices.yml", [], ["postgres:16-alpine", "jrn-005-replay-compatibility.test.mjs", "go test ./internal/clientaddress ./internal/http", "DSH_TEST_DATABASE_URL", "dsh-908_jrn_005_mutation_receipt_retention.sql", "TestIdempotentAddressMutationsAreExactlyOnceAndClientScoped", "journeys/jrn-005/all-slices"]],
  ["governance/evidence/JRN-005_CLIENT_ADDRESS_BOOK_CLOSURE.json", [], ["functionalSlices", "sameCommitVerification", "approvalMatrix", "formalClosureRule"]],
  ["contracts/master.openapi.yaml", [], ["dshClientAddress: ../services/dsh/contracts/dsh.client-address.openapi.yaml"]],
  ["tools/guards/backend-api-binding-gate.mjs", [], ['"services/dsh/contracts/dsh.client-address.openapi.yaml"']],
  ["services/dsh/frontend/app-client/store/StoreMeasurementSheet.tsx", [[/getProductMeasurementOptions|\bmultipliers\b|parseFloat\s*\(|basePrice\s*\*/g, "LOCAL_PRODUCT_MEASUREMENT_OR_PRICE_FORBIDDEN"]], ["Quantity-only product sheet", "server resolves", "isSubmitting", "errorMessage"]],
  ["services/dsh/frontend/app-client/store/StoreDetailShell.tsx", [[/onPress:\s*\(\)\s*=>\s*\{\s*\}|onImagePress=\{\(\)\s*=>\s*\{\s*\}\}|\bas\s+any\b|priceReference:\s*`\$\{/g, "DEAD_OR_UNSAFE_STORE_ACTION_FORBIDDEN"]], ["DshFulfillmentDeliveryMode", "handleOpenProduct", "onCartPress={onGoToCart}", "const accepted = await onAddToCart(", "if (accepted)"]],
  ["services/wlt/frontend/shared/dsh/use-wlt-dsh-payment-controller.tsx", [[/grandTotal|amountRows/g, "LOCAL_WLT_AMOUNT_FORBIDDEN"]], ["never calculates totals", 'useState<PaymentMethodKey>("cod")', "مزود WLT الحقيقي"]],
];

for (const [file, forbidden, required] of rules) {
  const content = read(file);
  for (const [pattern, message] of forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message });
    }
  }
  for (const marker of required) {
    if (!content.includes(marker)) violations.push({ file, line: 0, message: `REQUIRED_CLIENT_COMMERCE_MARKER_MISSING:${marker}` });
  }
}

fail(guardId, violations);
