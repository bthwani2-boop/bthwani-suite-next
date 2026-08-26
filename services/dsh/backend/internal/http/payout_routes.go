package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

const (
	payoutAmountModeFullAvailable = "FULL_AVAILABLE"
	payoutAmountModeSpecified     = "SPECIFIED"
)

type payoutRequestBody struct {
	AmountMode       string `json:"amountMode"`
	AmountMinorUnits *int64 `json:"amountMinorUnits,omitempty"`
	Currency         string `json:"currency"`
	IdempotencyKey   string `json:"idempotencyKey"`
}

type payoutDestinationProjectionEnvelope struct {
	PayoutDestination struct {
		ID                            string `json:"id"`
		OwnerActorID                  string `json:"ownerActorId"`
		OwnerActorType                string `json:"ownerActorType"`
		OfficialWalletProviderKey     string `json:"officialWalletProviderKey"`
		DestinationVersion            int    `json:"destinationVersion"`
		DestinationMethod             string `json:"destinationMethod"`
		MaskedDestinationReference    string `json:"maskedDestinationReference"`
		DestinationVerificationStatus string `json:"destinationVerificationStatus"`
	} `json:"payoutDestination"`
}

func correlationForActorMutation(r *http.Request, fallback string) string {
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = strings.TrimSpace(fallback)
	}
	return correlationID
}

func decodePayoutDestinationProjection(body []byte, actorType, actorID string) (partner.PayoutDestinationProjection, error) {
	var envelope payoutDestinationProjectionEnvelope
	if len(body) == 0 || json.Unmarshal(body, &envelope) != nil {
		return partner.PayoutDestinationProjection{}, fmt.Errorf("WLT payout destination response is not valid JSON")
	}
	item := envelope.PayoutDestination
	if strings.TrimSpace(item.ID) == "" ||
		strings.TrimSpace(item.OwnerActorID) != strings.TrimSpace(actorID) ||
		strings.TrimSpace(item.OwnerActorType) != strings.TrimSpace(actorType) ||
		strings.TrimSpace(item.OfficialWalletProviderKey) == "" ||
		item.DestinationVersion < 1 ||
		strings.TrimSpace(item.DestinationMethod) != "official_wallet" {
		return partner.PayoutDestinationProjection{}, fmt.Errorf("WLT payout destination response violates the official-wallet contract")
	}
	return partner.PayoutDestinationProjection{
		ID:                            item.ID,
		DestinationMethod:             item.DestinationMethod,
		MaskedDestinationReference:    item.MaskedDestinationReference,
		DestinationVerificationStatus: item.DestinationVerificationStatus,
	}, nil
}

func (s *protectedStoreServer) syncPartnerPayoutProjection(r *http.Request, actor store.StoreActor, body []byte) error {
	projection, err := decodePayoutDestinationProjection(body, "partner", actor.ID)
	if err != nil {
		return err
	}
	return partner.SyncOwnerPayoutDestinationProjection(
		r.Context(),
		s.db,
		actor.OperatorContextID,
		actor.ID,
		projection,
	)
}

func (s *protectedStoreServer) clearPartnerPayoutProjection(r *http.Request, actor store.StoreActor) error {
	return partner.ClearOwnerPayoutDestinationProjection(
		r.Context(),
		s.db,
		actor.OperatorContextID,
		actor.ID,
	)
}

func writePayoutProjectionSyncError(w http.ResponseWriter) {
	store.SendError(w, http.StatusBadGateway, "PAYOUT_PROJECTION_SYNC_FAILED", "WLT payout state changed but the DSH partner readiness projection did not converge; retry the read")
}

