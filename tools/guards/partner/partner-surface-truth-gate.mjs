import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "partner-surface-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/app-partner/DshPartnerSurface.tsx",
    forbidden: [
      [/configureIdentitySession/g, "SURFACE_IDENTITY_SESSION_RECONFIGURATION_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_PARTNER_SURFACE_ANY_FORBIDDEN"],
    ],
    required: [
      "useDshPartnerSurfaceModel",
      "selectedStoreScope",
      "runtimePartnerProfile",
      "onInviteMember={actions.onInviteMember}",
      "onMemberAction={actions.onMemberAction}",
    ],
  },
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
      [/storeScopeOptions|fakhama-1|fakhama-2|fakhama-3|yasmin|nada/g, "SEEDED_STORE_SCOPE_FORBIDDEN"],
      [/selectedStoreScopeId\s*===\s*["']all["']\s*\?\s*["']["']/g, "SILENT_ALL_STORE_SCOPE_FALLBACK_FORBIDDEN"],
      [/onOpenStoreScope=\{\(\)\s*=>\s*\{\}\}/g, "DEAD_STORE_SCOPE_ACTION_FORBIDDEN"],
      [/تم الحفظ محليًا|يحتاج تفعيل backend لاحقًا|ربط WLT قيد التنفيذ|دعوة محلية/g, "LOCAL_OR_PENDING_RUNTIME_COPY_FORBIDDEN"],
      [/runtimePartnerTeamMembers|runtimePartnerCoverageZones|runtimePartnerAnalytics/g, "LOCAL_PARTNER_RUNTIME_COLLECTION_FORBIDDEN"],
      [/preview\/seed data only in runtime UI|local financial calculation|WLT bridge with no finance query/g, "RUNTIME_PREVIEW_OR_LOCAL_FINANCE_FORBIDDEN"],
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
      [/team-management[\s\S]{0,240}PartnerStoreScreen/g, "TEAM_ROUTE_BOUND_TO_STORE_SCREEN_FORBIDDEN"],
    ],
    required: [
      "hasRouteBindingContract",
      "STORE_SCOPED_ROUTES",
      "PRODUCT_SCOPED_ROUTES",
      "اختر متجرًا محددًا",
      "مسار شريك غير معروف",
      "state={partnerOrdersState}",
      "PartnerTeamManagementScreen",
    ],
  },
  {
    file: "services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts",
    forbidden: [
      [/local_only_order_success/g, "LOCAL_ORDER_SUCCESS_FORBIDDEN"],
      [/setOrders\(localOptimisticFinalState\)/g, "LOCAL_OPTIMISTIC_FINAL_ORDER_STATE_FORBIDDEN"],
      [/mutation success without read-after-write/g, "ORDER_MUTATION_WITHOUT_READBACK_FORBIDDEN"],
    ],
    required: ["read-after-write", "refresh"],
  },
  {
    file: "services/dsh/frontend/app-partner/account/PartnerEntryScreen.tsx",
    forbidden: [[/state\s*=\s*["']ready["']/g, "DEFAULT_ENTRY_READY_FORBIDDEN"]],
    required: ['"offline"', '"error"', '"disabled"', '"partial"', "تعديل حالة المتجر غير مربوط"],
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
  {
    file: "services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx",
    forbidden: [
      [/Promise\.resolve\s*\(/g, "VOID_TEAM_MUTATION_SUCCESS_FORBIDDEN"],
      [/Promise<PartnerTeamMutationResult>\s*\|\s*void/g, "OPTIONAL_TEAM_MUTATION_RESULT_FORBIDDEN"],
      [/\bas\s+any\b/g, "UNSAFE_PARTNER_TEAM_ANY_FORBIDDEN"],
      [/onMemberAction\([^\n]*["']audit-log["']/g, "AUDIT_LOG_API_SUBMISSION_FORBIDDEN"],
    ],
    required: [
      "Promise<PartnerTeamMutationResult>",
      "const result = await onInviteMember(identity)",
      "const result = await onMemberAction(member, action)",
      "if (!result.ok)",
      "action === \"audit-log\"",
    ],
  },
  {
    file: "services/dsh/database/migrations/dsh-058_partner_team_idempotency.sql",
    forbidden: [],
    required: [
      "dsh_guard_duplicate_pending_team_invite",
      "pg_advisory_xact_lock",
      "dsh_guard_team_member_noop_status_update",
      "dsh_guard_team_member_action_audit",
      "RETURN NULL",
    ],
  },
  {
    file: "services/dsh/frontend/shared/support/partner-support.model.ts",
    forbidden: [[/Promise\.resolve\s*\(/g, "PROMISE_RESOLVE_NAV_INTENT_FORBIDDEN"]],
    required: ["queueMicrotask"],
  },
  {
    file: "services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx",
    forbidden: [
      [/ORD-4401|ORD-4388|ORD-4375/g, "STATIC_PARTNER_SUPPORT_CASE_FORBIDDEN"],
      [/applyLifecycleAction/g, "LOCAL_PARTNER_SUPPORT_LIFECYCLE_FORBIDDEN"],
      [/setLifecycleOverrides/g, "LOCAL_PARTNER_SUPPORT_STATE_FORBIDDEN"],
      [/runtimePartnerSupportCases/g, "EMPTY_RUNTIME_SUPPORT_ARRAY_FORBIDDEN"],
    ],
    required: [
      "Partner support is intentionally fail-closed",
      "لا يوجد عقد DSH حالي",
      "تم حذف الحالات الثابتة والإجراءات المحلية",
    ],
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
      violations.push({ file: check.file, line: 0, message: `REQUIRED_PARTNER_SURFACE_MARKER_MISSING ${marker}` });
    }
  }
}

fail(guardId, violations);
