package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/orders"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
	"database/sql"
)

type orderCancellationBody struct {
	ReasonCode    string `json:"reasonCode"`
	ReasonNote    string `json:"reasonNote"`
	CommandID     string `json:"commandId"`
	CorrelationID string `json:"correlationId"`
}

func cancellationCorrelation(r *http.Request, body orderCancellationBody) string {
	if strings.TrimSpace(body.CorrelationID) != "" {
		return strings.TrimSpace(body.CorrelationID)
	}
	if strings.TrimSpace(body.CommandID) != "" {
		return strings.TrimSpace(body.CommandID)
	}
	return operationalCorrelationID(r, "")
}

func writeOrderCancellationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, orders.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
	case errors.Is(err, orders.ErrCancellationRequiresReview):
		store.SendError(w, http.StatusConflict, "CANCELLATION_REQUIRES_REVIEW", "order preparation has started; operations review is required")
	case errors.Is(err, orders.ErrConflict):
		store.SendError(w, http.StatusConflict, "ORDER_CANCELLATION_CONFLICT", "order cannot be cancelled from its current state")
	case errors.Is(err, orders.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "order cancellation failed")
	}
}

func decodeCancellationBody(w http.ResponseWriter, r *http.Request) (orderCancellationBody, bool) {
	var body orderCancellationBody
	if !decodeProtectedJSON(w, r, &body) {
		return body, false
	}
	body.ReasonCode = strings.TrimSpace(body.ReasonCode)
	body.ReasonNote = strings.TrimSpace(body.ReasonNote)
	body.CommandID = strings.TrimSpace(body.CommandID)
	if body.ReasonCode == "" || body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reasonCode and commandId are required")
		return body, false
	}
	return body, true
}

func (s *protectedStoreServer) handleClientCancelOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if _, err := orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID); err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	body, ok := decodeCancellationBody(w, r)
	if !ok {
		return
	}
	order, err := orders.CancelOrder(s.db, orders.CancellationInput{
		OrderID:       orderID,
		TenantID:      actor.TenantID,
		ActorID:       actor.ID,
		ActorRole:     "client",
		ReasonCode:    body.ReasonCode,
		ReasonNote:    body.ReasonNote,
		CorrelationID: cancellationCorrelation(r, body),
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	cancellation, err := orders.GetCancellation(s.db, orderID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cancellation projection unavailable")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order), "cancellation": cancellation})
}

func (s *protectedStoreServer) handlePartnerCancelOrder(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	body, ok := decodeCancellationBody(w, r)
	if !ok {
		return
	}
	order, err := orders.CancelOrder(s.db, orders.CancellationInput{
		OrderID:       ownedOrder.ID,
		TenantID:      actor.TenantID,
		ActorID:       actor.ID,
		ActorRole:     "partner",
		ReasonCode:    body.ReasonCode,
		ReasonNote:    body.ReasonNote,
		CorrelationID: cancellationCorrelation(r, body),
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	cancellation, err := orders.GetCancellation(s.db, ownedOrder.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cancellation projection unavailable")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order), "cancellation": cancellation})
}

func (s *protectedStoreServer) handleOperatorCancelOrderGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	body, ok := decodeCancellationBody(w, r)
	if !ok {
		return
	}
	order, err := orders.CancelOrder(s.db, orders.CancellationInput{
		OrderID:       r.PathValue("orderId"),
		TenantID:      actor.TenantID,
		ActorID:       actor.ID,
		ActorRole:     "operator",
		ReasonCode:    body.ReasonCode,
		ReasonNote:    body.ReasonNote,
		CorrelationID: cancellationCorrelation(r, body),
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	cancellation, err := orders.GetCancellation(s.db, order.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cancellation projection unavailable")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order), "cancellation": cancellation})
}

func (s *protectedStoreServer) handleClientOrderCancellation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if _, err := orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID); err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	cancellation, err := orders.GetCancellation(s.db, orderID)
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cancellation": cancellation})
}

func (s *protectedStoreServer) handlePartnerOrderCancellation(w http.ResponseWriter, r *http.Request) {
	_, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	cancellation, err := orders.GetCancellation(s.db, ownedOrder.ID)
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cancellation": cancellation})
}

func (s *protectedStoreServer) handleOperatorOrderCancellation(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	cancellation, err := orders.GetCancellation(s.db, r.PathValue("orderId"))
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cancellation": cancellation})
}

func RegisterOrderCancellationRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/client/orders/{orderId}/cancel", protected.handleClientCancelOrder)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/cancellation", protected.handleClientOrderCancellation)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/cancel", protected.handlePartnerCancelOrder)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/cancellation", protected.handlePartnerOrderCancellation)
	mux.HandleFunc("POST /dsh/operator/orders/{orderId}/cancellation", protected.handleOperatorCancelOrderGoverned)
	mux.HandleFunc("GET /dsh/operator/orders/{orderId}/cancellation", protected.handleOperatorOrderCancellation)
}
