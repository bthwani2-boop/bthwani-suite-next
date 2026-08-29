package http

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

func marshalSpecialRequestInformationExchange(exchange *specialrequests.InformationExchange) map[string]any {
	return map[string]any{
		"id":                       exchange.ID,
		"specialRequestId":         exchange.SpecialRequestID,
		"clientId":                 exchange.ClientID,
		"requestedByOperatorId":    exchange.RequestedByOperatorID,
		"question":                 exchange.Question,
		"response":                 exchange.Response,
		"status":                   exchange.Status,
		"requestVersionAtRequest":  exchange.RequestVersionAtRequest,
		"requestVersionAtResponse": exchange.RequestVersionAtResponse,
		"requestedAt":              exchange.RequestedAt,
		"respondedAt":              exchange.RespondedAt,
		"updatedAt":                exchange.UpdatedAt,
	}
}

func writeLatestInformationExchange(w http.ResponseWriter, exchange *specialrequests.InformationExchange, err error) {
	if errors.Is(err, specialrequests.ErrNotFound) {
		store.SendJSON(w, http.StatusOK, map[string]any{"informationExchange": nil})
		return
	}
	if err != nil {
		writeSpecialRequestError(w, err, "special request information exchange not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"informationExchange": marshalSpecialRequestInformationExchange(exchange)})
}

// GET /dsh/client/special-requests/{requestId}/information-exchange
func (s *protectedStoreServer) handleGetClientSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForClientInOperatorContext(r.Context(), actor.OperatorContextID, requestID, actor.ID); err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	exchange, err := svc.LatestInformationExchangeInOperatorContext(r.Context(), actor.OperatorContextID, requestID)
	writeLatestInformationExchange(w, exchange, err)
}

// GET /dsh/operator/special-requests/{requestId}/information-exchange
func (s *protectedStoreServer) handleGetOperatorSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForOperatorInOperatorContext(r.Context(), actor.OperatorContextID, requestID); err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	exchange, err := svc.LatestInformationExchangeInOperatorContext(r.Context(), actor.OperatorContextID, requestID)
	writeLatestInformationExchange(w, exchange, err)
}

type requestSpecialRequestInformationBody struct {
	ExpectedVersion *int   `json:"expectedVersion"`
	Question        string `json:"question"`
}

// POST /dsh/operator/special-requests/{requestId}/information-request
func (s *protectedStoreServer) handleRequestSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	var body requestSpecialRequestInformationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.ExpectedVersion == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: expectedVersion is required", specialrequests.ErrInvalid), "special request not found")
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	request, exchange, err := svc.RequestClientInformationInOperatorContext(
		r.Context(), actor.OperatorContextID, requestID, actor.ID, *body.ExpectedVersion, body.Question,
	)
	if err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"request":             marshalSpecialRequest(request),
		"informationExchange": marshalSpecialRequestInformationExchange(exchange),
	})
}

type respondSpecialRequestInformationBody struct {
	ExpectedVersion *int   `json:"expectedVersion"`
	ExchangeID      string `json:"exchangeId"`
	Response        string `json:"response"`
}

// POST /dsh/client/special-requests/{requestId}/information-response
func (s *protectedStoreServer) handleRespondSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	mutation, ok := specialRequestInformationMutationContext(w, r)
	if !ok {
		return
	}
	var body respondSpecialRequestInformationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.ExpectedVersion == nil {
		writeSpecialRequestError(w, fmt.Errorf("%w: expectedVersion is required", specialrequests.ErrInvalid), "special request not found")
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	request, exchange, err := svc.RespondClientInformationInOperatorContext(
		r.Context(), actor.OperatorContextID, requestID, actor.ID, body.ExchangeID, *body.ExpectedVersion, body.Response, mutation,
	)
	if err != nil {
		if errors.Is(err, specialrequests.ErrInformationResponseIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different information response")
			return
		}
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"request":             marshalSpecialRequest(request),
		"informationExchange": marshalSpecialRequestInformationExchange(exchange),
	})
}

func specialRequestInformationMutationContext(w http.ResponseWriter, r *http.Request) (specialrequests.InformationResponseMutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return specialrequests.InformationResponseMutationContext{}, false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(correlationID) < 8 || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain between 8 and 200 characters")
		return specialrequests.InformationResponseMutationContext{}, false
	}
	return specialrequests.InformationResponseMutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	}, true
}
