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
    status: "experience-fix-required",
    contractOperations: [
      "listDshNotifications",
      "markDshNotificationRead",
      "markAllDshNotificationsRead",
      "updateDshNotificationPreferences",
      "listDshPlatformNotificationConfig",
      "upsertDshPlatformNotificationConfig",
    ],
    surfaces: ["app-client", "control-panel", "app-partner", "app-field", "app-captain"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
  },
  // ── Marketing Command Deck ─────────────────────────────────────────────────
  // Active decks are all API-backed: campaigns and tickers (soft
  // archive/delete, audit trail, target visibility-gate checks, governed
  // status lifecycles, DB integration tests in marketing_db_test.go), and
  // partner-offers (dsh_partner_offers table, operator review lifecycle with
  // required rejection reasons, partner self-submission scoped to the
  // caller's own resolved store via store.ResolveActorStore). Signals and
  // header KPIs consume existing DSH analytics endpoints with no hardcoded
  // values. video-studio, growth, loyalty/benefits-subscriptions and
  // image-product-review were removed from the active deck (not shipped
  // disabled) because they had no backend and, for loyalty (WLT-owned
  // financial truth) and image-review (catalog-owned), the wrong owner —
  // see marketing-registry.ts / use-marketing-controller.tsx history.
  // Marketing is operator-only: home banners/promos are owned by
  // dsh.client.home-discovery (dsh_home_banners/dsh_home_promos), not this
  // capability (migration dsh-018 retired the duplicate marketing banners/
  // promos subsystem). app-partner has real behavior (offer submission via
  // /dsh/partner/marketing/offers) -- the surfaces list reflects that.
  // Runtime deployment evidence: migration dsh-020 applied to the runtime
  // Postgres, dsh-api image rebuilt and restarted, and both new routes
  // (/dsh/operator/marketing/partner-offers, /dsh/partner/marketing/offers)
  // verified reachable (401, not 404) -- see
  // services/dsh/evidence/marketing-partner-offers-runtime-smoke/dsh-runtime-smoke.txt.
  // Sibling services (wlt-api, identity-api) confirmed unaffected.
  {
    id: "dsh.marketing",
    status: "runtime-verified",
    contractOperations: [
      "listDshCampaigns",
      "createDshCampaign",
      "getDshCampaign",
      "updateDshCampaign",
      "archiveDshCampaign",
      "listDshMarketingTickers",
      "createDshMarketingTicker",
      "updateDshMarketingTicker",
      "deleteDshMarketingTicker",
      "listDshPartnerOffers",
      "updateDshPartnerOffer",
      "archiveDshPartnerOffer",
      "listDshPartnerSelfOffers",
      "submitDshPartnerSelfOffer",
    ],
    surfaces: ["control-panel", "app-partner"],
    runtimeBound: true,
    closureState: "RUNTIME_VERIFIED",
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
