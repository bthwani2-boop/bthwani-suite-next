import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "partner-surface-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx",
    forbidden: [
      [/state\s*=\s*["']ready["']/g, "DEFAULT_PARTNER_READY_FORBIDDEN"],
      [/storeOpen\s*=\s*true/g, "DEFAULT_STORE_OPEN_FORBIDDEN"],
      [/listingEnabled\s*=\s*true/g, "DEFAULT_LISTING_ENABLED_FORBIDDEN"],
      [/serviceabilityAvailable:\s*true/g, "FAKE_SERVICEABILITY_SUCCESS_FORBIDDEN"],
      [/defaultServiceModes\.map/g, "DEFAULT_ENABLED_SERVICE_MODES_FORBIDDEN"],
      [/\bactiveCanonicalStore\b/g, "LOCAL_CANONICAL_STORE_TRUTH_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_PARTNER_HUB_ANY_FORBIDDEN"],
      [/catch\s*\{\s*\}/g, "SWALLOWED_PARTNER_HUB_ERROR_FORBIDDEN"],
      [/متجر الشريك|الفرع الرئيسي|مدير المتجر/g, "SEEDED_PARTNER_PROFILE_FORBIDDEN"],
    ],
    required: [
      "parseStoreSettings",
      "fetchPartnerStoreSettings",
      "fetchPartnerStoreCoverageZones",
      "serviceabilityVerified = false",
      "resolvedSurfaceState",
      "failClosedNotificationPreferences",
    ],
  },
  {
    file: "services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx",
    forbidden: [
      [/activeStoreIdForStoreScopedScreens\s*=\s*activeStoreRuntimeId\s*\?\?\s*["']["']/g, "SILENT_EMPTY_STORE_FALLBACK_FORBIDDEN"],
      [/return\s+renderSurfaceShell\([\s\S]{0,120}<DshPartnerHubSurface\s*\/>/g, "UNKNOWN_ROUTE_HUB_FALLBACK_FORBIDDEN"],
      [/console\.warn\([^)]*binding contract/g, "WARNING_ONLY_BINDING_FAILURE_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_PARTNER_ROUTE_ANY_FORBIDDEN"],
    ],
    required: [
      "hasRouteBindingContract",
      "STORE_SCOPED_ROUTES",
      "PRODUCT_SCOPED_ROUTES",
      "اختر متجرًا محددًا",
      "مسار شريك غير معروف",
      "state={partnerOrdersState}",
    ],
  },
  {
    file: "services/dsh/frontend/app-partner/account/PartnerEntryScreen.tsx",
    forbidden: [
      [/state\s*=\s*["']ready["']/g, "DEFAULT_ENTRY_READY_FORBIDDEN"],
    ],
    required: [
      '"offline"',
      '"error"',
      '"disabled"',
      '"partial"',
      "تعديل حالة المتجر غير مربوط",
    ],
  },
  {
    file: "services/dsh/frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx",
    forbidden: [
      [/available:\s*current\?\.available\s*\?\?\s*true/g, "NEW_ASSORTMENT_AVAILABLE_BY_DEFAULT_FORBIDDEN"],
      [/stockStatus:\s*current\?\.stockStatus\s*\?\?\s*["']in_stock["']/g, "NEW_ASSORTMENT_IN_STOCK_BY_DEFAULT_FORBIDDEN"],
      [/useStoreRoleContext/g, "SELECTED_STORE_SCOPE_BYPASS_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_PARTNER_CATALOG_ANY_FORBIDDEN"],
    ],
    required: [
      "readonly storeId: string",
      "fetchPartnerStoreAssortment(storeId)",
      "available: current?.available ?? false",
      'stockStatus: current?.stockStatus ?? "out_of_stock"',
      'publicationStatus: current?.publicationStatus ?? "draft"',
    ],
  },
  {
    file: "services/dsh/frontend/app-partner/account/PartnerOnboardingStatusView.tsx",
    forbidden: [[/\bas\s+any\b|:\s*any\b/g, "UNSAFE_ONBOARDING_ANY_FORBIDDEN"]],
    required: ["readinessItems.map((item)"],
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
        message: `REQUIRED_PARTNER_SURFACE_MARKER_MISSING ${marker}`,
      });
    }
  }
}

fail(guardId, violations);
