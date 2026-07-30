package http

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

type payoutRequestBody struct {
	PayoutDestinationID string `json:"payoutDestinationId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Currency             string `json:"currency"`
	IdempotencyKey       string `json:"idempotencyKey"`
}

func correlationForActorMutation(r *http.Request, fallback string) string {
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = strings.TrimSpace(fallback)
	}
	return correlationID
}

func (s *protectedStoreServer) handleActorPayoutDestinationRead(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	status, body, err := s.wlt.FinanceReadPayoutDestination(r.Context(), actorType, actor.ID, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleActorPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 128*1024))
	if err != nil || len(body) == 0 || !json.Valid(body) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
		return
	}
	var object map[string]any
	if err := json.Unmarshal(body, &object); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
		return
	}
	delete(object, "ownerActorId")
	delete(object, "ownerActorType")
	delete(object, "partnerId")
	delete(object, "actorId")
	delete(object, "actorType")
	object["operatorId"] = actor.ID
	body, err = json.Marshal(object)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout destination")
		return
	}
	correlationID := correlationForActorMutation(r, "payout-destination-"+actorType+"-"+actor.ID)
	status, responseBody, err := s.wlt.FinanceUpsertPayoutDestination(r.Context(), actorType, actor.ID, body, correlationID)
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleActorPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	correlationID := correlationForActorMutation(r, "payout-destination-deactivate-"+actorType+"-"+actor.ID)
	status, body, err := s.wlt.FinanceDeactivatePayoutDestination(r.Context(), actorType, actor.ID, correlationID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleActorPayoutList(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {actorType}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/payout-requests", query, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleActorPayoutCreate(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
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
	input.PayoutDestinationID = strings.TrimSpace(input.PayoutDestinationID)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	if input.PayoutDestinationID == "" || input.AmountMinorUnits <= 0 || input.Currency == "" || input.IdempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutDestinationId, positive amountMinorUnits, currency and idempotencyKey are required")
		return
	}
	payload, err := json.Marshal(map[string]any{
		"beneficiaryActorId":   actor.ID,
		"beneficiaryActorType": actorType,
		"payoutDestinationId":  input.PayoutDestinationID,
		"amountMinorUnits":      input.AmountMinorUnits,
		"currency":              input.Currency,
		"idempotencyKey":        input.IdempotencyKey,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout request")
		return
	}
	correlationID := correlationForActorMutation(r, input.IdempotencyKey)
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests", payload, correlationID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handlePartnerPayoutDestinationRead(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationRead(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationUpsert(w, r, "partner")
}
func (s *protectedStoreServer) handlePartnerPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationDeactivate(w, r, "partner")
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
func (s *protectedStoreServer) handleCaptainPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationUpsert(w, r, "captain")
}
func (s *protectedStoreServer) handleCaptainPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationDeactivate(w, r, "captain")
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
func (s *protectedStoreServer) handleFieldPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationUpsert(w, r, "field")
}
func (s *protectedStoreServer) handleFieldPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutDestinationDeactivate(w, r, "field")
}
func (s *protectedStoreServer) handleFieldPayoutRequests(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutList(w, r, "field")
}
func (s *protectedStoreServer) handleFieldCreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.handleActorPayoutCreate(w, r, "field")
}

func (s *protectedStoreServer) handleReconcileFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
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
	status, responseBody, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/reconcile",
		operatorWriteBody(actor.ID),
		correlationForActorMutation(r, "payout-reconcile-"+payoutID),
		operatorContextID,
	)
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleFinancePayoutAudit(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator")
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
	status, body, err := s.wlt.FinanceReadWithOperatorContext(
		r.Context(),
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/audit",
		nil,
		r.Header.Get("X-Correlation-ID"),
		operatorContextID,
	)
	writeWltActorFinanceResponse(w, status, body, err)
}
