export const DSH_CAPABILITY_STATUS = [
  "contract-active",
  "planned",
  "blocked-runtime",
  "runtime-verified",
  "experience-fix-required",
] as const;

export type DshCapabilityStatus = (typeof DSH_CAPABILITY_STATUS)[number];

export type DshCapability = {
  readonly id:
    | "dsh.system.readiness"
    | "dsh.store.discovery"
    | "dsh.client.home-discovery"
    | "dsh.client.catalog"
    | "dsh.client.cart"
    | "dsh.client.checkout"
    | "dsh.client.orders"
    | "dsh.client.dispatch"
    | "dsh.field.readiness"
    | "dsh.support.hub"
    | "dsh.operator.analytics"
    | "dsh.notifications"
    | "dsh.marketing"
    | "dsh.policies"
    | "dsh.admin"
    | "dsh.partner.activation";
  readonly status: DshCapabilityStatus;
  readonly contractOperations: readonly string[];
  readonly surfaces: readonly string[];
  readonly runtimeBound: boolean;
  readonly relatedFutureSurfaces?: readonly DshSurfaceDependency[];
  readonly relatedFutureCapabilities?: readonly string[];
  readonly closureState:
    | "CONTRACT_ACTIVE_RUNTIME_BLOCKED"
    | "NOT_APPROVED_YET"
    | "RUNTIME_VERIFIED"
    | "FIX_REQUIRED"
    | "CLIENT_REVERIFIED_ONLY"
    | "CONTROL_PANEL_NOT_STARTED"
    | "TOPIC_CLOSURE_NOT_APPROVED"
    | "IMPLEMENTED_MULTI_SURFACE";
  readonly topic?: "stores" | "catalog" | "commerce" | "field-ops" | "support" | "analytics";
  readonly topicScope?: readonly (
    | "discovery"
    | "governance"
    | "readiness"
    | "verification"
    | "pickup-context"
    | "browse"
    | "partner-manage"
    | "operator-govern"
    | "cart"
    | "serviceability"
    | "checkout"
    | "wlt-handoff"
    | "order-fulfillment"
    | "partner-acceptance"
    | "dispatch"
    | "captain-delivery"
    | "client-tracking"
    | "field-visits"
    | "readiness-checklist"
    | "escalation"
    | "partner-onboarding"
    | "ticket-submission"
    | "ticket-management"
    | "incident-management"
    | "platform-kpis"
    | "order-analytics"
    | "delivery-analytics"
    | "support-analytics"
    | "store-analytics"
    | "partner-performance"
  )[];
};

export type DshSurfaceDependency =
  | "app-partner"
  | "app-field"
  | "app-captain";

