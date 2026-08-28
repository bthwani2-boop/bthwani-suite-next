package http

import (
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

var representativeWalletActorTypes = map[string]struct{}{
	"client":  {},
	"partner": {},
	"captain": {},
	"field":   {},
}

func normalizeRepresentativeWalletActorType(value string) (string, bool) {
	actorType := strings.ToLower(strings.TrimSpace(value))
	_, ok := representativeWalletActorTypes[actorType]
	return actorType, ok
}

func writeRepresentativeFinanceResponse(w http.ResponseWriter, status int, body []byte, err error) {
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Pragma", "no-cache")
	writeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativeWallet(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.wallet.read", map[string]string{"actorType": actorType, "actorId": actor.ID}, nil, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativeLedger(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{"actorId": {actor.ID}, "actorType": {actorType}}
	for _, key := range []string{"entryType", "limit", "cursor"} {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			query.Set(key, value)
		}
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.ledger.entries.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativeCommissions(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {actorType}}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.ledger.commissions.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleClientOwnWallet(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeWallet(w, r, "client")
}
func (s *protectedStoreServer) handleClientOwnLedger(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeLedger(w, r, "client")
}
func (s *protectedStoreServer) handlePartnerOwnWallet(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeWallet(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerOwnLedger(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeLedger(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerOwnCommissions(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeCommissions(w, r, "partner")
}
func (s *protectedStoreServer) handleCaptainOwnWallet(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeWallet(w, r, "captain")
}
func (s *protectedStoreServer) handleCaptainOwnLedger(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeLedger(w, r, "captain")
}
func (s *protectedStoreServer) handleFieldOwnWallet(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeWallet(w, r, "field")
}
func (s *protectedStoreServer) handleFieldOwnLedger(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativeLedger(w, r, "field")
}

func resolveControlPanelRepresentativeActor(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	actorType, ok := normalizeRepresentativeWalletActorType(r.PathValue("actorType"))
	if !ok {
		store.SendError(w, http.StatusBadRequest, "UNSUPPORTED_ACTOR_TYPE", "actorType must be client, partner, captain, or field")
		return "", "", false
	}
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if actorID == "" || len(actorID) > 200 {
		store.SendError(w, http.StatusBadRequest, "INVALID_ACTOR_ID", "actorId is required and must not exceed 200 characters")
		return "", "", false
	}
	return actorType, actorID, true
}

func (s *protectedStoreServer) handleControlPanelRepresentativeWallet(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveControlPanelRepresentativeActor(w, r)
	if !ok {
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), operator.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.wallet.read", map[string]string{"actorType": actorType, "actorId": actorID}, nil, r.Header.Get("X-Correlation-ID"), operator.OperatorContextID)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleControlPanelRepresentativeLedger(w http.ResponseWriter, r *http.Request) {
	operator, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	actorType, actorID, ok := resolveControlPanelRepresentativeActor(w, r)
	if !ok {
		return
	}
	query := url.Values{"actorId": {actorID}, "actorType": {actorType}}
	for _, key := range []string{"entryType", "limit", "cursor"} {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			query.Set(key, value)
		}
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), operator.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(trustedContext, "finance.ledger.entries.read", nil, query, r.Header.Get("X-Correlation-ID"), operator.OperatorContextID)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

// Self-service finance routes are intentionally read/request only. Master payout
// destination data is managed exclusively through control-panel finance routes.
func registerRepresentativeFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/client/me/finance/wallet", s.handleClientOwnWallet)
	mux.HandleFunc("GET /dsh/client/me/finance/ledger-entries", s.handleClientOwnLedger)

	mux.HandleFunc("GET /dsh/partner/me/finance/wallet", s.handlePartnerOwnWallet)
	mux.HandleFunc("GET /dsh/partner/me/finance/ledger-entries", s.handlePartnerOwnLedger)
	mux.HandleFunc("GET /dsh/partner/me/finance/commissions", s.handlePartnerOwnCommissions)
	mux.HandleFunc("GET /dsh/partner/me/finance/payout-requests", s.handlePartnerPayoutRequests)
	mux.HandleFunc("POST /dsh/partner/me/finance/payout-requests", s.handlePartnerCreatePayoutRequest)
	mux.HandleFunc("GET /dsh/partner/me/finance/payout-destination", s.handlePartnerPayoutDestinationRead)

	mux.HandleFunc("GET /dsh/captain/me/finance/wallet", s.handleCaptainOwnWallet)
	mux.HandleFunc("GET /dsh/captain/me/finance/ledger-entries", s.handleCaptainOwnLedger)
	mux.HandleFunc("GET /dsh/captain/me/finance/commissions", s.handleCaptainFinanceCommissions)
	mux.HandleFunc("GET /dsh/captain/me/finance/payout-requests", s.handleCaptainPayoutRequests)
	mux.HandleFunc("POST /dsh/captain/me/finance/payout-requests", s.handleCaptainCreatePayoutRequest)
	mux.HandleFunc("GET /dsh/captain/me/finance/payout-destination", s.handleCaptainPayoutDestinationRead)
	mux.HandleFunc("POST /dsh/captain/me/finance/topup-sessions", s.handleCaptainCreateTopUpSession)
	mux.HandleFunc("GET /dsh/captain/me/finance/topup-sessions/{topUpSessionId}", s.handleCaptainReadTopUpSession)
	mux.HandleFunc("POST /dsh/captain/me/finance/topup-sessions/{topUpSessionId}/{operation}", s.handleCaptainMutateTopUpSession)
	mux.HandleFunc("GET /dsh/captain/me/finance/collateral", s.handleCaptainReadCollateral)
	mux.HandleFunc("POST /dsh/captain/me/finance/collateral/allocate", s.handleCaptainAllocateCollateral)
	mux.HandleFunc("POST /dsh/captain/me/finance/collateral/release", s.handleCaptainReleaseCollateral)
	mux.HandleFunc("GET /dsh/field/me/finance/wallet", s.handleFieldOwnWallet)
	mux.HandleFunc("GET /dsh/field/me/finance/ledger-entries", s.handleFieldOwnLedger)
	mux.HandleFunc("GET /dsh/field/me/finance/commissions", s.handleFieldMeCommissions)
	mux.HandleFunc("GET /dsh/field/me/finance/payout-requests", s.handleFieldPayoutRequests)
	mux.HandleFunc("POST /dsh/field/me/finance/payout-requests", s.handleFieldCreatePayoutRequest)
	mux.HandleFunc("GET /dsh/field/me/finance/payout-destination", s.handleFieldPayoutDestinationRead)

	mux.HandleFunc("GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}", s.withPermission("control-panel", FinancePermissionRead, s.handleControlPanelRepresentativeWallet))
	mux.HandleFunc("GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}/ledger-entries", s.withPermission("control-panel", FinancePermissionRead, s.handleControlPanelRepresentativeLedger))
	mux.HandleFunc("POST /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status", s.withPermission("control-panel", FinancePermissionManage, s.handleRefreshFinancePaymentSessionProviderStatus))
	mux.HandleFunc("POST /dsh/control-panel/finance/settlements/from-delivered-orders", s.withPermission("control-panel", FinancePermissionManage, s.handleCreateFinanceSettlementFromDeliveredOrders))
	mux.HandleFunc("GET /dsh/control-panel/finance/settlement-policies/{partnerId}", s.withPermission("control-panel", FinancePermissionRead, s.handleGetFinanceSettlementPolicy))
	mux.HandleFunc("PUT /dsh/control-panel/finance/settlement-policies/{partnerId}", s.withPermission("control-panel", FinancePermissionManage, s.handleUpsertFinanceSettlementPolicy))
	mux.HandleFunc("GET /dsh/control-panel/finance/settlements/{settlementId}/evidence", s.withPermission("control-panel", FinancePermissionRead, s.handleFinanceSettlementEvidence))
	mux.HandleFunc("PUT /dsh/control-panel/finance/commission-policies", s.withPermission("control-panel", FinancePermissionManage, s.handleUpsertFinanceCommissionPolicy))
	mux.HandleFunc("GET /dsh/control-panel/finance/commissions/{commissionId}", s.withPermission("control-panel", FinancePermissionRead, s.handleFinanceCommissionDetail))
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/adjust", s.withPermission("control-panel", FinancePermissionManage, s.handleAdjustFinanceCommission))
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/confirm", s.withPermission("control-panel", FinancePermissionManage, s.handleConfirmFinanceCommission))
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/settle", s.withPermission("control-panel", FinancePermissionManage, s.handleSettleFinanceCommission))
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/reject", s.withPermission("control-panel", FinancePermissionManage, s.handleRejectFinanceCommission))
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/reverse", s.withPermission("control-panel", FinancePermissionManage, s.handleReverseFinanceCommission))
	mux.HandleFunc("GET /dsh/control-panel/finance/payout-requests/{payoutId}/audit", s.withPermission("control-panel", FinancePermissionRead, s.handleFinancePayoutAudit))
}
