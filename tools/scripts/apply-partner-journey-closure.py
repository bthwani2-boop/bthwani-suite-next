from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def ensure_line_after(text: str, anchor: str, line: str) -> str:
    if line.strip() in text:
        return text
    if anchor not in text:
        raise RuntimeError(f"missing line anchor: {anchor}")
    return text.replace(anchor, anchor + line, 1)


def ensure_routes_before(relative: str, anchor: str, routes: list[tuple[str, str]], comment: str) -> None:
    text = read(relative)
    missing: list[str] = []
    for pattern, handler in routes:
        if pattern in text:
            continue
        missing.append(f'\tmux.HandleFunc("{pattern}", protected.{handler})\n')
    if not missing:
        return
    if anchor not in text:
        raise RuntimeError(f"missing route insertion anchor: {relative}: {anchor}")
    block = f"\t// {comment}\n" + "".join(missing) + "\n"
    write(relative, text.replace(anchor, block + anchor, 1))


def close_catalog_routes() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    text = read(relative)

    text = ensure_line_after(
        text,
        '\tmux.HandleFunc("GET /dsh/partner/catalog/taxonomy", s.handleCatalogTaxonomy)\n',
        '\tmux.HandleFunc("GET /dsh/partner/catalog/master-products", s.handleListPartnerCatalogMasterProducts)\n',
    )
    text = ensure_line_after(
        text,
        '\tmux.HandleFunc("PATCH /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)\n',
        '\tmux.HandleFunc("PUT /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)\n',
    )
    text = ensure_line_after(
        text,
        '\tmux.HandleFunc("GET /dsh/field/catalog/taxonomy", s.handleCatalogTaxonomy)\n',
        '\tmux.HandleFunc("GET /dsh/field/catalog/master-products", s.handleListFieldCatalogMasterProducts)\n',
    )
    text = ensure_line_after(
        text,
        '\tmux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)\n',
        '\tmux.HandleFunc("PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)\n',
    )
    text = ensure_line_after(
        text,
        '\tmux.HandleFunc("PUT /dsh/operator/catalog/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)\n',
        '\tmux.HandleFunc("PUT /dsh/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)\n',
    )
    write(relative, text)


