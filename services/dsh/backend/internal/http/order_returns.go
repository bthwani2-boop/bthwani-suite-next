package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

type orderReturnBody struct {
	ReasonCode      string                   `json:"reasonCode"`
	ReasonNote      string                   `json:"reasonNote"`
	CommandID       string                   `json:"commandId"`
	CorrelationID   string                   `json:"correlationId"`
	TicketReference string                   `json:"ticketReference"`
	Items           []orders.ReturnItemInput `json:"items"`
}

func writeOrderReturnError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, orders.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order or return not found")
	case errors.Is(err, orders.ErrConflict):
		store.SendError(w, http.StatusConflict, "ORDER_RETURN_CONFLICT", err.Error())
	case errors.Is(err, orders.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "order return failed")
	}
}

func decodeReturnBody(w http.ResponseWriter, r *http.Request) (orderReturnBody, bool) {
	var body orderReturnBody
	if !decodeProtectedJSON(w, r, &body) {
		return body, false
	}
	body.ReasonCode = strings.TrimSpace(body.ReasonCode)
	body.ReasonNote = strings.TrimSpace(body.ReasonNote)
	body.CommandID = strings.TrimSpace(body.CommandID)
	body.CorrelationID = strings.TrimSpace(body.CorrelationID)

	if body.CommandID == "" {
		body.CommandID = operationalCorrelationID(r, body.CorrelationID)
	}
	if body.ReasonCode == "" || body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reasonCode and commandId are required")
		return body, false
	}
	return body, true
}

func (s *protectedStoreServer) handleClientReturnOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if _, err := orders.GetClientOrder(s.db, orderID, actor.OperatorContextID, actor.ID); err != nil {
		writeOrderReturnError(w, err)
		return
	}
	body, ok := decodeReturnBody(w, r)
	if !ok {
		return
	}

	correlationID := body.CorrelationID
	if correlationID == "" {
		correlationID = body.CommandID
	}

	ret, err := orders.CreateReturnCase(s.db, orders.CreateReturnCaseInput{
		OrderID:           orderID,
		OperatorContextID: actor.OperatorContextID,
		ActorID:           actor.ID,
		ActorRole:         "client",
		ReasonCode:        body.ReasonCode,
		ReasonNote:        body.ReasonNote,
		CorrelationID:     correlationID,
		Items:             body.Items,
	})
	if err != nil {
		writeOrderReturnError(w, err)
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{"returnCase": ret})
}

func (s *protectedStoreServer) handleClientGetReturnOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if _, err := orders.GetClientOrder(s.db, orderID, actor.OperatorContextID, actor.ID); err != nil {
		writeOrderReturnError(w, err)
		return
	}

	ret, err := orders.GetReturnForOperatorContext(s.db, actor.OperatorContextID, orderID)
	if err != nil {
		writeOrderReturnError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"returnCase": ret})
}

func (s *protectedStoreServer) handleOperatorReturnOrderGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	body, ok := decodeReturnBody(w, r)
	if !ok {
		return
	}

	correlationID := body.CorrelationID
	if correlationID == "" {
		correlationID = body.CommandID
	}

	ret, err := orders.CreateReturnCase(s.db, orders.CreateReturnCaseInput{
		OrderID:           orderID,
		OperatorContextID: actor.OperatorContextID,
		ActorID:           actor.ID,
		ActorRole:         "operator",
		ReasonCode:        body.ReasonCode,
		ReasonNote:        body.ReasonNote,
		TicketReference:   body.TicketReference,
		CorrelationID:     correlationID,
		Items:             body.Items,
	})
	if err != nil {
		writeOrderReturnError(w, err)
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{"returnCase": ret})
}
