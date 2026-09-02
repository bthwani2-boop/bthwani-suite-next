package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func writePartnerFinanceScopeError(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrAmbiguousStoreScope) {
		store.SendError(w, http.StatusConflict, "PARTNER_SCOPE_REQUIRED", "actor is assigned to multiple partner scopes")
		return
	}
	store.SendError(w, http.StatusForbidden, "NO_PARTNER_ASSIGNMENT", "actor has no partner assignments")
}

// Finance permission actions on the control-panel surface.
const (
	FinancePermissionRead   = "finance.read"
	FinancePermissionManage = "finance.manage"
)

func (s *protectedStoreServer) handleFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.settlements.read", []string{"partnerId", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.settlements.summary.read", []string{"partnerId"})(w, r)
}

func (s *protectedStoreServer) handlePartnerFinanceSettlements(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	partnerID, err := store.ResolveActorPartnerID(r.Context(), s.db, actor)
	if err != nil || partnerID == "" {
		writePartnerFinanceScopeError(w, err)
		return
	}
	query := url.Values{}
	for _, key := range []string{"limit", "cursor"} {
		if v := r.URL.Query().Get(key); v != "" {
			query.Set(key, v)
		}
	}
	query.Set("partnerId", partnerID)
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.settlements.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
}

func (s *protectedStoreServer) handlePartnerFinanceSettlementSummary(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	partnerID, err := store.ResolveActorPartnerID(r.Context(), s.db, actor)
	if err != nil || partnerID == "" {
		writePartnerFinanceScopeError(w, err)
		return
	}
	query := url.Values{}
	query.Set("partnerId", partnerID)
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.settlements.summary.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
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
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.refunds.read", nil, query, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
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
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.refunds.detail.read", map[string]string{"refundId": r.PathValue("refundId")}, nil, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
}

func (s *protectedStoreServer) handleFinanceLedgerEntries(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.entries.read", []string{"actorId", "actorType", "orderId", "entryType", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceFinancialSummary(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.summary.read", nil)(w, r)
}

func (s *protectedStoreServer) handleFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.commissions.read", []string{"orderId", "captainId", "limit", "cursor"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesPaymentStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.payment_status.read", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesSettlementStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.settlement_status.read", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesRefundStatus(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.refund_status.read", []string{"orderId"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReferencesFieldCommission(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.ledger.field_commission.read", []string{"partnerId"})(w, r)
}

func (s *protectedStoreServer) handleFinancePayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.payout_requests.read", []string{"status", "limit", "cursor", "beneficiaryActorId"})(w, r)
}

func (s *protectedStoreServer) handleApproveFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	s.handleFacadeWrite("finance.payout_requests.approve", func(*http.Request) map[string]string { return map[string]string{"payoutId": payoutID} })(w, r)
}

func (s *protectedStoreServer) handleRejectFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	s.handleFacadeWrite("finance.payout_requests.reject", func(*http.Request) map[string]string { return map[string]string{"payoutId": payoutID} })(w, r)
}

func (s *protectedStoreServer) handleFinanceReconciliationCases(w http.ResponseWriter, r *http.Request) {
	s.handleFacadeRead("finance.reconciliation.read", []string{"status"})(w, r)
}

func (s *protectedStoreServer) handleFinanceReconciliationCaseDetail(w http.ResponseWriter, r *http.Request) {
	s.wltFinanceReadWithParams(w, r, "finance.reconciliation.detail.read", map[string]string{"caseId": r.PathValue("caseId")}, nil)
}

func (s *protectedStoreServer) handleAssignFinanceReconciliationCase(w http.ResponseWriter, r *http.Request) {
	caseID := r.PathValue("caseId")
	if caseID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "caseId is required")
		return
	}
	s.handleFacadeWrite("finance.reconciliation.assign", func(*http.Request) map[string]string { return map[string]string{"caseId": caseID} })(w, r)
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

	status, respBody, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.reconciliation.resolve", map[string]string{"caseId": caseID}, body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	writeFinanceResponse(w, status, respBody, nil)
}

func (s *protectedStoreServer) handleFacadeRead(opID string, allowedQueryParams []string) http.HandlerFunc {
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

		status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), opID, nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
		if err != nil {
			store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance operation failed")
			return
		}
		writeFinanceResponse(w, status, body, nil)
	}
}

func (s *protectedStoreServer) wltFinanceReadWithParams(w http.ResponseWriter, r *http.Request, opID string, params map[string]string, query url.Values) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), opID, params, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
}

func (s *protectedStoreServer) handleFacadeWrite(opID string, params func(*http.Request) map[string]string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := s.ActorFromContext(r.Context())
		if !ok {
			return
		}

		body := operatorWriteBody()

		status, respBody, err := s.wlt.ExecuteFinanceWrite(r.Context(), opID, params(r), body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance operation failed")
			return
		}
		writeFinanceResponse(w, status, respBody, nil)
	}
}

func operatorWriteBody() []byte {
	body, _ := json.Marshal(struct{}{})
	return body
}

func (s *protectedStoreServer) proxyFinanceRead(w http.ResponseWriter, r *http.Request, opID string, params map[string]string, query url.Values, operatorContextID string) {
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), opID, params, query, r.Header.Get("X-Correlation-ID"), operatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance read failed")
		return
	}
	writeFinanceResponse(w, status, body, nil)
}

// handleRetryWltOutboxEvent re-drives a WLT-owned delivery that exhausted its
// attempts. WLT remains the owner of the outbox state machine; DSH only
// authorizes the delegated finance principal and forwards the command.
func (s *protectedStoreServer) handleRetryWltDeliveryEvent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	eventID := strings.TrimSpace(r.PathValue("eventId"))
	if eventID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "eventId is required")
		return
	}
	var input struct {
		Reason string `json:"reason"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	body, _ := json.Marshal(map[string]string{"reason": input.Reason})
	status, respBody, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.wlt_outbox_events.retry", map[string]string{"eventId": eventID}, body, r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"), actor.OperatorContextID, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	writeFinanceResponse(w, status, respBody, nil)
}