def close_partner_router() -> None:
    relative = "services/dsh/backend/internal/http/server.go"
    primary_anchor = '\t// Primary-contract compatibility routes remain actor-owned and retry-safe.\n'

    journey_routes = [
        ("POST /dsh/operator/workforce/media/uploads", "handleProviderMediaUpload"),
        ("GET /dsh/field/me/finance/wallet", "handleFieldMeWallet"),
        ("GET /dsh/field/me/finance/commissions", "handleFieldMeCommissions"),
        ("GET /dsh/field/me/finance/ledger-entries", "handleFieldMeLedgerEntries"),
        ("GET /dsh/field/me/finance/payout-requests", "handleFieldMePayoutRequests"),
        ("POST /dsh/field/me/finance/payout-requests", "handleSubmitFieldMePayoutRequest"),
        ("POST /dsh/catalog-approvals", "handleCreateCatalogApproval"),
        ("GET /dsh/catalog-approvals", "handleListCatalogApprovals"),
        ("GET /dsh/catalog-approvals/{recordId}", "handleGetCatalogApproval"),
        ("POST /dsh/catalog-approvals/{recordId}/transition", "handleTransitionCatalogApproval"),
        ("GET /dsh/partner/catalog-approvals", "handleListPartnerCatalogApprovals"),
        ("POST /dsh/field/stores/{storeId}/visits", "handleCreateFieldVisit"),
        ("GET /dsh/field/stores/{storeId}/visits", "handleListFieldVisits"),
        ("GET /dsh/field/work-queue", "handleFieldWorkQueue"),
        ("POST /dsh/field/visits/{visitId}/complete", "handleCompleteFieldVisit"),
        ("PUT /dsh/field/visits/{visitId}/checks", "handleUpsertReadinessCheck"),
        ("GET /dsh/field/visits/{visitId}/checks", "handleListVisitChecks"),
        ("POST /dsh/field/stores/{storeId}/escalations", "handleCreateReadinessEscalation"),
        ("GET /dsh/operator/field-readiness/escalations", "handleListOperatorEscalations"),
        ("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", "handleUpdateEscalation"),
        ("GET /dsh/partner/stores/{storeId}/onboarding-status", "handlePartnerOnboardingStatus"),
        ("GET /dsh/operator/partners", "handleListPartners"),
        ("POST /dsh/operator/partners", "handleCreatePartner"),
        ("GET /dsh/operator/partners/{partnerId}", "handleGetPartner"),
        ("POST /dsh/operator/partners/{partnerId}/transition", "handleActivationTransition"),
        ("GET /dsh/operator/partners/{partnerId}/readiness", "handleGetPartnerReadiness"),
        ("GET /dsh/operator/partners/{partnerId}/documents", "handleListPartnerDocuments"),
        ("POST /dsh/operator/partners/{partnerId}/documents", "handleAddPartnerDocument"),
        ("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", "handleReviewPartnerDocument"),
        ("GET /dsh/operator/partners/{partnerId}/stores", "handleListPartnerStores"),
        ("POST /dsh/operator/partners/{partnerId}/stores", "handleLinkPartnerStore"),
        ("GET /dsh/operator/partners/{partnerId}/field-visits", "handleListPartnerFieldVisits"),
        ("GET /dsh/operator/partners/{partnerId}/audit", "handleListPartnerAudit"),
        ("GET /dsh/field/partners", "handleFieldListPartnerDrafts"),
        ("POST /dsh/field/partners/drafts", "handleFieldCreatePartnerDraft"),
        ("GET /dsh/field/partners/{partnerId}", "handleFieldGetPartnerDraft"),
        ("PATCH /dsh/field/partners/{partnerId}", "handleFieldUpdatePartnerDraft"),
        ("GET /dsh/field/partners/{partnerId}/readiness", "handleFieldGetPartnerReadiness"),
        ("GET /dsh/field/partners/{partnerId}/store", "handleFieldGetPartnerStore"),
        ("PATCH /dsh/field/partners/{partnerId}/store", "handleFieldUpdatePartnerStore"),
        ("GET /dsh/field/partners/{partnerId}/documents", "handleFieldListPartnerDocuments"),
        ("POST /dsh/field/partners/{partnerId}/documents", "handleFieldUploadPartnerDocument"),
        ("POST /dsh/field/partners/{partnerId}/visits", "handleFieldCreatePartnerVisit"),
        ("GET /dsh/field/partners/{partnerId}/field-visits", "handleFieldListPartnerFieldVisits"),
        ("POST /dsh/field/partners/{partnerId}/submit", "handleFieldSubmitPartnerDraft"),
        ("GET /dsh/partner/activation/status", "handlePartnerActivationStatus"),
        ("GET /dsh/partner/activation/readiness", "handlePartnerActivationReadiness"),
        ("GET /dsh/operator/analytics/platform", "handlePlatformKpis"),
        ("GET /dsh/operator/analytics/orders", "handleOrderAnalytics"),
        ("GET /dsh/operator/analytics/delivery", "handleDeliveryAnalytics"),
        ("GET /dsh/operator/analytics/stores", "handleStoreAnalytics"),
        ("GET /dsh/partner/analytics/performance", "handlePartnerPerformance"),
        ("GET /dsh/notifications", "handleListNotifications"),
        ("POST /dsh/notifications/{notificationId}/read", "handleMarkNotificationRead"),
        ("POST /dsh/notifications/read-all", "handleMarkAllNotificationsRead"),
        ("PUT /dsh/notifications/preferences", "handleUpdateNotificationPreferences"),
        ("GET /dsh/operator/notifications/config", "handleListPlatformNotificationConfig"),
        ("PUT /dsh/operator/notifications/config", "handleUpsertPlatformNotificationConfig"),
        ("GET /dsh/operator/admin/roles", "handleListRoles"),
        ("POST /dsh/operator/admin/roles", "handleCreateRole"),
        ("GET /dsh/operator/admin/staff", "handleListStaff"),
        ("POST /dsh/operator/admin/staff/{staffId}/roles", "handleAssignStaffRole"),
        ("GET /dsh/operator/admin/partners", "handleListPartnerActivations"),
        ("POST /dsh/operator/admin/partners/{partnerId}/activate", "handleActivatePartner"),
        ("POST /dsh/operator/admin/partners/{partnerId}/block", "handleBlockPartner"),
        ("GET /dsh/operator/admin/captains", "handleListCaptainCredentials"),
        ("POST /dsh/operator/admin/captains/{captainId}/credential", "handleUpsertCaptainCredential"),
        ("GET /dsh/operator/admin/audit", "handleListAdminAudit"),
    ]
    ensure_routes_before(
        relative,
        primary_anchor,
        journey_routes,
        "Partner multi-surface journey routes.",
    )

    legacy_anchor = '\tregisterUnifiedCatalogRoutes(mux, protected)\n'
    legacy_routes = [
        ("GET /dsh/catalog/domains", "handleListCatalogDomains"),
        ("POST /dsh/catalog/domains", "handleCreateCatalogDomain"),
        ("PATCH /dsh/catalog/domains/{domainId}", "handleUpdateCatalogDomainAtomic"),
        ("GET /dsh/catalog/nodes", "handleListCatalogNodes"),
        ("POST /dsh/catalog/nodes", "handleCreateCatalogNode"),
        ("PATCH /dsh/catalog/nodes/{nodeId}", "handleUpdateCatalogNodeAtomic"),
        ("GET /dsh/catalog/master-products", "handleListCatalogMasterProducts"),
        ("POST /dsh/catalog/master-products", "handleCreateCatalogMasterProduct"),
        ("PATCH /dsh/catalog/master-products/{productId}", "handleUpdateCatalogMasterProductAtomic"),
        ("GET /dsh/catalog/proposals", "handleListCatalogProposals"),
        ("POST /dsh/catalog/proposals/{proposalId}/decision", "handleDecideCatalogProposalExpected"),
        ("POST /dsh/catalog/proposals/{proposalId}/transitions", "handleTransitionCatalogProposalExpected"),
        ("GET /dsh/catalog/policies", "handleListCatalogPlatformPolicies"),
        ("PATCH /dsh/catalog/policies/{policyId}", "handleUpdateCatalogPlatformPolicyAtomic"),
        ("GET /dsh/catalog/stores/{storeId}/assortment", "handleGetOperatorStoreAssortment"),
        ("PUT /dsh/catalog/stores/{storeId}/assortment/{masterProductId}", "handleOperatorUpsertStoreAssortmentAtomic"),
        ("GET /dsh/field/catalog/domains", "handleListFieldCatalogDomains"),
        ("GET /dsh/field/catalog/nodes", "handleListFieldCatalogNodes"),
        ("GET /dsh/field/catalog/stores/{storeId}/assortment", "handleGetFieldStoreAssortment"),
        ("PUT /dsh/field/catalog/stores/{storeId}/assortment/{masterProductId}", "handleLegacyFieldUpsertStoreAssortmentAtomic"),
        ("GET /dsh/partner/catalog/domains", "handleListPartnerCatalogDomains"),
        ("GET /dsh/partner/catalog/nodes", "handleListPartnerCatalogNodes"),
        ("POST /dsh/partner/catalog/proposals", "handleCreatePartnerCatalogProposal"),
        ("GET /dsh/partner/catalog/proposals", "handleListPartnerCatalogProposals"),
        ("GET /dsh/partner/catalog/assortment", "handleGetPartnerStoreAssortment"),
        ("PUT /dsh/partner/catalog/assortment/{masterProductId}", "handleLegacyPartnerUpsertStoreAssortmentAtomic"),
    ]
    ensure_routes_before(
        relative,
        legacy_anchor,
        legacy_routes,
        "Compatibility adapters route to the same sovereign catalog handlers.",
    )


def fix_partner_support_guard() -> None:
    relative = "tools/guards/partner/partner-support-truth-gate.mjs"
    text = read(relative)
    old = 'from "../../_guard-utils.mjs";'
    new = 'from "../_guard-utils.mjs";'
    if old in text:
        write(relative, text.replace(old, new, 1))
    elif new not in text:
        raise RuntimeError("partner support guard import anchor is missing")


def remove_transient_journey_tools() -> None:
    for relative in [
        "tools/scripts/apply-partner-journey-closure.py",
        "tools/scripts/apply-partner-support-guard-fix.py",
    ]:
        path = ROOT / relative
        if path.exists():
            path.unlink()


close_catalog_routes()
close_partner_router()
fix_partner_support_guard()
remove_transient_journey_tools()
