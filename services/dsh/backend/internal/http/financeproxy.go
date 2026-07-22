package http

import (
	"encoding/json"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

// Finance permission actions on the control-panel surface. "operator"
// remains a valid fallback role during RBAC data migration.
const (
	FinancePermissionRead   = "finance.read"
	FinancePermissionManage = "finance.manage"
)

// proxyFinanceRead keeps the WLT service credential server-side. When DSH has
// resolved a trusted tenant it is forwarded as an authorization boundary, not
// as a browser-controlled query value.
func (s *protectedStoreServer) proxyFinanceRead(w http.ResponseWriter, r *http.Request, wltPath string, query url.Values) {
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	status, body, err := s.wlt.FinanceReadWithTenant(
		r.Context(),
		wltPath,
		query,
		r.Header.Get("X-Correlation-ID"),
		r.Header.Get("X-Tenant-ID"),
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func financeQuery(r *http.Request, keys ...string) url.Values {
	out := url.Values{}
	for _, key := range keys {
		if v := r.URL.Query().Get(key); v != "" {
			out.Set(key, v)
		}
	}
	return out
}

func (s *protectedStoreServer) handleFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements", financeQuery(r, "partnerId", "limit", "cursor"))
}

func (s *protectedStoreServer) handleFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/settlements/summary", financeQuery(r, "partnerId"))
}

func (s *protectedStoreServer) handlePartnerFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	query := financeQuery(r, "limit", "cursor")
	query.Set("partnerId", actor.ID)
	s.proxyFinanceRead(w, r, "/wlt/settlements", query)
}

func (s *protectedStoreServer) handlePartnerFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	query := url.Values{}
	query.Set("partnerId", actor.ID)
	s.proxyFinanceRead(w, r, "/wlt/settlements/summary", query)
}

// Control-panel refund reads are tenant-bound before WLT is called.
func (s *protectedStoreServer) handleFinanceRefunds(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	if _, ok := requiredPaymentTenant(w, r); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds", financeQuery(r, "orderId", "limit", "cursor"))
}

func (s *protectedStoreServer) handleFinanceRefundDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	if _, ok := requiredPaymentTenant(w, r); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/refunds/"+url.PathEscape(r.PathValue("refundId")), nil)
}

func (s *protectedStoreServer) handleFinanceLedgerEntries(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/ledger/entries", financeQuery(r, "actorId", "actorType", "orderId", "entryType", "limit", "cursor"))
}

func (s *protectedStoreServer) handleFinanceFinancialSummary(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/ledger/financial-summary", nil)
}

func (s *protectedStoreServer) handleFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/cod-records", financeQuery(r, "captainId", "orderId", "limit", "cursor"))
}

func (s *protectedStoreServer) handleFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/commissions", financeQuery(r, "orderId", "captainId", "limit", "cursor"))
}

func (s *protectedStoreServer) handleCaptainFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{}
	query.Set("captainId", actor.ID)
	s.proxyFinanceRead(w, r, "/wlt/cod-records", query)
}

func (s *protectedStoreServer) handleFinancePayoutRequests(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/payout-requests", financeQuery(r, "status", "limit", "cursor", "beneficiaryActorId"))
}

func operatorWriteBody(operatorID string) []byte {
	body, _ := json.Marshal(map[string]string{"operatorId": operatorID})
	return body
}

func (s *protectedStoreServer) handleApproveFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests/"+url.PathEscape(payoutID)+"/approve", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleRejectFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests/"+url.PathEscape(payoutID)+"/reject", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFinanceReconciliationCases(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/reconciliation-cases", financeQuery(r, "status"))
}

func (s *protectedStoreServer) handleFinanceReconciliationCaseDetail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	s.proxyFinanceRead(w, r, "/wlt/reconciliation-cases/"+url.PathEscape(r.PathValue("caseId")), nil)
}

func (s *protectedStoreServer) handleAssignFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	caseID := r.PathValue("caseId")
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/assign", operatorWriteBody(actor.ID), r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleResolveFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	caseID := r.PathValue("caseId")
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	var input struct {
		ResolutionAction string `json:"resolutionAction"`
		ResolutionNote   string `json:"resolutionNote"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	body, _ := json.Marshal(map[string]string{
		"operatorId": actor.ID, "resolutionAction": input.ResolutionAction, "resolutionNote": input.ResolutionNote,
	})
	status, responseBody, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/resolve", body, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(responseBody)
}
