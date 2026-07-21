import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-commerce-truth-gate";
const violations = [];

const rules = [
  ["services/dsh/frontend/app-client/account/AddressLocationScreen.tsx", [
    [/\blocalStorage\b|\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/g, "LOCAL_OR_SEEDED_ADDRESS_TRUTH_FORBIDDEN"],
    [/Math\.random\s*\(/g, "RANDOM_LOCATION_SUCCESS_FORBIDDEN"],
    [/دفتر العناوين غير مفعّل/g, "ADDRESS_PLACEHOLDER_FORBIDDEN"],
  ], ["useClientAddressController", "createAddress", "updateAddress", "deleteAddress", "makeDefault", "Location.getCurrentPositionAsync", "position.mocked === true"]],
  ["services/dsh/frontend/shared/client-address/client-address.api.ts", [
    [/\bfetch\s*\(/g, "RAW_ADDRESS_FETCH_FORBIDDEN"],
    [/\blocalStorage\b|\bsessionStorage\b/g, "LOCAL_ADDRESS_PERSISTENCE_FORBIDDEN"],
  ], ["createDshHttpClient", "idempotencyKey:", "correlationId:", "expectedVersion,", "/dsh/client/addresses"]],
  ["services/dsh/frontend/shared/client-address/use-client-address-controller.ts", [], ["ADDRESS_ALREADY_EXISTS", "هذا العنوان محفوظ بالفعل", "await load()"]],
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
  ["services/dsh/backend/internal/http/client_addresses.go", [[/r\.URL\.Query\(\)\.Get\(["']clientId["']\)/g, "ENUMERABLE_ADDRESS_OWNER_FORBIDDEN"]], ['requireActor(w, r, "client")', 'r.Header.Get("Idempotency-Key")', 'r.Header.Get("If-Match-Version")', "clientaddress.Create", "clientaddress.Update", "clientaddress.Delete", "clientaddress.SetDefault", "clientaddress.IsDuplicateError", "ADDRESS_ALREADY_EXISTS"]],
  ["services/dsh/backend/internal/clientaddress/address.go", [], ["WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL", "create_idempotency_key = $2", "CheckoutSnapshot", "pg_advisory_xact_lock", "ErrConflict"]],
  ["services/dsh/backend/internal/clientaddress/duplicate_error.go", [], ["uq_dsh_client_addresses_active_fingerprint", "23505", "IsDuplicateError"]],
  ["services/dsh/database/migrations/dsh-056_client_addresses.sql", [[/UNIQUE \(client_id, create_idempotency_key\)/g, "FULL_HISTORY_IDEMPOTENCY_UNIQUE_FORBIDDEN"]], ["uq_dsh_client_addresses_active_idempotency", "uq_dsh_client_addresses_single_default", "WHERE deleted_at IS NULL", "dsh_client_address_events"]],
  ["services/dsh/database/migrations/dsh-057_checkout_address_reference.sql", [], ["delivery_address_id", "fk_dsh_checkout_intents_delivery_address", "REFERENCES dsh_client_addresses(id)"]],
  ["services/dsh/database/migrations/dsh-901_client_address_logical_deduplication.sql", [], ["dsh_client_address_fingerprint", "trg_dsh_client_address_fingerprint", "uq_dsh_client_addresses_active_fingerprint", "deduplicated", "canonicalAddressId"]],
  ["services/dsh/database/tests/dsh-901_client_address_logical_deduplication.sql", [], ["logical duplicate insert was not rejected", "logical duplicate update was not rejected", "uq_dsh_client_addresses_active_fingerprint"]],
  ["services/dsh/contracts/dsh.client-address.openapi.yaml", [], ["listDshClientAddresses", "createDshClientAddress", "updateDshClientAddress", "deleteDshClientAddress", "setDshClientDefaultAddress", "x-bthwani-client-binding: MANUAL_TYPED_ADAPTER"]],
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
