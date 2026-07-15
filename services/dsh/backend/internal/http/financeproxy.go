package http

import (
	"encoding/json"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

// Finance permission actions on the control-panel surface. "operator"
// remains a valid fallback role during RBAC data migration.
//
// FinancePermissionManage is required for money-moving actions (payout
// approve/reject) -- these previously shared FinancePermissionRead with
// every other read-only finance route, meaning any actor granted read
// access could also approve or reject payouts.
const (
	FinancePermissionRead   = "finance.read"
	FinancePermissionManage = "finance.manage"
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
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements", financeQuery(r, "partnerId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/settlements/summary
func (s *protectedStoreServer) handleFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements/summary", financeQuery(r, "partnerId"))
}

// GET /dsh/control-panel/finance/refunds
func (s *protectedStoreServer) handleFinanceRefunds(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds", financeQuery(r, "orderId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/refunds/{refundId}
func (s *protectedStoreServer) handleFinanceRefundDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds/"+url.PathEscape(r.PathValue("refundId")), nil)
}

// GET /dsh/control-panel/finance/ledger/entries
func (s *protectedStoreServer) handleFinanceLedgerEntries(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/ledger/entries", financeQuery(r, "actorId", "actorType", "orderId", "entryType", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/cod-records
func (s *protectedStoreServer) handleFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/cod-records", financeQuery(r, "captainId", "orderId", "limit", "cursor"))
}

// GET /dsh/control-panel/finance/commissions
func (s *protectedStoreServer) handleFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
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

// GET /dsh/control-panel/finance/payout-requests
func (s *protectedStoreServer) handleFinancePayoutRequests(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/payout-requests", financeQuery(r, "status", "limit", "cursor", "beneficiaryActorId"))
}

// operatorWriteBody builds the JSON body sent to WLT for a payout-request
// status transition, carrying the resolved operator's identity so WLT can
// record who performed each transition (approved_by/completed_by/... ) and
// enforce maker/checker separation.
func operatorWriteBody(operatorID string) []byte {
	body, _ := json.Marshal(map[string]string{"operatorId": operatorID})
	return body
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve
func (s *protectedStoreServer) handleApproveFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutId := r.PathValue("payoutId")
	if payoutId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests/"+url.PathEscape(payoutId)+"/approve", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject
func (s *protectedStoreServer) handleRejectFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutId := r.PathValue("payoutId")
	if payoutId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests/"+url.PathEscape(payoutId)+"/reject", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

// GET /dsh/control-panel/finance/reconciliation-cases
func (s *protectedStoreServer) handleFinanceReconciliationCases(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/reconciliation-cases", financeQuery(r, "status"))
}

// GET /dsh/control-panel/finance/reconciliation-cases/{caseId}
func (s *protectedStoreServer) handleFinanceReconciliationCaseDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/reconciliation-cases/"+url.PathEscape(r.PathValue("caseId")), nil)
}

// POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign
func (s *protectedStoreServer) handleAssignFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	caseId := r.PathValue("caseId")
	if caseId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/reconciliation-cases/"+url.PathEscape(caseId)+"/assign", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

// POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve
func (s *protectedStoreServer) handleResolveFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	caseId := r.PathValue("caseId")
	if caseId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	var input struct {
		ResolutionAction string `json:"resolutionAction"`
		ResolutionNote   string `json:"resolutionNote"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024)).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	body, _ := json.Marshal(map[string]string{
		"operatorId":       actor.ID,
		"resolutionAction": input.ResolutionAction,
		"resolutionNote":   input.ResolutionNote,
	})
	status, respBody, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/reconciliation-cases/"+url.PathEscape(caseId)+"/resolve", body, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(respBody)
}
