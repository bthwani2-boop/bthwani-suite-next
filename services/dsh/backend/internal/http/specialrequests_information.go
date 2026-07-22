package http

import (
	"errors"
	"fmt"
	"net/http"

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
	if _, err := svc.GetForClientInTenant(r.Context(), actor.TenantID, requestID, actor.ID); err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	exchange, err := svc.LatestInformationExchangeInTenant(r.Context(), actor.TenantID, requestID)
	writeLatestInformationExchange(w, exchange, err)
}

// GET /dsh/operator/special-requests/{requestId}/information-exchange
func (s *protectedStoreServer) handleGetOperatorSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsSpecialRequestsPermissionRead, "operator")
	if !ok {
		return
	}
	requestID := r.PathValue("requestId")
	svc := specialrequests.NewService(specialrequests.NewPostgresRepository(s.db))
	if _, err := svc.GetForOperatorInTenant(r.Context(), actor.TenantID, requestID); err != nil {
		writeSpecialRequestError(w, err, "special request not found")
		return
	}
	exchange, err := svc.LatestInformationExchangeInTenant(r.Context(), actor.TenantID, requestID)
	writeLatestInformationExchange(w, exchange, err)
}

type requestSpecialRequestInformationBody struct {
	ExpectedVersion *int   `json:"expectedVersion"`
	Question        string `json:"question"`
}

// POST /dsh/operator/special-requests/{requestId}/information-request
func (s *protectedStoreServer) handleRequestSpecialRequestInformation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsSpecialRequestsPermissionTransition, "operator")
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
	request, exchange, err := svc.RequestClientInformationInTenant(
		r.Context(), actor.TenantID, requestID, actor.ID, *body.ExpectedVersion, body.Question,
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
	request, exchange, err := svc.RespondClientInformationInTenant(
		r.Context(), actor.TenantID, requestID, actor.ID, body.ExchangeID, *body.ExpectedVersion, body.Response,
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
