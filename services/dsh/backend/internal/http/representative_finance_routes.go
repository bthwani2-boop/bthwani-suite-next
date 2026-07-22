package http

import (
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
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
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT representative finance read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleOwnRepresentativeWallet(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceReadWallet(
		r.Context(),
		actorType,
		actor.ID,
		r.Header.Get("X-Correlation-ID"),
	)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativeLedger(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{
		"actorId":   {actor.ID},
		"actorType": {actorType},
	}
	for _, key := range []string{"entryType", "limit", "cursor"} {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			query.Set(key, value)
		}
	}
	status, body, err := s.wlt.FinanceRead(
		r.Context(),
		"/wlt/ledger/entries",
		query,
		r.Header.Get("X-Correlation-ID"),
	)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativeCommissions(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{
		"beneficiaryActorId":   {actor.ID},
		"beneficiaryActorType": {actorType},
	}
	status, body, err := s.wlt.FinanceRead(
		r.Context(),
		"/wlt/commissions",
		query,
		r.Header.Get("X-Correlation-ID"),
	)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleOwnRepresentativePayoutRequests(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{
		"beneficiaryActorId":   {actor.ID},
		"beneficiaryActorType": {actorType},
	}
	status, body, err := s.wlt.FinanceRead(
		r.Context(),
		"/wlt/payout-requests",
		query,
		r.Header.Get("X-Correlation-ID"),
	)
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

func (s *protectedStoreServer) handlePartnerOwnPayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleOwnRepresentativePayoutRequests(w, r, "partner")
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
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	actorType, actorID, ok := resolveControlPanelRepresentativeActor(w, r)
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceReadWallet(
		r.Context(),
		actorType,
		actorID,
		r.Header.Get("X-Correlation-ID"),
	)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleControlPanelRepresentativeLedger(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	actorType, actorID, ok := resolveControlPanelRepresentativeActor(w, r)
	if !ok {
		return
	}
	query := url.Values{
		"actorId":   {actorID},
		"actorType": {actorType},
	}
	for _, key := range []string{"entryType", "limit", "cursor"} {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			query.Set(key, value)
		}
	}
	status, body, err := s.wlt.FinanceRead(
		r.Context(),
		"/wlt/ledger/entries",
		query,
		r.Header.Get("X-Correlation-ID"),
	)
	writeRepresentativeFinanceResponse(w, status, body, err)
}

// registerRepresentativeFinanceRoutes is composed from the final protected
// route extension point in NewRouter. Self-service routes never accept an
// actor id; they resolve identity through requireActor before WLT is called.
func registerRepresentativeFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/client/me/finance/wallet", s.handleClientOwnWallet)
	mux.HandleFunc("GET /dsh/client/me/finance/ledger-entries", s.handleClientOwnLedger)

	mux.HandleFunc("GET /dsh/partner/me/finance/wallet", s.handlePartnerOwnWallet)
	mux.HandleFunc("GET /dsh/partner/me/finance/ledger-entries", s.handlePartnerOwnLedger)
	mux.HandleFunc("GET /dsh/partner/me/finance/commissions", s.handlePartnerOwnCommissions)
	mux.HandleFunc("GET /dsh/partner/me/finance/payout-requests", s.handlePartnerOwnPayoutRequests)

	mux.HandleFunc("GET /dsh/captain/me/finance/wallet", s.handleCaptainOwnWallet)
	mux.HandleFunc("GET /dsh/captain/me/finance/ledger-entries", s.handleCaptainOwnLedger)
	mux.HandleFunc("GET /dsh/captain/me/finance/commissions", s.handleCaptainFinanceCommissions)
	mux.HandleFunc("GET /dsh/captain/me/finance/payout-requests", s.handleCaptainFinancePayouts)
	mux.HandleFunc("POST /dsh/captain/me/finance/payout-requests", s.handleCaptainCreatePayout)

	mux.HandleFunc("GET /dsh/field/me/finance/wallet", s.handleFieldOwnWallet)
	mux.HandleFunc("GET /dsh/field/me/finance/ledger-entries", s.handleFieldOwnLedger)
	mux.HandleFunc("GET /dsh/field/me/finance/commissions", s.handleFieldMeCommissions)
	mux.HandleFunc("GET /dsh/field/me/finance/payout-requests", s.handleFieldMePayoutRequests)
	mux.HandleFunc("POST /dsh/field/me/finance/payout-requests", s.handleSubmitFieldMePayoutRequest)

	mux.HandleFunc("GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}", s.handleControlPanelRepresentativeWallet)
	mux.HandleFunc("GET /dsh/control-panel/finance/wallets/{actorType}/{actorId}/ledger-entries", s.handleControlPanelRepresentativeLedger)
	mux.HandleFunc("GET /dsh/control-panel/finance/settlements/{settlementId}/evidence", s.handleFinanceSettlementEvidence)
	mux.HandleFunc("PUT /dsh/control-panel/finance/commission-policies", s.handleUpsertFinanceCommissionPolicy)
	mux.HandleFunc("GET /dsh/control-panel/finance/commissions/{commissionId}", s.handleFinanceCommissionDetail)
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/adjust", s.handleAdjustFinanceCommission)
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/confirm", s.handleConfirmFinanceCommission)
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/settle", s.handleSettleFinanceCommission)
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/reject", s.handleRejectFinanceCommission)
	mux.HandleFunc("POST /dsh/control-panel/finance/commissions/{commissionId}/reverse", s.handleReverseFinanceCommission)
}
