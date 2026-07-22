package http

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

type jrn037PayoutRequestBody struct {
	PayoutDestinationID string `json:"payoutDestinationId"`
	AmountMinorUnits     int64  `json:"amountMinorUnits"`
	Currency             string `json:"currency"`
	IdempotencyKey       string `json:"idempotencyKey"`
}

func correlationForActorMutation(r *http.Request, fallback string) string {
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" { correlationID = strings.TrimSpace(fallback) }
	return correlationID
}

func (s *protectedStoreServer) handleJRN037ActorPayoutDestinationRead(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok { return }
	status, body, err := s.wlt.FinanceReadPayoutDestination(r.Context(), actorType, actor.ID, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleJRN037ActorPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok { return }
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

func (s *protectedStoreServer) handleJRN037ActorPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok { return }
	correlationID := correlationForActorMutation(r, "payout-destination-deactivate-"+actorType+"-"+actor.ID)
	status, body, err := s.wlt.FinanceDeactivatePayoutDestination(r.Context(), actorType, actor.ID, correlationID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleJRN037ActorPayoutList(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok { return }
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {actorType}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/payout-requests", query, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleJRN037ActorPayoutCreate(w http.ResponseWriter, r *http.Request, actorType string) {
	actor, ok := s.requireActor(w, r, actorType)
	if !ok { return }
	var input jrn037PayoutRequestBody
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
		"beneficiaryActorId": actor.ID,
		"beneficiaryActorType": actorType,
		"payoutDestinationId": input.PayoutDestinationID,
		"amountMinorUnits": input.AmountMinorUnits,
		"currency": input.Currency,
		"idempotencyKey": input.IdempotencyKey,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to encode payout request")
		return
	}
	correlationID := correlationForActorMutation(r, input.IdempotencyKey)
	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests", payload, correlationID)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handlePartnerPayoutDestinationRead(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationRead(w, r, "partner") }
func (s *protectedStoreServer) handlePartnerPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationUpsert(w, r, "partner") }
func (s *protectedStoreServer) handlePartnerPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationDeactivate(w, r, "partner") }
func (s *protectedStoreServer) handlePartnerPayoutRequests(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutList(w, r, "partner") }
func (s *protectedStoreServer) handlePartnerCreatePayoutRequest(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutCreate(w, r, "partner") }

func (s *protectedStoreServer) handleCaptainPayoutDestinationRead(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationRead(w, r, "captain") }
func (s *protectedStoreServer) handleCaptainPayoutDestinationUpsert(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationUpsert(w, r, "captain") }
func (s *protectedStoreServer) handleCaptainPayoutDestinationDeactivate(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationDeactivate(w, r, "captain") }
func (s *protectedStoreServer) handleCaptainPayoutRequestsJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutList(w, r, "captain") }
func (s *protectedStoreServer) handleCaptainCreatePayoutRequestJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutCreate(w, r, "captain") }

func (s *protectedStoreServer) handleFieldPayoutDestinationReadJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationRead(w, r, "field") }
func (s *protectedStoreServer) handleFieldPayoutDestinationUpsertJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationUpsert(w, r, "field") }
func (s *protectedStoreServer) handleFieldPayoutDestinationDeactivateJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutDestinationDeactivate(w, r, "field") }
func (s *protectedStoreServer) handleFieldPayoutRequestsJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutList(w, r, "field") }
func (s *protectedStoreServer) handleFieldCreatePayoutRequestJRN037(w http.ResponseWriter, r *http.Request) { s.handleJRN037ActorPayoutCreate(w, r, "field") }

func (s *protectedStoreServer) handleReconcileFinancePayoutRequestJRN037(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok { return }
	payoutID := strings.TrimSpace(r.PathValue("payoutId"))
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, responseBody, err := s.wlt.FinanceWrite(
		r.Context(),
		http.MethodPost,
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/reconcile",
		operatorWriteBody(actor.ID),
		correlationForActorMutation(r, "payout-reconcile-"+payoutID),
	)
	writeWltActorFinanceResponse(w, status, responseBody, err)
}

func (s *protectedStoreServer) handleFinancePayoutAuditJRN037(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok { return }
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/payout-requests/"+url.PathEscape(r.PathValue("payoutId"))+"/audit", nil, r.Header.Get("X-Correlation-ID"))
	writeWltActorFinanceResponse(w, status, body, err)
}
