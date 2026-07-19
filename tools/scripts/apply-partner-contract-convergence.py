from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


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


def normalize_outbox_repair_anchor() -> None:
    relative = "services/dsh/backend/internal/wltoutbox/wltoutbox.go"
    text = read(relative)
    text = re.sub(
        r"\n\s+client_id,tenant_id,points,reversal_of_reference,\n\s+external_reference,payload,reversal_requested,attempt_count",
        "\n           client_id,tenant_id,points,reversal_of_reference,\n            external_reference,payload,reversal_requested,attempt_count",
        text,
        count=1,
    )
    text = text.replace(
        "    FOR UPDATE`, id).Scan(\n",
        "    FOR UPDATE`, id\n\t).Scan(\n",
        1,
    )
    write(relative, text)


def remove_self() -> None:
    path = ROOT / "tools/scripts/apply-partner-contract-convergence.py"
    if path.exists():
        path.unlink()


retire_legacy_catalog_routes()
converge_catalog_route_methods()
rewrite_route_tests()
normalize_outbox_repair_anchor()
remove_self()
