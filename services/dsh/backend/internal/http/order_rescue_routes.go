package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/support"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) handleCreateOrderRescueCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		OrderID    string `json:"orderId"`
		TicketID   string `json:"ticketId"`
		Reason     string `json:"reason"`
		Severity   string `json:"severity"`
		Summary    string `json:"summary"`
		AssignedTo string `json:"assignedTo"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := support.CreateOrderRescueCase(s.db, support.CreateOrderRescueInput{
		ActorID:        actor.ID,
		OrderID:        body.OrderID,
		TicketID:       body.TicketID,
		Reason:         support.OrderRescueReason(body.Reason),
		Severity:       support.OrderRescueSeverity(body.Severity),
		Summary:        body.Summary,
		AssignedTo:     body.AssignedTo,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to create order rescue case")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"rescueCase": item})
}

func (s *protectedStoreServer) handleListOrderRescueCases(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	items, err := support.ListOrderRescueCases(s.db, r.URL.Query().Get("status"), 100)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list order rescue cases")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rescueCases": items})
}

func (s *protectedStoreServer) handleGetOrderRescueCase(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	item, err := support.GetOrderRescueCase(s.db, r.PathValue("caseId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load order rescue case")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rescueCase": item})
}

func (s *protectedStoreServer) handleUpdateOrderRescueCase(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpectedStatus string `json:"expectedStatus"`
		Status         string `json:"status"`
		Reason         string `json:"reason"`
		Owner          string `json:"owner"`
		NextAction     string `json:"nextAction"`
		OperatorNote   string `json:"operatorNote"`
		AffectedEntity string `json:"affectedEntity"`
		AssignedTo     string `json:"assignedTo"`
		ResolutionNote string `json:"resolutionNote"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := support.UpdateOrderRescueCase(s.db, support.UpdateOrderRescueInput{
		ActorID:        actor.ID,
		CaseID:         r.PathValue("caseId"),
		ExpectedStatus: support.OrderRescueStatus(body.ExpectedStatus),
		Status:         support.OrderRescueStatus(body.Status),
		Reason:         support.OrderRescueReason(body.Reason),
		Owner:          support.OrderRescueOwner(body.Owner),
		NextAction:     support.OrderRescueNextAction(body.NextAction),
		OperatorNote:   body.OperatorNote,
		AffectedEntity: body.AffectedEntity,
		AssignedTo:     body.AssignedTo,
		ResolutionNote: body.ResolutionNote,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to update order rescue case")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"rescueCase": item})
}

func (s *protectedStoreServer) handleListOrderRescueEvents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	caseID := r.PathValue("caseId")
	if _, err := support.GetOrderRescueCase(s.db, caseID); err != nil {
		sendGovernedSupportError(w, err, "failed to load order rescue case")
		return
	}
	items, err := support.ListOrderRescueEvents(s.db, caseID, 200)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list order rescue events")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": items})
}

func RegisterOrderRescueRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/operator/support/order-rescue-cases", protected.handleCreateOrderRescueCase)
	mux.HandleFunc("GET /dsh/operator/support/order-rescue-cases", protected.handleListOrderRescueCases)
	mux.HandleFunc("GET /dsh/operator/support/order-rescue-cases/{caseId}", protected.handleGetOrderRescueCase)
	mux.HandleFunc("PATCH /dsh/operator/support/order-rescue-cases/{caseId}", protected.handleUpdateOrderRescueCase)
	mux.HandleFunc("GET /dsh/operator/support/order-rescue-cases/{caseId}/events", protected.handleListOrderRescueEvents)
}
