package http

import (
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

// Read-only finance proxy.
//
// WLT protects its internal financial read routes with service-caller auth
// (WLT_DSH_SERVICE_TOKEN), so browsers can never call them directly. These
// handlers let authenticated DSH actors read the governed financial views:
// the service secret stays server-side and each route re-checks the DSH
// actor role before forwarding. Responses are passed through verbatim — WLT
// remains the only owner of financial truth.

func (s *protectedStoreServer) proxyFinanceRead(w http.ResponseWriter, r *http.Request, wltPath string, query url.Values) {
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	status, body, err := s.wlt.FinanceRead(r.Context(), wltPath, query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// financeQuery copies only the allowlisted query parameters so arbitrary
// upstream query injection through the proxy is not possible.
func financeQuery(r *http.Request, keys ...string) url.Values {
	out := url.Values{}
	for _, key := range keys {
		if v := r.URL.Query().Get(key); v != "" {
			out.Set(key, v)
		}
	}
	return out
}

// GET /dsh/control-panel/finance/settlements
func (s *protectedStoreServer) handleFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements", financeQuery(r, "partnerId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/settlements/summary
func (s *protectedStoreServer) handleFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements/summary", financeQuery(r, "partnerId"))
}

// GET /dsh/control-panel/finance/refunds
func (s *protectedStoreServer) handleFinanceRefunds(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds", financeQuery(r, "orderId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/refunds/{refundId}
func (s *protectedStoreServer) handleFinanceRefundDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds/"+url.PathEscape(r.PathValue("refundId")), nil)
}

// GET /dsh/control-panel/finance/ledger/entries
func (s *protectedStoreServer) handleFinanceLedgerEntries(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/ledger/entries", financeQuery(r, "actorId", "actorType", "orderId", "entryType", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/cod-records
func (s *protectedStoreServer) handleFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/cod-records", financeQuery(r, "captainId", "orderId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/commissions
func (s *protectedStoreServer) handleFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/commissions", financeQuery(r, "orderId", "captainId", "limit", "cursor"))
}

// GET /dsh/captain/finance/cod-records
//
// The captain identity comes from the resolved actor — never from the query
// string — so a captain can only ever read their own COD liability.
func (s *protectedStoreServer) handleCaptainFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{}
	query.Set("captainId", actor.ID)
	s.proxyFinanceRead(w, r, "/wlt/cod-records", query)
}
