import { fail, lineNumber, read } from "./_guard-utils.mjs";

const guardId = "client-commerce-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/app-client/account/AddressLocationScreen.tsx",
    forbidden: [
      [/\blocalStorage\b/g, "LOCAL_ADDRESS_TRUTH_FORBIDDEN"],
      [/\bSEED_ADDRESSES\b|\bMAP_PRESETS\b/g, "SEEDED_ADDRESS_OR_MAP_FORBIDDEN"],
      [/Math\.random\s*\(/g, "RANDOM_LOCATION_SUCCESS_FORBIDDEN"],
      [/تم التقاط الإحداثيات بنجاح/g, "FAKE_LOCATION_SUCCESS_COPY_FORBIDDEN"],
    ],
    required: [
      "دفتر العناوين غير مفعّل",
      "داخل السلة",
      "DSH",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/DshClientSurface.tsx",
    forbidden: [
      [/serviceAreaCode=["']sana["']/g, "HARDCODED_CHECKOUT_AREA_FORBIDDEN"],
      [/\bas\s+ClientTab\b/g, "UNSAFE_CLIENT_TAB_CAST_FORBIDDEN"],
    ],
    required: ["isClientTab", "ClientCheckoutRoute", "openOrderTracking"],
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
      [/serviceAreaCode\s*=\s*["'][^"']+["']/g, "DEFAULT_SERVICE_AREA_FORBIDDEN"],
    ],
    required: [
      "useServiceabilityController",
      "serviceabilityController.check",
      "parseCoordinates",
      "useWltDshPaymentController",
      "onProceedToCheckout",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx",
    forbidden: [
      [/serviceAreaCode\s*=\s*["'][^"']+["']/g, "DEFAULT_CHECKOUT_AREA_FORBIDDEN"],
    ],
    required: [
      "useStoreDetailController",
      "store.serviceAreaCode",
      "couponCode",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/store/StoreMeasurementSheet.tsx",
    forbidden: [
      [/getProductMeasurementOptions/g, "HEURISTIC_PRODUCT_UNIT_FORBIDDEN"],
      [/\bmultipliers\b/g, "LOCAL_UNIT_PRICE_MULTIPLIER_FORBIDDEN"],
      [/parseFloat\s*\(/g, "LOCAL_PRODUCT_PRICE_PARSE_FORBIDDEN"],
      [/basePrice\s*\*/g, "LOCAL_PRODUCT_PRICE_CALCULATION_FORBIDDEN"],
    ],
    required: [
      "Quantity-only product sheet",
      "server resolves",
      "setQuantity",
    ],
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
      "onAddToCart(selectedProduct, quantity, selectedMode)",
    ],
  },
  {
    file: "services/dsh/frontend/app-client/store/StoreDetailScreen.tsx",
    forbidden: [[/\bas\s+any\b/g, "UNSAFE_FULFILLMENT_CAST_FORBIDDEN"]],
    required: [
      "isClientEligible",
      "availableFulfillmentModes.length === 0",
      "fulfillmentMode: mode",
    ],
  },
  {
    file: "services/wlt/frontend/shared/dsh/use-wlt-dsh-payment-controller.tsx",
    forbidden: [
      [/grandTotal/g, "LOCAL_WLT_TOTAL_INPUT_FORBIDDEN"],
      [/amountRows/g, "LOCAL_WLT_AMOUNT_BREAKDOWN_FORBIDDEN"],
    ],
    required: [
      "never calculates totals",
      'useState<PaymentMethodKey>("cod")',
      "production provider",
    ],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({
        file: check.file,
        line: lineNumber(content, match.index),
        message,
      });
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
