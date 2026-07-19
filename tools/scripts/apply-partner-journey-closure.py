from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    text = read(relative)
    if old in text:
        write(relative, text.replace(old, new, 1))
        return
    if new in text:
        return
    raise RuntimeError(f"missing replacement anchor: {relative}: {old}")


def insert_before_once(relative: str, anchor: str, block: str, sentinel: str) -> None:
    text = read(relative)
    if sentinel in text:
        return
    if anchor not in text:
        raise RuntimeError(f"missing insertion anchor: {relative}: {anchor}")
    write(relative, text.replace(anchor, block + anchor, 1))


def close_catalog_routes() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    text = read(relative)

    if 'GET /dsh/partner/catalog/master-products' not in text:
        text = text.replace(
            '\tmux.HandleFunc("GET /dsh/partner/catalog/taxonomy", s.handleCatalogTaxonomy)\n',
            '\tmux.HandleFunc("GET /dsh/partner/catalog/taxonomy", s.handleCatalogTaxonomy)\n'
            '\tmux.HandleFunc("GET /dsh/partner/catalog/master-products", s.handleListPartnerCatalogMasterProducts)\n',
            1,
        )
    text = text.replace(
        'PATCH /dsh/partner/catalog/product-proposals/{proposalId}',
        'PUT /dsh/partner/catalog/product-proposals/{proposalId}',
        1,
    )

    if 'GET /dsh/field/catalog/master-products' not in text:
        text = text.replace(
            '\tmux.HandleFunc("GET /dsh/field/catalog/taxonomy", s.handleCatalogTaxonomy)\n',
            '\tmux.HandleFunc("GET /dsh/field/catalog/taxonomy", s.handleCatalogTaxonomy)\n'
            '\tmux.HandleFunc("GET /dsh/field/catalog/master-products", s.handleListFieldCatalogMasterProducts)\n',
            1,
        )
    text = text.replace(
        'PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}',
        'PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}',
        1,
    )
    text = text.replace(
        'PUT /dsh/operator/catalog/stores/{storeId}/images/{role}',
        'PUT /dsh/stores/{storeId}/images/{role}',
        1,
    )
    write(relative, text)


