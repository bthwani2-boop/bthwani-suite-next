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
    | "dsh.field.finance"
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
    | "field-finance"
    | "partner-proposal-readback"
    | "field-proposal-readback"
    | "product-attributes"
    | "category-attribute-rules"
    | "product-alternatives"
    | "assortment-pauses"
    | "catalog-audit"
    | "guarded-rollback"
    | "special-requests"
    | "quotes"
    | "dispatch-handoff"
    | "client-ticket-submission"
    | "partner-ticket-submission"
    | "captain-ticket-submission"
    | "ticket-conversation"
    | "operator-readback"
    | "support-audit"
    | "actor-inbox"
    | "channel-preferences"
    | "quiet-hours"
    | "localized-templates"
    | "deep-links"
    | "actor-targeting"
    | "push-endpoint-lifecycle"
    | "push-provider-worker"
    | "delivery-audit"
    | "retry-dead-letter"
    | "partner-delivery"
    | "pickup"
    | "proof"
    | "exceptions"
    | "client-address-book"
    | "governed-map-search"
    | "reverse-geocoding"
    | "serviceability-address"
    | "checkout-address"
    | "service-area-geofences"
    | "coordinate-to-service-area"
    | "map-provider-boundary"
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
    closureState: "FIX_REQUIRED",
  },
  {
    id: "dsh.store.discovery",
    status: "runtime-verified",
    contractOperations: [
      "listDshStores",
      "getDshStore",
      "getDshStoreContext",
      "get_dsh_operator_stores",
      "getOperatorDshStore",
      "getDshPartnerStoreCourierSettings",
      "getPartnerStoreSettings",
      "listDshPartnerScopes",
      "listDshPartnerStoreCoverageZones",
      "updateDshPartnerStoreCourierSettings",
      "governDshStore",
      "listDshStoreAudit",
    ],
    surfaces: [
      "app-client",
      "control-panel",
      "app-partner",
      "app-field",
      "app-captain",
    ],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
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
    closureState: "FIX_REQUIRED",
    topic: "stores",
    topicScope: ["discovery"],
  },
  {
    id: "dsh.client.catalog",
    status: "runtime-verified",
    contractOperations: [
      "getPublishedDshCatalog",
      "listDshCatalogApprovals",
      "createDshCatalogApproval",
      "getDshCatalogApproval",
      "transitionDshCatalogApproval",
      "listDshPartnerCatalogApprovals",
      "listCatalogDomains",
      "createCatalogDomain",
      "updateCatalogDomain",
      "listCatalogNodes",
      "createCatalogNode",
      "updateCatalogNode",
      "listMasterProductsOperator",
      "createMasterProduct",
      "updateMasterProduct",
      "listProductProposals",
      "transitionProductProposal",
      "listCatalogPlatformPolicies",
      "updateCatalogPlatformPolicy",
      "getCatalogSeedStatus",
      "listCatalogAssets",
      "createAssetUploadIntent",
      "completeAssetUpload",
      "updateCatalogAsset",
      "deleteCatalogAsset",
      "reviewCatalogAsset",
      "linkCatalogAsset",
      "unlinkCatalogAsset",
      "listCatalogAssetLinks",
      "getPublicCatalogMedia",
      "patchCatalogPlatformPolicy",
      "listReels",
      "reviewReel",
      "submitReel",
      "listPublicReels",
      "putDomainImage",
      "putNodeImage",
      "putMasterProductImage",
      "putProductProposalImage",
      "getOperatorStoreAssortment",
      "upsertOperatorStoreAssortment",
      "getPartnerCatalogTaxonomy",
      "listPartnerMasterProducts",
      "getPartnerStoreAssortment",
      "upsertPartnerStoreAssortment",
      "createPartnerProductProposal",
      "getFieldCatalogTaxonomy",
      "listFieldMasterProducts",
      "fieldUpsertStoreAssortment",
      "fieldGetStoreAssortment",
      "createFieldProductProposal",
      "listPartnerProductProposals",
      "listFieldProductProposals",
      "listOperatorCatalogAttributes",
      "createOperatorCatalogAttribute",
      "listOperatorCatalogAttributeOptions",
      "createOperatorCatalogAttributeOption",
      "upsertOperatorCatalogNodeAttributeRule",
      "listOperatorMasterProductAttributeValues",
      "upsertOperatorMasterProductAttributeValue",
      "listOperatorMasterProductRelationships",
      "upsertOperatorMasterProductRelationship",
      "deleteOperatorMasterProductRelationship",
      "listOperatorAssortmentPauses",
      "pauseOperatorStoreAssortment",
      "resumeOperatorStoreAssortment",
      "listOperatorCatalogAudit",
      "rollbackOperatorCatalogAudit",
      "listPartnerCatalogAttributes",
      "listPartnerCatalogAttributeOptions",
      "listPartnerMasterProductAttributeValues",
      "listPartnerMasterProductRelationships",
      "get_dsh_partner_stores__storeId__assortment_pauses",
      "post_dsh_partner_stores__storeId__assortment__masterProductId__pause",
      "post_dsh_partner_stores__storeId__assortment__masterProductId__resume",
      "listFieldCatalogAttributes",
      "listFieldCatalogAttributeOptions",
      "listFieldMasterProductAttributeValues",
      "listFieldMasterProductRelationships",
      "get_dsh_field_partners__partnerId__assortment_pauses",
      "post_dsh_field_partners__partnerId__assortment__masterProductId__pause",
      "post_dsh_field_partners__partnerId__assortment__masterProductId__resume",
    ],
    surfaces: ["app-client", "app-partner", "control-panel", "app-field"],
    runtimeBound: true,
    closureState: "IMPLEMENTED_MULTI_SURFACE",
    topic: "catalog",
    topicScope: [
      "browse",
      "partner-manage",
      "operator-govern",
      "partner-proposal-readback",
      "field-proposal-readback",
      "product-attributes",
      "category-attribute-rules",
      "product-alternatives",
      "assortment-pauses",
      "catalog-audit",
      "guarded-rollback",
    ],
  },
  // ── Cart & Serviceability ─────────────────────────────────────────────────
  {
    id: "dsh.client.cart",
    status: "runtime-verified",
    contractOperations: [
      "getDshClientCart",
      "upsertDshCartItem",
      "removeDshCartItem",
      "clearDshClientCart",
      "checkDshCartServiceability",
      "listOperatorCarts",
    ],
    surfaces: ["app-client", "control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: ["cart", "serviceability"],
  },
  // ── Checkout Intent & WLT Handoff ─────────────────────────────────────────
  {
    id: "dsh.client.checkout",
    status: "experience-fix-required",
    contractOperations: [
      "createDshCheckoutIntent",
      "getDshCheckoutIntent",
      "cancelDshCheckoutIntent",
      "listOperatorCheckoutIntents",
      "reportWltPaymentSessionEvent",
      "listDshClientAddresses",
      "createDshClientAddress",
      "updateDshClientAddress",
      "deleteDshClientAddress",
      "setDshClientDefaultAddress",
      "searchDshClientMapLocations",
      "reverseDshClientMapLocation",
    ],
    surfaces: ["app-client", "control-panel"],
    runtimeBound: false,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: [
      "checkout",
      "wlt-handoff",
      "client-address-book",
      "governed-map-search",
      "reverse-geocoding",
      "serviceability-address",
      "checkout-address",
    ],
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
      "acceptDshOrder",
      "rejectDshOrder",
      "markDshOrderPreparing",
      "markDshOrderReadyForPickup",
      "listDshOperatorOrders",
    ],
    surfaces: ["app-client", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: ["order-fulfillment", "partner-acceptance"],
  },
  // ── Dispatch & Captain Delivery Lifecycle ─────────────────────────────────
  {
    id: "dsh.client.dispatch",
    status: "experience-fix-required",
    contractOperations: [
      "createDshAssignment",
      "listDshDispatchAssignments",
      "listDshCaptainAssignments",
      "acceptDshAssignment",
      "pushDshCaptainLocation",
      "declineDshAssignment",
      "updateDshDeliveryStatus",
		"submitCaptainDeliveryProof",
      "getDshClientOrderTracking",
      "reportCaptainPickupReadiness",
      "arriveDshPartnerDeliveryTask",
      "assignDshPartnerDeliveryTask",
      "departDshPartnerDeliveryTask",
      "extendDshPickupWindow",
      "getDshOperatorPartnerDelivery",
      "getDshOperatorPickup",
      "listDshOperatorPartnerDeliveries",
      "listDshOperatorPickups",
      "markDshPartnerDeliveryPickedUp",
      "markDshPickupCustomerArrived",
      "markDshPickupNoShow",
      "markDshPickupReady",
      "notifyDshPickupCustomer",
      "raiseDshPartnerDeliveryException",
      "submitDshPartnerDeliveryProof",
      "verifyDshPickupSession",
    ],
    surfaces: ["app-client", "app-captain", "control-panel", "app-partner"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "commerce",
    topicScope: [
      "dispatch",
      "captain-delivery",
      "client-tracking",
      "partner-delivery",
      "pickup",
      "proof",
      "exceptions",
    ],
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
      "getDshFieldWorkQueue",
      "submitFieldStoreVerification",
    ],
    surfaces: ["app-field", "app-partner", "control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "field-ops",
    topicScope: ["field-visits", "readiness-checklist", "escalation", "partner-onboarding"],
  },
  // ── Field Finance (WLT-owned wallet/commissions/payouts, DSH BFF) ──────────
  {
    id: "dsh.field.finance",
    status: "experience-fix-required",
    contractOperations: [
      "getDshFieldMeWallet",
      "getDshFieldMeCommissions",
      "getDshFieldMeLedgerEntries",
      "getDshFieldMePayoutRequests",
      "submitDshFieldMePayoutRequest",
    ],
    surfaces: ["app-field"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "field-ops",
    topicScope: ["field-finance"],
  },
  // ── Support, Incidents & Escalation Room ───────────────────────────────────
  {
    id: "dsh.support.hub",
    status: "experience-fix-required",
    contractOperations: [
      "createDshSupportTicket",
      "listDshMyTickets",
      "getDshSupportTicket",
      "addDshTicketMessage",
      "listDshTicketMessages",
      "listDshOperatorTickets",
      "updateDshOperatorTicket",
      "createDshGovernedIncident",
      "listDshGovernedIncidents",
      "updateDshGovernedIncident",
      "approveDshSpecialRequestQuote",
      "assignDshSpecialRequestDispatch",
      "cancelDshClientSpecialRequest",
      "createDshClientSpecialRequest",
      "getDshClientSpecialRequest",
      "getDshOperatorSpecialRequest",
      "listDshClientSpecialRequests",
      "listDshOperatorSpecialRequests",
      "updateDshOperatorSpecialRequest",
      "getDshOperatorSupportTicket",
      "listDshOperatorSupportMessages",
      "addDshOperatorSupportMessage",
      "listDshOperatorSupportEvents",
    ],
    surfaces: ["app-client", "app-partner", "control-panel", "app-captain"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "support",
    topicScope: [
      "ticket-submission",
      "ticket-management",
      "incident-management",
      "special-requests",
      "quotes",
      "dispatch-handoff",
      "client-ticket-submission",
      "partner-ticket-submission",
      "captain-ticket-submission",
      "ticket-conversation",
      "operator-readback",
      "support-audit",
    ],
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
      "listDshControlPanelFinanceSettlements",
      "getDshControlPanelFinanceSettlementSummary",
      "listDshControlPanelFinanceRefunds",
      "getDshControlPanelFinanceRefund",
      "listDshControlPanelFinanceLedgerEntries",
      "listDshControlPanelFinanceCommissions",
    ],
    surfaces: ["control-panel", "app-partner"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
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
      "upsertDshNotificationPushEndpoint",
      "deactivateDshNotificationPushEndpoint",
      "listDshNotificationDeliveryAttempts",
    ],
    surfaces: ["app-client", "control-panel", "app-partner", "app-field", "app-captain"],
    runtimeBound: true,
    closureState: "IMPLEMENTED_MULTI_SURFACE",
    topicScope: [
      "actor-inbox",
      "channel-preferences",
      "quiet-hours",
      "localized-templates",
      "deep-links",
      "actor-targeting",
      "push-endpoint-lifecycle",
      "push-provider-worker",
      "delivery-audit",
      "retry-dead-letter",
    ],
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
    closureState: "FIX_REQUIRED",
  },
  // ── Platform Policies & Service Area Management ───────────────────────────
  {
    id: "dsh.policies",
    status: "experience-fix-required",
    contractOperations: [
      "listDshZones",
      "createDshZone",
      "updateDshZone",
      "getDshOperationalProfile",
      "upsertDshOperationalProfile",
      "getDshZoneServiceability",
      "getDshStoreOnboardingFeePolicy",
      "upsertDshStoreOnboardingFeePolicy",
      "getDshStoreOnboardingFeeReference",
      "get_dsh_operator_platform_service_areas",
      "put_dsh_operator_platform_service_areas__serviceAreaCode_",
    ],
    surfaces: ["control-panel"],
    runtimeBound: false,
    closureState: "FIX_REQUIRED",
    topicScope: [
      "service-area-geofences",
      "coordinate-to-service-area",
      "map-provider-boundary",
    ],
  },
  // ── Administration, Roles & Activation ────────────────────────────────────
  {
    id: "dsh.admin",
    status: "runtime-verified",
    contractOperations: [
      "listDshAdminRoles",
      "post_dsh_operator_admin_roles_requests",
      "listDshAdminStaff",
      "assignDshStaffRole",
      "listDshAdminAudit",
      "get_dsh_operator_admin_permission_vocabulary",
      "get_dsh_operator_admin_approvals",
      "post_dsh_operator_admin_approvals__approvalId__review",
      "post_dsh_operator_admin_approvals__approvalId__replacements",
      "get_dsh_operator_admin_role_requests",
      "post_dsh_operator_admin_role_requests__requestId__review",
      "post_dsh_operator_admin_role_requests__requestId__replacements",
      "get_dsh_operator_admin_rollback_requests",
      "post_dsh_operator_admin_rollback_requests__requestId__review",
      "post_dsh_operator_admin_rollback_requests__requestId__replacements",
      "assignDshControlPanelFinanceReconciliationCase",
      "getDshControlPanelFinanceFinancialSummary",
      "getDshControlPanelFinanceReconciliationCase",
      "getDshPartnerFinanceSettlementSummary",
      "getStoreDiagnostics",
      "listDshControlPanelFinancePayoutRequests",
      "listDshControlPanelFinanceReconciliationCases",
      "listDshPartnerFinanceSettlements",
      "resolveDshControlPanelFinanceReconciliationCase",
    ],
    surfaces: ["control-panel"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
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
      "listFieldPartnerDrafts",
      "getFieldPartnerReadiness",
      "getFieldPartnerStore",
      "updateFieldPartnerStore",
      "listFieldPartnerDocuments",
      "uploadFieldMedia",
      "listFieldPartnerFieldVisits",
      "getMedia",
      "updatePartnerStoreSettings",
    ],
    surfaces: ["control-panel", "app-field", "app-partner"],
    runtimeBound: true,
    closureState: "FIX_REQUIRED",
    topic: "field-ops",
    topicScope: ["partner-onboarding", "readiness-checklist"],
  },
] as const satisfies readonly DshCapability[];
