package http

import (
	"errors"
	"net/http"
	"strings"

	"database/sql"
	"dsh-api/internal/auth"
	"dsh-api/internal/incident"
	"dsh-api/internal/media"
	"dsh-api/internal/orders"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

type orderCancellationBody struct {
	Reason          string `json:"reason"`
	ReasonCode      string `json:"reasonCode"`
	ReasonNote      string `json:"reasonNote"`
	CommandID       string `json:"commandId"`
	CorrelationID   string `json:"correlationId"`
	TicketReference string `json:"ticketReference"`
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
	case errors.Is(err, incident.ErrInvalid):
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
	body.Reason = strings.TrimSpace(body.Reason)
	body.ReasonCode = strings.TrimSpace(body.ReasonCode)
	body.ReasonNote = strings.TrimSpace(body.ReasonNote)
	body.CommandID = strings.TrimSpace(body.CommandID)
	body.CorrelationID = strings.TrimSpace(body.CorrelationID)

	// `/cancel` is retained as an explicit compatibility alias. Normalize its
	// historical `{reason}` body into the canonical cancellation command instead
	// of invoking the former parallel cancellation implementation. `other` is
	// valid for every human cancellation role and requires the preserved note.
	if body.ReasonCode == "" && body.Reason != "" {
		body.ReasonCode = "other"
		if body.ReasonNote == "" {
			body.ReasonNote = body.Reason
		}
	}
	if body.CommandID == "" {
		body.CommandID = operationalCorrelationID(r, body.CorrelationID)
	}
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
	if _, err := orders.GetClientOrder(s.db, orderID, actor.OperatorContextID, actor.ID); err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	body, ok := decodeCancellationBody(w, r)
	if !ok {
		return
	}
	_, err := orders.CancelOrderSync(s.db, orders.CreateCancellationCaseInput{
		OrderID:       orderID,
		OperatorContextID:      actor.OperatorContextID,
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
	
	order, _ := orders.GetOrder(s.db, orderID)
	cancellation, _ := orders.GetCancellation(s.db, orderID)
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
	_, err := orders.CancelOrderSync(s.db, orders.CreateCancellationCaseInput{
		OrderID:       ownedOrder.ID,
		OperatorContextID:      actor.OperatorContextID,
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
	
	order, _ := orders.GetOrder(s.db, ownedOrder.ID)
	cancellation, _ := orders.GetCancellation(s.db, ownedOrder.ID)
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order), "cancellation": cancellation})
}

// handleOperatorCancelOrderGoverned is the sovereign order-cancellation
// entry point: it requires IncidentPermissionOverride and records an
// operational_incident before applying the cancellation, so an operator
// override always carries a reason and ticket reference in a durable,
// queryable record.
func (s *protectedStoreServer) handleOperatorCancelOrderGoverned(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	body, ok := decodeCancellationBody(w, r)
	if !ok {
		return
	}
	body.TicketReference = strings.TrimSpace(body.TicketReference)
	if body.TicketReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "ticketReference is required for a sovereign cancellation")
		return
	}
	reason := body.ReasonNote
	if strings.TrimSpace(reason) == "" {
		reason = body.ReasonCode
	}
	reported, err := incident.NewService(s.db).Report(r.Context(), incident.ReportInput{
		OrderID:          orderID,
		OperatorContextID:         actor.OperatorContextID,
		TargetEntityType: incident.TargetOrder,
		TargetEntityID:   orderID,
		IncidentType:     incident.TypeCancel,
		Reason:           reason,
		TicketReference:  body.TicketReference,
		ActorID:          actor.ID,
		ActorRole:        "operator",
		CorrelationID:    cancellationCorrelation(r, body),
		ReasonCode:       body.ReasonCode,
		ReasonNote:       body.ReasonNote,
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	_, err = orders.CancelOrderSync(s.db, orders.CreateCancellationCaseInput{
		OrderID:       orderID,
		OperatorContextID:      actor.OperatorContextID,
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
	
	order, _ := orders.GetOrder(s.db, orderID)
	cancellation, _ := orders.GetCancellation(s.db, orderID)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"order":        marshalOrder(order),
		"cancellation": cancellation,
		"incidentId":   reported.ID,
	})
}

func (s *protectedStoreServer) handleClientOrderCancellation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if _, err := orders.GetClientOrder(s.db, orderID, actor.OperatorContextID, actor.ID); err != nil {
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
	_, ok := s.ActorFromContext(r.Context())
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

func (s *protectedStoreServer) handleCreateOrderCancellationAction(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		ActionType string `json:"actionType"`
		Payload    string `json:"payload"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	orderID := r.PathValue("orderId")
	caseItem, err := orders.GetCancellation(s.db, orderID)
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	item, err := orders.CreateCancellationAction(s.db, orders.CreateCancellationActionInput{
		ActorID:        actor.ID,
		CaseID:         caseItem.ID,
		ActionType:     orders.CancellationActionType(body.ActionType),
		Payload:        body.Payload,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"action": item})
}

func (s *protectedStoreServer) handleExecuteOrderCancellationAction(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	_, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	item, err := orders.ExecuteCancellationAction(s.db, orders.ExecuteCancellationActionInput{
		ActorID:       actor.ID,
		ActionID:      r.PathValue("actionId"),
		CorrelationID: correlationID,
	})
	if err != nil {
		writeOrderCancellationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"action": item})
}

func RegisterOrderCancellationRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	mux.HandleFunc("POST /dsh/client/orders/{orderId}/cancel", protected.handleClientCancelOrder)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/cancellation", protected.handleClientOrderCancellation)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/cancel", protected.handlePartnerCancelOrder)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/cancellation", protected.handlePartnerOrderCancellation)
	mux.HandleFunc("POST /dsh/operator/orders/{orderId}/cancellation", protected.withPermission("control-panel", OperationsPermissionManage, protected.handleOperatorCancelOrderGoverned))
	mux.HandleFunc("GET /dsh/operator/orders/{orderId}/cancellation", protected.withPermission("control-panel", OperationsPermissionRead, protected.handleOperatorOrderCancellation))
	
	mux.HandleFunc("POST /dsh/operator/orders/{orderId}/cancellation/actions", protected.withPermission("control-panel", OperationsPermissionManage, protected.handleCreateOrderCancellationAction))
	mux.HandleFunc("POST /dsh/operator/orders/{orderId}/cancellation/actions/{actionId}/execute", protected.withPermission("control-panel", OperationsPermissionManage, protected.handleExecuteOrderCancellationAction))
}
