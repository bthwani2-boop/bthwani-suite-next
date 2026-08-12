package http

import (
	"encoding/json"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

// Finance permission actions on the control-panel surface.
const (
	FinancePermissionRead   = "finance.read"
	FinancePermissionManage = "finance.manage"
)

func (s *protectedStoreServer) handleFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.settlements.read", "/wlt/settlements", []string{"partnerId", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.settlements.read", "/wlt/settlements/summary", []string{"partnerId"})(w, r)
}

func (s *protectedStoreServer) handlePartnerFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	scopes, err := s.workforce.GetActorScopes(r.Context(), actor.ID, actor.OperatorContextID, "partner")
	if err != nil || len(scopes.PartnerIDs) == 0 {
		store.SendError(w, http.StatusForbidden, "NO_PARTNER_ASSIGNMENT", "actor has no partner assignments")
		return
	}
	query := url.Values{}
	for _, key := range []string{"limit", "cursor"} {
		if v := r.URL.Query().Get(key); v != "" {
			query.Set(key, v)
		}
	}
	query.Set("partnerId", scopes.PartnerIDs[0])
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.settlements.read", "/wlt/settlements", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handlePartnerFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	scopes, err := s.workforce.GetActorScopes(r.Context(), actor.ID, actor.OperatorContextID, "partner")
	if err != nil || len(scopes.PartnerIDs) == 0 {
		store.SendError(w, http.StatusForbidden, "NO_PARTNER_ASSIGNMENT", "actor has no partner assignments")
		return
	}
	query := url.Values{}
	query.Set("partnerId", scopes.PartnerIDs[0])
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.settlements.read", "/wlt/settlements/summary", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFinanceRefunds(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	query := url.Values{}
	for _, key := range []string{"orderId", "limit", "cursor"} {
		if v := r.URL.Query().Get(key); v != "" {
			query.Set(key, v)
		}
	}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.refunds.read", "/wlt/refunds", query, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFinanceRefundDetail(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.refunds.read", "/wlt/refunds/"+url.PathEscape(r.PathValue("refundId")), nil, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFinanceLedgerEntries(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/ledger/entries", []string{"actorId", "actorType", "orderId", "entryType", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceFinancialSummary(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/ledger/financial-summary", nil)(w, r)
}

func (s *protectedStoreServer) handleFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.cod.read", "/wlt/cod-records", []string{"captainId", "orderId", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/commissions", []string{"orderId", "captainId", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesPaymentStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/references/payment-status", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesSettlementStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/references/settlement-status", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesRefundStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/references/refund-status", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesFieldCommission(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.read", "/wlt/references/field-commission", []string{"partnerId"})(w, r)
}

func (s *protectedStoreServer) handleCaptainFinanceCodRecords(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{}
	query.Set("captainId", actor.ID)
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.cod.read", "/wlt/cod-records", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFinancePayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.payout_requests.read", "/wlt/payout-requests", []string{"status", "limit", "cursor", "beneficiaryActorId"})(w, r)
}

func (s *protectedStoreServer) handleApproveFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	s.handleFacadeWrite("finance.payout_requests.approve", "/wlt/payout-requests/"+url.PathEscape(payoutID)+"/approve")(w, r)
}

func (s *protectedStoreServer) handleRejectFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	s.handleFacadeWrite("finance.payout_requests.reject", "/wlt/payout-requests/"+url.PathEscape(payoutID)+"/reject")(w, r)
}

func (s *protectedStoreServer) handleFinanceReconciliationCases(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.reconciliation.read", "/wlt/reconciliation-cases", []string{"status"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReconciliationCaseDetail(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.reconciliation.read", "/wlt/reconciliation-cases/"+url.PathEscape(r.PathValue("caseId")), nil)(w, r)
}

func (s *protectedStoreServer) handleAssignFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	caseID := r.PathValue("caseId")
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	s.handleFacadeWrite("finance.reconciliation.assign", "/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/assign")(w, r)
}

func (s *protectedStoreServer) handleResolveFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
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
		"operatorId":       actor.ID,
		"resolutionAction": input.ResolutionAction,
		"resolutionNote":   input.ResolutionNote,
	})

	status, respBody, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.reconciliation.resolve", http.MethodPost, "/wlt/reconciliation-cases/"+url.PathEscape(caseID)+"/resolve", body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(respBody)
}

func (s *protectedStoreServer) handleFacadeRead(opID, wltPath string, allowedQueryParams []string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := s.ActorFromContext(r.Context())
		if !ok {
			return
		}

		query := url.Values{}
		for _, key := range allowedQueryParams {
			if v := r.URL.Query().Get(key); v != "" {
				query.Set(key, v)
			}
		}

		status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), opID, wltPath, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
		if err != nil {
			store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance operation failed")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(body)
	}
}

func (s *protectedStoreServer) handleFacadeWrite(opID, wltPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := s.ActorFromContext(r.Context())
		if !ok {
			return
		}

		body := operatorWriteBody()

		status, respBody, err := s.wlt.ExecuteFinanceWrite(r.Context(), opID, http.MethodPost, wltPath, body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance operation failed")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write(respBody)
	}
}

func operatorWriteBody() []byte {
	body, _ := json.Marshal(struct{}{})
	return body
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

func (s *protectedStoreServer) proxyFinanceRead(w http.ResponseWriter, r *http.Request, opID, wltPath string, query url.Values, operatorContextID string) {
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), opID, wltPath, query, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