def close_partner_router() -> None:
    relative = "services/dsh/backend/internal/http/server.go"

    workforce_anchor = '\tmux.HandleFunc("PUT /dsh/operator/platform/service-areas/{serviceAreaCode}", protected.handleOperatorUpsertServiceArea)\n'
    insert_before_once(
        relative,
        workforce_anchor,
        '\tmux.HandleFunc("POST /dsh/operator/workforce/media/uploads", protected.handleProviderMediaUpload)\n',
        'POST /dsh/operator/workforce/media/uploads',
    )

    field_finance_anchor = '\t// Primary-contract compatibility routes remain actor-owned and retry-safe.\n'
    field_finance_block = '''\t// Field self-finance journey: DSH references WLT-owned financial truth.\n\tmux.HandleFunc("GET /dsh/field/me/finance/wallet", protected.handleFieldMeWallet)\n\tmux.HandleFunc("GET /dsh/field/me/finance/commissions", protected.handleFieldMeCommissions)\n\tmux.HandleFunc("GET /dsh/field/me/finance/ledger-entries", protected.handleFieldMeLedgerEntries)\n\tmux.HandleFunc("GET /dsh/field/me/finance/payout-requests", protected.handleFieldMePayoutRequests)\n\tmux.HandleFunc("POST /dsh/field/me/finance/payout-requests", protected.handleSubmitFieldMePayoutRequest)\n\n'''
    insert_before_once(
        relative,
        field_finance_anchor,
        field_finance_block,
        'GET /dsh/field/me/finance/wallet',
    )

    partner_block = '''\t// Partner journey: proposal approval, field readiness, onboarding, activation and administration.\n\tmux.HandleFunc("POST /dsh/catalog-approvals", protected.handleCreateCatalogApproval)\n\tmux.HandleFunc("GET /dsh/catalog-approvals", protected.handleListCatalogApprovals)\n\tmux.HandleFunc("GET /dsh/catalog-approvals/{recordId}", protected.handleGetCatalogApproval)\n\tmux.HandleFunc("POST /dsh/catalog-approvals/{recordId}/transition", protected.handleTransitionCatalogApproval)\n\tmux.HandleFunc("GET /dsh/partner/catalog-approvals", protected.handleListPartnerCatalogApprovals)\n\n\tmux.HandleFunc("POST /dsh/field/stores/{storeId}/visits", protected.handleCreateFieldVisit)\n\tmux.HandleFunc("GET /dsh/field/stores/{storeId}/visits", protected.handleListFieldVisits)\n\tmux.HandleFunc("GET /dsh/field/work-queue", protected.handleFieldWorkQueue)\n\tmux.HandleFunc("POST /dsh/field/visits/{visitId}/complete", protected.handleCompleteFieldVisit)\n\tmux.HandleFunc("PUT /dsh/field/visits/{visitId}/checks", protected.handleUpsertReadinessCheck)\n\tmux.HandleFunc("GET /dsh/field/visits/{visitId}/checks", protected.handleListVisitChecks)\n\tmux.HandleFunc("POST /dsh/field/stores/{storeId}/escalations", protected.handleCreateReadinessEscalation)\n\tmux.HandleFunc("GET /dsh/operator/field-readiness/escalations", protected.handleListOperatorEscalations)\n\tmux.HandleFunc("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", protected.handleUpdateEscalation)\n\tmux.HandleFunc("GET /dsh/partner/stores/{storeId}/onboarding-status", protected.handlePartnerOnboardingStatus)\n\n\tmux.HandleFunc("GET /dsh/operator/partners", protected.handleListPartners)\n\tmux.HandleFunc("POST /dsh/operator/partners", protected.handleCreatePartner)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}", protected.handleGetPartner)\n\tmux.HandleFunc("POST /dsh/operator/partners/{partnerId}/transition", protected.handleActivationTransition)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}/readiness", protected.handleGetPartnerReadiness)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}/documents", protected.handleListPartnerDocuments)\n\tmux.HandleFunc("POST /dsh/operator/partners/{partnerId}/documents", protected.handleAddPartnerDocument)\n\tmux.HandleFunc("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", protected.handleReviewPartnerDocument)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}/stores", protected.handleListPartnerStores)\n\tmux.HandleFunc("POST /dsh/operator/partners/{partnerId}/stores", protected.handleLinkPartnerStore)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}/field-visits", protected.handleListPartnerFieldVisits)\n\tmux.HandleFunc("GET /dsh/operator/partners/{partnerId}/audit", protected.handleListPartnerAudit)\n\n\tmux.HandleFunc("GET /dsh/field/partners", protected.handleFieldListPartnerDrafts)\n\tmux.HandleFunc("POST /dsh/field/partners/drafts", protected.handleFieldCreatePartnerDraft)\n\tmux.HandleFunc("GET /dsh/field/partners/{partnerId}", protected.handleFieldGetPartnerDraft)\n\tmux.HandleFunc("PATCH /dsh/field/partners/{partnerId}", protected.handleFieldUpdatePartnerDraft)\n\tmux.HandleFunc("GET /dsh/field/partners/{partnerId}/readiness", protected.handleFieldGetPartnerReadiness)\n\tmux.HandleFunc("GET /dsh/field/partners/{partnerId}/store", protected.handleFieldGetPartnerStore)\n\tmux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/store", protected.handleFieldUpdatePartnerStore)\n\tmux.HandleFunc("GET /dsh/field/partners/{partnerId}/documents", protected.handleFieldListPartnerDocuments)\n\tmux.HandleFunc("POST /dsh/field/partners/{partnerId}/documents", protected.handleFieldUploadPartnerDocument)\n\tmux.HandleFunc("POST /dsh/field/partners/{partnerId}/visits", protected.handleFieldCreatePartnerVisit)\n\tmux.HandleFunc("GET /dsh/field/partners/{partnerId}/field-visits", protected.handleFieldListPartnerFieldVisits)\n\tmux.HandleFunc("POST /dsh/field/partners/{partnerId}/submit", protected.handleFieldSubmitPartnerDraft)\n\n\tmux.HandleFunc("GET /dsh/partner/activation/status", protected.handlePartnerActivationStatus)\n\tmux.HandleFunc("GET /dsh/partner/activation/readiness", protected.handlePartnerActivationReadiness)\n\n\tmux.HandleFunc("GET /dsh/operator/analytics/platform", protected.handlePlatformKpis)\n\tmux.HandleFunc("GET /dsh/operator/analytics/orders", protected.handleOrderAnalytics)\n\tmux.HandleFunc("GET /dsh/operator/analytics/delivery", protected.handleDeliveryAnalytics)\n\tmux.HandleFunc("GET /dsh/operator/analytics/stores", protected.handleStoreAnalytics)\n\tmux.HandleFunc("GET /dsh/partner/analytics/performance", protected.handlePartnerPerformance)\n\n\tmux.HandleFunc("GET /dsh/notifications", protected.handleListNotifications)\n\tmux.HandleFunc("POST /dsh/notifications/{notificationId}/read", protected.handleMarkNotificationRead)\n\tmux.HandleFunc("POST /dsh/notifications/read-all", protected.handleMarkAllNotificationsRead)\n\tmux.HandleFunc("PUT /dsh/notifications/preferences", protected.handleUpdateNotificationPreferences)\n\tmux.HandleFunc("GET /dsh/operator/notifications/config", protected.handleListPlatformNotificationConfig)\n\tmux.HandleFunc("PUT /dsh/operator/notifications/config", protected.handleUpsertPlatformNotificationConfig)\n\n\tmux.HandleFunc("GET /dsh/operator/admin/roles", protected.handleListRoles)\n\tmux.HandleFunc("POST /dsh/operator/admin/roles", protected.handleCreateRole)\n\tmux.HandleFunc("GET /dsh/operator/admin/staff", protected.handleListStaff)\n\tmux.HandleFunc("POST /dsh/operator/admin/staff/{staffId}/roles", protected.handleAssignStaffRole)\n\tmux.HandleFunc("GET /dsh/operator/admin/partners", protected.handleListPartnerActivations)\n\tmux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/activate", protected.handleActivatePartner)\n\tmux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/block", protected.handleBlockPartner)\n\tmux.HandleFunc("GET /dsh/operator/admin/captains", protected.handleListCaptainCredentials)\n\tmux.HandleFunc("POST /dsh/operator/admin/captains/{captainId}/credential", protected.handleUpsertCaptainCredential)\n\tmux.HandleFunc("GET /dsh/operator/admin/audit", protected.handleListAdminAudit)\n\n'''
    insert_before_once(
        relative,
        field_finance_anchor,
        partner_block,
        'GET /dsh/operator/partners/{partnerId}/readiness',
    )


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-journey-closure.py"
    if path.exists():
        path.unlink()


close_catalog_routes()
close_partner_router()
remove_self()