// Beneficiary surfaces are read-only with respect to payout master data.
// The actor can inspect only their masked WLT-owned official-wallet destination;
// creation, replacement, verification and deactivation are finance-control-plane
// operations and are deliberately absent from this boundary.
func (s *protectedStoreServer) handleActorPayoutDestinationRead(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceReadPayoutDestinationWithOperatorContext(r.Context(), actorType, actor.ID, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		writeWltActorFinanceResponse(w, status, body, err)
		return
	}
	if actorType == "partner" {
		switch status {
		case http.StatusOK:
			if err := s.syncPartnerPayoutProjection(r, actor, body); err != nil {
				writePayoutProjectionSyncError(w)
				return
			}
		case http.StatusNotFound:
			if err := s.clearPartnerPayoutProjection(r, actor); err != nil {
				writePayoutProjectionSyncError(w)
				return
			}
		}
	}
	writeWltActorFinanceResponse(w, status, body, nil)
}

func (s *protectedStoreServer) handleActorPayoutList(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {actorType}}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.payout_requests.read", nil, query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeWltActorFinanceResponse(w, status, body, err)
}

// handleActorPayoutCreate deliberately accepts no payout destination identifier.
// DSH derives beneficiary identity from the authenticated session and WLT resolves
// the current verified official-wallet destination and eligible balance atomically.
func (s *protectedStoreServer) handleActorPayoutCreate(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	idempotencyKey, ok := requireFinanceMutationIdempotency(w, r)
	if !ok {
		return
	}
	var input payoutRequestBody
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout request body is invalid")
		return
	}
	input.AmountMode = strings.ToUpper(strings.TrimSpace(input.AmountMode))
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.AmountMode != payoutAmountModeFullAvailable && input.AmountMode != payoutAmountModeSpecified {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "amountMode must be FULL_AVAILABLE or SPECIFIED")
		return
	}
	if input.AmountMode == payoutAmountModeFullAvailable && input.AmountMinorUnits != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "FULL_AVAILABLE must not include amountMinorUnits")
		return
	}
	if input.AmountMode == payoutAmountModeSpecified && (input.AmountMinorUnits == nil || *input.AmountMinorUnits <= 0) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "SPECIFIED requires positive amountMinorUnits")
		return
	}
	if len(input.Currency) != 3 || input.IdempotencyKey != idempotencyKey {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "three-letter currency and Idempotency-Key of at least 8 characters are required")
		return
	}

	payloadObject := map[string]any{
		"beneficiaryActorId":   actor.ID,
		"beneficiaryActorType": actorType,
		"amountMode":           input.AmountMode,
		"currency":             input.Currency,
		"idempotencyKey":       input.IdempotencyKey,
	}
	if input.AmountMode == payoutAmountModeSpecified {
		payloadObject["amountMinorUnits"] = *input.AmountMinorUnits
	}
	payload, err := json.Marshal(payloadObject)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout request")
		return
	}
	correlationID := correlationForActorMutation(r, input.IdempotencyKey)
	status, body, err := s.wlt.ExecuteFinanceWrite(r.Context(), "finance.payout_requests.create", nil, payload, correlationID, idempotencyKey, actor.OperatorContextID, actor.ID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handlePartnerPayoutDestinationRead(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationRead(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerPayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutList(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerCreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutCreate(w, r, "partner")
}

func (s *protectedStoreServer) handleCaptainPayoutDestinationRead(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationRead(w, r, "captain")
}
func (s *protectedStoreServer) handleCaptainPayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutList(w, r, "captain")
}
func (s *protectedStoreServer) handleCaptainCreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutCreate(w, r, "captain")
}

func (s *protectedStoreServer) handleFieldPayoutDestinationRead(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationRead(w, r, "field")
}
func (s *protectedStoreServer) handleFieldPayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutList(w, r, "field")
}
func (s *protectedStoreServer) handleFieldCreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutCreate(w, r, "field")
}

func (s *protectedStoreServer) handleFinancePayoutAudit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	payoutID := strings.TrimSpace(r.PathValue("payoutId"))
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.ExecuteFinanceRead(r.Context(), "finance.payout_requests.audit.read", map[string]string{"payoutId": payoutID}, nil, r.Header.Get("X-Correlation-ID"), operatorContextID)
	writeWltActorFinanceResponse(w, status, body, err)
}