export const DSH_CAPABILITY_MAP = [
  {
    id: "dsh.system.readiness",
    status: "runtime-verified",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    surfaces: [],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
  {
    id: "dsh.store.discovery",
    status: "runtime-verified",
    contractOperations: ["listDshStores", "getDshStore"],
    surfaces: [
      "app-client",
      "control-panel",
      "app-partner",
      "app-field",
      "app-captain",
    ],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "stores",
    topicScope: ["discovery", "governance", "readiness", "verification", "pickup-context"],
  },
  {
    id: "dsh.client.home-discovery",
    status: "runtime-verified",
    contractOperations: [
      "getDshHomeDiscovery",
      "listOperatorHomeDiscoveryContent",
      "createOperatorHomeDiscoveryContent",
      "updateOperatorHomeDiscoveryContent",
      "deleteOperatorHomeDiscoveryContent",
    ],
    surfaces: ["app-client", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "stores",
    topicScope: ["discovery"],
  },
  {
    id: "dsh.client.catalog",
    status: "runtime-verified",
    contractOperations: [
      "getPublishedDshCatalog",
      "getPartnerDshCatalog",
      "createPartnerCatalogCategory",
      "updatePartnerCatalogCategory",
      "deletePartnerCatalogCategory",
      "createPartnerCatalogProduct",
      "updatePartnerCatalogProduct",
      "deletePartnerCatalogProduct",
      "createPartnerCatalogMediaUploadIntent",
      "completePartnerCatalogMedia",
      "deletePartnerCatalogMedia",
      "submitPartnerCatalog",
      "listOperatorCatalogSubmissions",
      "decideOperatorCatalogSubmission",
      "listOperatorCatalogAudit",
    ],
    surfaces: ["app-client", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "catalog",
    topicScope: ["browse", "partner-manage", "operator-govern"],
  },
  // ── Cart & Serviceability ─────────────────────────────────────────────────
  {
    id: "dsh.client.cart",
    status: "runtime-verified",
    contractOperations: [
      "getDshClientCart",
      "upsertDshCartItem",
      "removeDshCartItem",
      "clearDshCart",
      "checkDshCartServiceability",
      "listOperatorCarts",
    ],
    surfaces: ["app-client", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "commerce",
    topicScope: ["cart", "serviceability"],
  },
  // ── Checkout Intent & WLT Handoff ─────────────────────────────────────────
  {
    id: "dsh.client.checkout",
    status: "runtime-verified",
    contractOperations: [
      "createDshCheckoutIntent",
      "getDshCheckoutIntent",
      "cancelDshCheckoutIntent",
      "listOperatorCheckoutIntents",
    ],
    surfaces: ["app-client", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "commerce",
    topicScope: ["checkout", "wlt-handoff"],
  },
  // ── Order Fulfillment & Partner Acceptance ────────────────────────────────
  {
    id: "dsh.client.orders",
    status: "runtime-verified",
    contractOperations: [
      "createDshOrder",
      "listDshClientOrders",
      "getDshClientOrder",
      "listDshPartnerOrders",
      "acceptDshPartnerOrder",
      "rejectDshPartnerOrder",
      "markDshOrderPreparing",
      "markDshOrderReadyForPickup",
      "listDshOperatorOrders",
    ],
    surfaces: ["app-client", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "commerce",
    topicScope: ["order-fulfillment", "partner-acceptance"],
  },
  // ── Dispatch & Captain Delivery Lifecycle ─────────────────────────────────
  {
    id: "dsh.client.dispatch",
    status: "runtime-verified",
    contractOperations: [
      "createDshDispatchAssignment",
      "listDshOperatorDispatchAssignments",
      "listDshCaptainDispatchAssignments",
      "acceptDshDispatchAssignment",
      "declineDshDispatchAssignment",
      "updateDshDeliveryStatus",
      "submitDshDispatchPoD",
      "getDshClientTracking",
    ],
    surfaces: ["app-client", "app-captain", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "commerce",
    topicScope: ["dispatch", "captain-delivery", "client-tracking"],
  },
  // ── Field Verification & Store Quality Assurance ──────────────────────────
  {
    id: "dsh.field.readiness",
    status: "runtime-verified",
    contractOperations: [
      "createDshFieldVisit",
      "listDshFieldVisits",
      "completeDshFieldVisit",
      "upsertDshReadinessCheck",
      "listDshVisitChecks",
      "createDshReadinessEscalation",
      "listDshOperatorEscalations",
      "updateDshOperatorEscalation",
      "getDshPartnerOnboardingStatus",
    ],
    surfaces: ["app-field", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "field-ops",
    topicScope: ["field-visits", "readiness-checklist", "escalation", "partner-onboarding"],
  },
  // ── Support, Incidents & Escalation Room ───────────────────────────────────
  {
    id: "dsh.support.hub",
    status: "runtime-verified",
    contractOperations: [
      "createDshSupportTicket",
      "listDshMyTickets",
      "getDshSupportTicket",
      "addDshTicketMessage",
      "listDshTicketMessages",
      "listDshOperatorTickets",
      "updateDshOperatorTicket",
      "createDshIncident",
      "listDshIncidents",
      "updateDshIncident",
    ],
    surfaces: ["app-client", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "support",
    topicScope: ["ticket-submission", "ticket-management", "incident-management"],
  },
  // ── Platform Analytics & Operational Reporting ────────────────────────────
  {
    id: "dsh.operator.analytics",
    status: "runtime-verified",
    contractOperations: [
      "getDshPlatformKpis",
      "getDshOrderAnalytics",
      "getDshDeliveryAnalytics",
      "getDshSupportAnalytics",
      "getDshStoreAnalytics",
      "getDshPartnerPerformance",
    ],
    surfaces: ["control-panel", "app-partner"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "analytics",
    topicScope: ["platform-kpis", "order-analytics", "delivery-analytics", "support-analytics", "store-analytics", "partner-performance"],
  },
  // ── Notifications & Actor Communication ───────────────────────────────────
  {
    id: "dsh.notifications",
    status: "runtime-verified",
    contractOperations: [
      "listDshNotifications",
      "markDshNotificationRead",
      "markAllDshNotificationsRead",
      "updateDshNotificationPreferences",
      "listDshPlatformNotificationConfig",
      "upsertDshPlatformNotificationConfig",
    ],
    surfaces: ["control-panel", "app-partner", "app-field", "app-captain"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
  // ── Marketing Command Deck ─────────────────────────────────────────────────
  // FIX_REQUIRED: see services/dsh/evidence/marketing-command-deck-final-closure/.
  // surfaces list corrected — marketing impacts app-client (home-discovery banners/promos)
  // and app-partner (offer submission), not only control-panel.
  // Backend for campaigns/banners/promos is API-backed with soft archive/delete,
  // audit trail, target visibility-gate checks and 4 DB integration tests (see
  // marketing_db_test.go) as of commit e69fa48. Remaining gap: 7 of 11
  // control-panel command decks (ticker/video/partner-offers/loyalty/growth/
  // signals-measurement/image-review) have no backend table/handler — they are
  // explicitly disclosed as isBackedByApi:false with mutating actions disabled
  // in the UI, not silently faked. No runtime evidence yet proves app-client
  // visibility filtering or app-partner scoping for this capability.
  // NEWLY DISCOVERED (2026-07-03): the "banners-carousel"/"homepage-promos" tabs
  // in MarketingDashboardScreen.tsx do NOT call the dsh_marketing_banners/promos
  // API described here — they render MarketingHomeDiscoveryPanel, which calls the
  // separate, already-verified dsh.home-discovery admin API (dsh_home_banners/
  // dsh_home_promos, the table actually serving the live app-client home page —
  // confirmed via GET /dsh/home-discovery returning real seeded banner-001/002).
  // The real, governed marketing banners/promos API (target gate + audit +
  // soft-delete, verified in this pass) had exactly one UI consumer,
  // MarketingHubScreen.tsx (useBannersController/usePromosController) — a
  // read-only, unrouted duplicate screen (not reachable from any
  // apps/control-panel route). Retired as dead code in this pass (see
  // dead_code_and_duplication_matrix.md). listDshMarketingBanners/
  // createDshMarketingBanner/listDshMarketingPromos/createDshMarketingPromo/
  // updateDshMarketingPromo now have ZERO UI consumer anywhere in the repo.
  // "surfaces: app-client" for banner/promo content is only true via
  // dsh.home-discovery, not via this capability's contract operations. This is a
  // genuine open product/architecture question (merge the two systems, give
  // marketing banners/promos their own UI, or retire the backend+contract) that
  // this pass does NOT resolve unilaterally — flagged as BLOCKED_NEEDS_EVIDENCE,
  // not silently closed either way.
  {
    id: "dsh.marketing",
    status: "experience-fix-required",
    contractOperations: [
      "listDshCampaigns",
      "createDshCampaign",
      "getDshCampaign",
      "updateDshCampaign",
      "archiveDshCampaign",
      "listDshMarketingBanners",
      "createDshMarketingBanner",
      "updateDshMarketingBanner",
      "deleteDshMarketingBanner",
      "listDshMarketingPromos",
      "createDshMarketingPromo",
      "updateDshMarketingPromo",
    ],
    // surfaces corrected again (2026-07-03): services/dsh/backend/internal/http/server.go
    // exposes every campaign/banner/promo route under /dsh/operator/... only — there is
    // NO client-facing or partner-facing read route for dsh_marketing_campaigns/banners/promos
    // anywhere in the backend. The create-time target client-visibility gate validates the
    // referenced store/product/category, but the campaign/banner/promo row itself is never
    // exposed to app-client or app-partner. "app-client"/"app-partner" below is therefore
    // aspirational, not evidenced — kept in the list (not silently dropped) with this note
    // per protocol so it stays a visible, tracked gap rather than disappearing from scope.
    surfaces: ["control-panel", "app-client", "app-partner"],
    runtimeBound: false,
    closureState: "FIX_REQUIRED",
  },
  // ── Platform Policies & Service Area Management ───────────────────────────
  {
    id: "dsh.policies",
    status: "runtime-verified",
    contractOperations: [
      "listDshZones",
      "createDshZone",
      "updateDshZone",
      "getDshSlaRules",
      "upsertDshSlaRules",
      "getDshCapacityConfig",
      "upsertDshCapacityConfig",
      "getDshZoneServiceability",
    ],
    surfaces: ["control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
  // ── Administration, Roles & Activation ────────────────────────────────────
  {
    id: "dsh.admin",
    status: "runtime-verified",
    contractOperations: [
      "listDshAdminRoles",
      "createDshAdminRole",
      "listDshAdminStaff",
      "assignDshStaffRole",
      "listDshPartnerActivations",
      "activateDshPartner",
      "blockDshPartner",
      "listDshCaptainCredentials",
      "upsertDshCaptainCredential",
      "listDshAdminAudit",
    ],
    surfaces: ["control-panel"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
  },
  // ── Partner Onboarding & Store Publication ─────────────────────────────────
  {
    id: "dsh.partner.activation",
    status: "runtime-verified",
    contractOperations: [
      "listDshPartners",
      "createDshPartner",
      "getDshPartner",
      "transitionDshPartner",
      "getDshPartnerReadiness",
      "listDshPartnerDocuments",
      "addDshPartnerDocument",
      "reviewDshPartnerDocument",
      "listDshPartnerStores",
      "linkDshPartnerStore",
      "listDshPartnerAuditEvents",
      "listDshPartnerFieldVisits",
      "getDshPartnerActivationStatus",
      "getDshPartnerSelfReadiness",
      "createFieldPartnerDraft",
      "getFieldPartnerDraft",
      "updateFieldPartnerDraft",
      "uploadFieldPartnerDocument",
      "createFieldPartnerVisit",
      "submitFieldPartnerDraft",
    ],
    surfaces: ["control-panel", "app-field", "app-partner"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
    topic: "field-ops",
    topicScope: ["partner-onboarding", "readiness-checklist"],
  },
] as const satisfies readonly DshCapability[];
