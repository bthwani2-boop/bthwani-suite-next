import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-commerce-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/app-client/account/AddressLocationScreen.tsx",
    forbidden: [
      [/\blocalStorage\b/g, "LOCAL_ADDRESS_TRUTH_FORBIDDEN"],
      [/\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/g, "SEEDED_ADDRESS_OR_MAP_FORBIDDEN"],
      [/Math\.random\s*\(/g, "RANDOM_LOCATION_SUCCESS_FORBIDDEN"],
      [/دفتر العناوين غير مفعّل/g, "ADDRESS_PLACEHOLDER_FORBIDDEN"],
      [/onPress=\{\(\)\s*=>\s*\{\s*\}\}/g, "DEAD_ADDRESS_ACTION_FORBIDDEN"],
    ],
    required: [
      "useClientAddressController",
      "createAddress",
      "updateAddress",
      "deleteAddress",
      "makeDefault",
      "Location.getCurrentPositionAsync",
      "position.mocked === true",
    ],
  },
  {
    file: "services/dsh/frontend/shared/client-address/client-address.api.ts",
    forbidden: [
      [/\blocalStorage\b|\bsessionStorage\b/g, "LOCAL_ADDRESS_PERSISTENCE_FORBIDDEN"],
      [/deliveryAddress:\s*/g, "CLIENT_SUPPLIED_ADDRESS_SNAPSHOT_FORBIDDEN"],
    ],
    required: [
      '"Idempotency-Key"',
      '"X-Correlation-ID"',
      '"If-Match-Version"',
      "/dsh/client/addresses",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/DshClientSurface.tsx",
    forbidden: [
      [/serviceAreaCode=["']sana["']/g, "HARDCODED_CHECKOUT_AREA_FORBIDDEN"],
      [/\bas\s+ClientTab\b/g, "UNSAFE_CLIENT_TAB_CAST_FORBIDDEN"],
    ],
    required: [
      "isClientTab",
      "ClientCheckoutRoute",
      "openOrderTracking",
      "openAddressBookFromCart",
      "returnFromAddressBookToCart",
      "onManageAddresses={openAddressBookFromCart}",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/cart/CartScreen.tsx",
    forbidden: [
      [/\balert\s*\(/g, "ALERT_ONLY_COMMERCE_ACTION_FORBIDDEN"],
      [/\bbuildCartPriceSummary\b/g, "LOCAL_CART_TOTAL_CALCULATION_FORBIDDEN"],
      [/\bnavigator\.geolocation\b/g, "UNGOVERNED_BROWSER_GEOLOCATION_FORBIDDEN"],
      [/\bfindClosestCartLandmark\b|\bmapPositionToCartCoordinates\b/g, "SIMULATED_CART_MAP_FORBIDDEN"],
      [/15\.3520|44\.1780|حي الأصبحي/g, "HARDCODED_CLIENT_LOCATION_FORBIDDEN"],
      [/\bany\b/g, "UNSAFE_CART_ANY_FORBIDDEN"],
      [/setAddress\s*\(|setAreaCode\s*\(|latitudeText|longitudeText/g, "DUPLICATE_CART_ADDRESS_TRUTH_FORBIDDEN"],
      [/parseCoordinates/g, "MANUAL_CART_COORDINATE_PARSE_FORBIDDEN"],
    ],
    required: [
      "useServiceabilityController",
      "selectedAddress.serviceAreaCode",
      "selectedAddress.latitude",
      "selectedAddress.longitude",
      "selectedAddress?.id",
      "onManageAddresses",
      "useWltDshPaymentController",
      "deliveryAddressId",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx",
    forbidden: [
      [/serviceAreaCode\s*=\s*["'][^"']+["']/g, "DEFAULT_CHECKOUT_AREA_FORBIDDEN"],
      [/\bwantsCheckout\b/g, "DEFERRED_AUTH_GATE_CAN_TRAP_CART_FORBIDDEN"],
      [/authKind=\{[^}]*unauthenticated/g, "UNAUTHENTICATED_CART_LOAD_FORBIDDEN"],
      [/deliveryAddress:\s*/g, "CLIENT_CHECKOUT_ADDRESS_SNAPSHOT_FORBIDDEN"],
    ],
    required: [
      "useStoreDetailController",
      "useClientAddressController",
      "selectedAddress={addressController.selectedAddress}",
      "identity.state.kind !== \"authenticated\"",
      'authKind="authenticated"',
      "deliveryAddressId",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx",
    forbidden: [[/deliveryAddress\s*=/g, "RAW_ADDRESS_PROP_FORBIDDEN"]],
    required: [
      "deliveryAddressId",
      "DshCreateIntentInput",
      "intent.deliveryAddress",
    ],
  },
  {
    file: "services/dsh/backend/internal/http/checkout.go",
    forbidden: [
      [/DeliveryAddress\s+string\s+`json:"deliveryAddress"`/g, "CLIENT_ADDRESS_SNAPSHOT_INPUT_FORBIDDEN"],
      [/DeliveryAddress:\s*body\./g, "UNTRUSTED_ADDRESS_SNAPSHOT_FORBIDDEN"],
    ],
    required: [
      "DeliveryAddressID string `json:\"deliveryAddressId\"`",
      "clientaddress.GetOwned",
      "cart.CheckServiceability",
      "address.CheckoutSnapshot()",
      "CreatePricedIntentWithAddressTx",
    ],
  },
  {
    file: "services/dsh/backend/internal/http/client_addresses.go",
    forbidden: [[/r\.URL\.Query\(\)\.Get\(["']clientId["']\)/g, "ENUMERABLE_CLIENT_ADDRESS_OWNER_FORBIDDEN"]],
    required: [
      'requireActor(w, r, "client")',
      'r.Header.Get("Idempotency-Key")',
      'r.Header.Get("If-Match-Version")',
      "clientaddress.Create",
      "clientaddress.Update",
      "clientaddress.Delete",
      "clientaddress.SetDefault",
    ],
  },
  {
    file: "services/dsh/backend/internal/clientaddress/address.go",
    required: [
      "WHERE id = $1 AND client_id = $2 AND deleted_at IS NULL",
      "UNIQUE",
      "CheckoutSnapshot",
      "pg_advisory_xact_lock",
      "ErrConflict",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/database/migrations/dsh-056_client_addresses.sql",
    required: [
      "dsh_client_addresses",
      "uq_dsh_client_addresses_single_default",
      "UNIQUE (client_id, create_idempotency_key)",
      "dsh_client_address_events",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/database/migrations/dsh-057_checkout_address_reference.sql",
    required: [
      "delivery_address_id",
      "fk_dsh_checkout_intents_delivery_address",
      "REFERENCES dsh_client_addresses(id)",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/contracts/dsh.client-address.openapi.yaml",
    required: [
      "listDshClientAddresses",
      "createDshClientAddress",
      "updateDshClientAddress",
      "deleteDshClientAddress",
      "setDshClientDefaultAddress",
      "x-bthwani-client-binding: MANUAL_TYPED_ADAPTER",
    ],
    forbidden: [],
  },
  {
    file: "services/dsh/frontend/app-client/store/StoreMeasurementSheet.tsx",
    forbidden: [
      [/getProductMeasurementOptions/g, "HEURISTIC_PRODUCT_UNIT_FORBIDDEN"],
      [/\bmultipliers\b/g, "LOCAL_UNIT_PRICE_MULTIPLIER_FORBIDDEN"],
      [/parseFloat\s*\(/g, "LOCAL_PRODUCT_PRICE_PARSE_FORBIDDEN"],
      [/basePrice\s*\*/g, "LOCAL_PRODUCT_PRICE_CALCULATION_FORBIDDEN"],
    ],
    required: ["Quantity-only product sheet", "server resolves", "isSubmitting", "errorMessage"],
  },
  {
    file: "services/dsh/frontend/app-client/store/StoreDetailShell.tsx",
    forbidden: [
      [/onPress:\s*\(\)\s*=>\s*\{\s*\}/g, "DEAD_BANNER_ACTION_FORBIDDEN"],
      [/onImagePress=\{\(\)\s*=>\s*\{\s*\}\}/g, "DEAD_PRODUCT_IMAGE_ACTION_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_STORE_ANY_FORBIDDEN"],
      [/priceReference:\s*`\$\{/g, "MUTATED_PRICE_REFERENCE_FORBIDDEN"],
      [/getProductMeasurementOptions/g, "HEURISTIC_MEASUREMENT_IMPORT_FORBIDDEN"],
    ],
    required: [
      "DshFulfillmentDeliveryMode",
      "handleOpenProduct",
      "onCartPress={onGoToCart}",
      "const accepted = await onAddToCart(",
      "if (accepted)",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/store/StoreDetailScreen.tsx",
    forbidden: [[/\bas\s+any\b/g, "UNSAFE_FULFILLMENT_CAST_FORBIDDEN"]],
    required: [
      "isClientEligible",
      "availableFulfillmentModes.length === 0",
      "fulfillmentMode: mode",
      "cartActionError={cartCtrl.actionError}",
    ],
  },
  {
    file: "services/wlt/frontend/shared/dsh/use-wlt-dsh-payment-controller.tsx",
    forbidden: [
      [/grandTotal/g, "LOCAL_WLT_TOTAL_INPUT_FORBIDDEN"],
      [/amountRows/g, "LOCAL_WLT_AMOUNT_BREAKDOWN_FORBIDDEN"],
    ],
    required: ["never calculates totals", 'useState<PaymentMethodKey>("cod")', "مزود WLT الحقيقي"],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file: check.file, line: lineNumber(content, match.index), message });
    }
  }
  for (const marker of check.required) {
    if (!content.includes(marker)) {
      violations.push({
        file: check.file,
        line: 0,
        message: `REQUIRED_CLIENT_COMMERCE_MARKER_MISSING ${marker}`,
      });
    }
  }
}

fail(guardId, violations);
