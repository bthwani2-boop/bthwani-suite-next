from __future__ import annotations

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
    raise RuntimeError(f"missing convergence anchor in {relative}: {old[:160]!r}")


def retire_legacy_catalog_routes() -> None:
    relative = "services/dsh/backend/internal/http/server.go"
    text = read(relative)
    start_marker = "\t// Compatibility adapters route to the same sovereign catalog handlers.\n"
    end_marker = "\tregisterUnifiedCatalogRoutes(mux, protected)\n"
    start = text.find(start_marker)
    if start >= 0:
        end = text.find(end_marker, start)
        if end < 0:
            raise RuntimeError("unified catalog registrar anchor missing")
        text = text[:start] + end_marker + text[end + len(end_marker):]
    write(relative, text)


def converge_catalog_route_methods() -> None:
    relative = "services/dsh/backend/internal/http/catalog_unified_routes.go"
    text = read(relative)
    replacements = {
        '\tmux.HandleFunc("PATCH /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)\n': '',
        '\tmux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)\n': '',
        '\tmux.HandleFunc("PUT /dsh/operator/catalog/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)\n': '',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    required = [
        (
            '\tmux.HandleFunc("POST /dsh/partner/catalog/product-proposals", s.handlePartnerCreateProductProposal)\n',
            '\tmux.HandleFunc("PUT /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)\n',
        ),
        (
            '\tmux.HandleFunc("POST /dsh/field/partners/{partnerId}/catalog/product-proposals", s.handleFieldCreateProductProposal)\n',
            '\tmux.HandleFunc("PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)\n',
        ),
        (
            '\tmux.HandleFunc("PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}", s.handlePutProductProposalImageSafe)\n',
            '\tmux.HandleFunc("PUT /dsh/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)\n',
        ),
    ]
    for anchor, line in required:
        if line in text:
            continue
        if anchor not in text:
            raise RuntimeError(f"catalog route anchor missing: {anchor.strip()}")
        text = text.replace(anchor, anchor + line, 1)
    write(relative, text)


def rewrite_route_tests() -> None:
    legacy_relative = "services/dsh/backend/internal/http/catalog_legacy_occ_routes_test.go"
    write(
        legacy_relative,
        '''package http

import (
\t"net/http"
\t"net/http/httptest"
\t"testing"
)

func TestLegacyCatalogWriteRoutesAreRetired(t *testing.T) {
\tt.Parallel()

\tmux := NewRouter(nil, nil, nil, nil)
\tcases := []struct {
\t\tmethod       string
\t\tpath         string
\t\twantedStatus int
\t}{
\t\t{http.MethodPut, "/dsh/catalog/stores/store-1/assortment/product-1", http.StatusNotFound},
\t\t{http.MethodPut, "/dsh/field/catalog/stores/store-1/assortment/product-1", http.StatusNotFound},
\t\t{http.MethodPut, "/dsh/partner/catalog/assortment/product-1", http.StatusNotFound},
\t\t{http.MethodPatch, "/dsh/partner/catalog/product-proposals/proposal-1", http.StatusMethodNotAllowed},
\t\t{http.MethodPatch, "/dsh/field/partners/partner-1/catalog/product-proposals/proposal-1", http.StatusMethodNotAllowed},
\t}

\tfor _, tc := range cases {
\t\tt.Run(tc.method+" "+tc.path, func(t *testing.T) {
\t\t\treq := httptest.NewRequest(tc.method, tc.path, nil)
\t\t\thandler, pattern := mux.Handler(req)
\t\t\tif tc.wantedStatus == http.StatusNotFound && pattern != "" && pattern != "/" {
\t\t\t\tt.Fatalf("legacy route remains registered: got %q", pattern)
\t\t\t}
\t\t\tif tc.wantedStatus == http.StatusMethodNotAllowed && pattern != "" {
\t\t\t\tt.Fatalf("retired method unexpectedly matched route pattern %q", pattern)
\t\t\t}
\t\t\trecorder := httptest.NewRecorder()
\t\t\thandler.ServeHTTP(recorder, req)
\t\t\tif recorder.Code != tc.wantedStatus {
\t\t\t\tt.Fatalf("retired route returned status %d, want %d", recorder.Code, tc.wantedStatus)
\t\t\t}
\t\t})
\t}
}
''',
    )

    unified_relative = "services/dsh/backend/internal/http/catalog_unified_routes_test.go"
    text = read(unified_relative)
    obsolete = [
        '\t\t{http.MethodPatch, "/dsh/catalog/domains/domain-1", "PATCH /dsh/catalog/domains/{domainId}"},\n',
        '\t\t{http.MethodPatch, "/dsh/catalog/nodes/node-1", "PATCH /dsh/catalog/nodes/{nodeId}"},\n',
        '\t\t{http.MethodPatch, "/dsh/catalog/master-products/product-1", "PATCH /dsh/catalog/master-products/{productId}"},\n',
        '\t\t{http.MethodPatch, "/dsh/catalog/policies/policy-1", "PATCH /dsh/catalog/policies/{policyId}"},\n',
    ]
    for line in obsolete:
        text = text.replace(line, "")
    text = text.replace(
        '\t\t{http.MethodPut, "/dsh/operator/catalog/stores/store-1/images/logo", "PUT /dsh/operator/catalog/stores/{storeId}/images/{role}"},\n',
        '\t\t{http.MethodPut, "/dsh/stores/store-1/images/logo", "PUT /dsh/stores/{storeId}/images/{role}"},\n',
    )
    partner_anchor = '\t\t{http.MethodPost, "/dsh/partner/catalog/product-proposals", "POST /dsh/partner/catalog/product-proposals"},\n'
    partner_update = '\t\t{http.MethodPut, "/dsh/partner/catalog/product-proposals/proposal-1", "PUT /dsh/partner/catalog/product-proposals/{proposalId}"},\n'
    if partner_update not in text:
        if partner_anchor not in text:
            raise RuntimeError("partner proposal test anchor missing")
        text = text.replace(partner_anchor, partner_anchor + partner_update, 1)
    field_anchor = '\t\t{http.MethodPost, "/dsh/field/partners/partner-1/catalog/product-proposals", "POST /dsh/field/partners/{partnerId}/catalog/product-proposals"},\n'
    field_update = '\t\t{http.MethodPut, "/dsh/field/partners/partner-1/catalog/product-proposals/proposal-1", "PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}"},\n'
    if field_update not in text:
        if field_anchor not in text:
            raise RuntimeError("field proposal test anchor missing")
        text = text.replace(field_anchor, field_anchor + field_update, 1)
    write(unified_relative, text)


def close_wltoutbox_callers() -> None:
    replace_once(
        "services/dsh/backend/internal/orders/lifecycle.go",
        '''type DeliveryCompletionContext struct {
\tCheckoutIntentID string
\tPaymentMethod    string
\tPartnerID        string
}''',
        '''type DeliveryCompletionContext struct {
\tTenantID         string
\tCheckoutIntentID string
\tPaymentMethod    string
\tPartnerID        string
}''',
    )
    replace_once(
        "services/dsh/backend/internal/orders/lifecycle.go",
        '''\t\tSELECT o.checkout_intent_id::text, ci.payment_method, s.partner_id''',
        '''\t\tSELECT ci.tenant_id, o.checkout_intent_id::text, ci.payment_method, s.partner_id''',
    )
    replace_once(
        "services/dsh/backend/internal/orders/lifecycle.go",
        '''\t).Scan(&context.CheckoutIntentID, &context.PaymentMethod, &partnerID)''',
        '''\t).Scan(&context.TenantID, &context.CheckoutIntentID, &context.PaymentMethod, &partnerID)''',
    )
    replace_once(
        "services/dsh/backend/internal/dispatch/dispatch.go",
        '''return wltoutbox.Enqueue(tx, wltoutbox.EventTypeDeliveryCompleted, orderID, captainID, deliveryCtx.PartnerID, deliveryCtx.CheckoutIntentID)''',
        '''return wltoutbox.Enqueue(tx, wltoutbox.EventTypeDeliveryCompleted, deliveryCtx.TenantID, orderID, captainID, deliveryCtx.PartnerID, deliveryCtx.CheckoutIntentID)''',
    )
    replace_once(
        "services/dsh/backend/internal/partnerdelivery/service.go",
        '''\t\twltoutbox.EventTypeDeliveryCompleted,
\t\torderID,''',
        '''\t\twltoutbox.EventTypeDeliveryCompleted,
\t\tdeliveryCtx.TenantID,
\t\torderID,''',
    )

    test_relative = "services/dsh/backend/internal/wltoutbox/wltoutbox_db_test.go"
    replace_once(
        test_relative,
        '''\tclientID := "wlt-outbox-test-client-" + suffix''',
        '''\ttenantID := "tenant-wlt-outbox-test"
\tclientID := "wlt-outbox-test-client-" + suffix''',
    )
    replace_once(
        test_relative,
        '''\t\tINSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2::uuid, $3, 'payment_pending', 'cod', $4)''',
        '''\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'cod', $5)''',
    )
    replace_once(
        test_relative,
        '''\t\tclientID, cartID, storeID, "wlt-ps-"+suffix,''',
        '''\t\ttenantID, clientID, cartID, storeID, "wlt-ps-"+suffix,''',
    )
    text = read(test_relative)
    old_call = 'Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID)'
    new_call = 'Enqueue(tx, EventTypeDeliveryCompleted, "tenant-wlt-outbox-test", orderID, "captain-1", "partner-1", checkoutIntentID)'
    if old_call in text:
        text = text.replace(old_call, new_call)
        write(test_relative, text)
    elif new_call not in text:
        raise RuntimeError("WLT outbox DB test enqueue anchor missing")


def close_partner_order_read_after_write() -> None:
    replace_once(
        "services/dsh/backend/internal/orders/orders.go",
        '''func ListPartnerOrders(db *sql.DB, storeID, statusFilter string, limit int) ([]Order, error) {
\tif limit <= 0 || limit > 200 {
\t\tlimit = 50
\t}
\tif statusFilter == "" {
\t\tstatusFilter = string(StatusPending)
\t}
\trows, err := db.Query(`
\t\tSELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
\t\t       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
\t\tFROM dsh_orders
\t\tWHERE store_id = $1 AND status = $2
\t\tORDER BY created_at ASC
\t\tLIMIT $3`, storeID, statusFilter, limit)
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer rows.Close()
\treturn scanOrders(rows)
}''',
        '''func ListPartnerOrders(db *sql.DB, storeID, statusFilter string, limit int) ([]Order, error) {
\tif limit <= 0 || limit > 200 {
\t\tlimit = 50
\t}
\tvar (
\t\trows *sql.Rows
\t\terr  error
\t)
\tif statusFilter != "" {
\t\trows, err = db.Query(`
\t\t\tSELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
\t\t\t       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
\t\t\tFROM dsh_orders
\t\t\tWHERE store_id = $1 AND status = $2
\t\t\tORDER BY created_at DESC
\t\t\tLIMIT $3`, storeID, statusFilter, limit)
\t} else {
\t\trows, err = db.Query(`
\t\t\tSELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
\t\t\t       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
\t\t\tFROM dsh_orders
\t\t\tWHERE store_id = $1
\t\t\tORDER BY created_at DESC
\t\t\tLIMIT $2`, storeID, limit)
\t}
\tif err != nil {
\t\treturn nil, err
\t}
\tdefer rows.Close()
\treturn scanOrders(rows)
}''',
    )


def close_runtime_matrix_collection_semantics() -> None:
    replace_once(
        "tools/scripts/test-dsh-multisurface-runtime-matrix-v2.ps1",
        '''function Find-Id([object[]]$Items, [string]$Id) {
  return @($Items | Where-Object { "$(Get-Value $_ 'id')" -eq $Id })
}''',
        '''function Find-Id([object[]]$Items, [string]$Id) {
  $FoundItems = @($Items | Where-Object { "$(Get-Value $_ 'id')" -eq $Id })
  Write-Output -NoEnumerate $FoundItems
}''',
    )


def retire_materialized_outbox_repair() -> None:
    source = read("services/dsh/backend/internal/wltoutbox/wltoutbox.go")
    closed_signature = "func Enqueue(tx *sql.Tx, eventType, tenantID, orderID, captainID, partnerID, checkoutIntentID string) error"
    if closed_signature not in source:
        return

    relative = "tools/scripts/apply-partner-team-audit-closure.py"
    text = read(relative)
    start_marker = "# Durable DSH -> WLT events carry the tenant through enqueue, claim, retry,\n"
    end_marker = "# Central catalog bootstrap must use sovereign IDs, truthful media types, and\n"
    start = text.find(start_marker)
    if start < 0:
        return
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError("central catalog bootstrap marker missing after materialized outbox block")
    write(relative, text[:start] + text[end:])


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-contract-convergence.py"
    if path.exists():
        path.unlink()


retire_legacy_catalog_routes()
converge_catalog_route_methods()
rewrite_route_tests()
close_wltoutbox_callers()
close_partner_order_read_after_write()
close_runtime_matrix_collection_semantics()
retire_materialized_outbox_repair()
remove_self()
