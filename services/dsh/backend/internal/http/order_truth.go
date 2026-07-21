package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleCreateOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok { return }
	var body struct { CheckoutIntentID string `json:"checkoutIntentId"` }
	if !decodeProtectedJSON(w, r, &body) { return }
	body.CheckoutIntentID = strings.TrimSpace(body.CheckoutIntentID)
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	correlationID := safeOrderCreateCorrelation(
		actor.TenantID,
		actor.ID,
		body.CheckoutIntentID,
		idempotencyKey,
		r.Header.Get("X-Correlation-ID"),
	)
	if body.CheckoutIntentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "checkoutIntentId is required")
		return
	}
	if len(idempotencyKey) < 16 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 16 to 200 characters")
		return
	}
	truth, replay, err := orders.CreateOrderTruth(s.db, orders.CreateOrderTruthInput{
		CheckoutIntentID: body.CheckoutIntentID,
		ClientID: actor.ID,
		TenantID: actor.TenantID,
		IdempotencyKey: idempotencyKey,
		CorrelationID: correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrIdempotencyConflict) {
		_ = orders.RecordOrderTruthAudit(s.db, orders.OrderTruthAuditInput{
			TenantID: actor.TenantID,
			ActorID: actor.ID,
			ActorRole: "client",
			CheckoutIntentID: body.CheckoutIntentID,
			EventType: "order.idempotency_conflict",
			ResultCode: "IDEMPOTENCY_KEY_REUSED",
			CorrelationID: correlationID,
			Metadata: map[string]any{"surface": "app-client", "route": "/dsh/client/order-truth", "status": 409},
		})
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used for another order request")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		_ = orders.RecordOrderTruthAudit(s.db, orders.OrderTruthAuditInput{
			TenantID: actor.TenantID,
			ActorID: actor.ID,
			ActorRole: "client",
			CheckoutIntentID: body.CheckoutIntentID,
			EventType: "order.create_conflict",
			ResultCode: "ORDER_CREATE_CONFLICT",
			CorrelationID: correlationID,
			Metadata: map[string]any{"surface": "app-client", "route": "/dsh/client/order-truth", "status": 409},
		})
		store.SendError(w, http.StatusConflict, "ORDER_CREATE_CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create governed order")
		return
	}
	orders.RedactOrderTruthForViewer(truth, "client")
	status := http.StatusCreated
	eventType := "order.create_succeeded"
	if replay {
		status = http.StatusOK
		eventType = "order.create_replayed"
		w.Header().Set("Idempotent-Replay", "true")
	}
	_ = orders.RecordOrderTruthAudit(s.db, orders.OrderTruthAuditInput{
		TenantID: actor.TenantID,
		ActorID: actor.ID,
		ActorRole: "client",
		OrderID: truth.ID,
		CheckoutIntentID: body.CheckoutIntentID,
		EventType: eventType,
		ResultCode: http.StatusText(status),
		CorrelationID: truth.CorrelationID,
		Metadata: map[string]any{
			"surface": "app-client",
			"route": "/dsh/client/order-truth",
			"status": status,
			"replay": replay,
			"version": truth.Version,
		},
	})
	w.Header().Set("X-Correlation-ID", truth.CorrelationID)
	store.SendJSON(w, status, map[string]any{"order": truth})
}

func (s *protectedStoreServer) handleListClientOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok { return }
	list, err := orders.ListClientOrderTruth(s.db, actor.TenantID, actor.ID, parseOrderTruthLimit(r))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list governed orders")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": list})
}

func (s *protectedStoreServer) handleGetClientOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok { return }
	truth, err := orders.GetClientScopedOrderTruth(s.db, r.PathValue("orderId"), actor.TenantID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read governed order")
		return
	}
	orders.RedactOrderTruthForViewer(truth, "client")
	store.SendJSON(w, http.StatusOK, map[string]any{"order": truth})
}

func (s *protectedStoreServer) handleListClientOrderTruthEvents(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok { return }
	truth, err := orders.GetClientScopedOrderTruth(s.db, r.PathValue("orderId"), actor.TenantID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read order timeline")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": truth.StatusTimeline})
}

func (s *protectedStoreServer) handleListPartnerOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok { return }
	list, err := orders.ListPartnerOrderTruth(s.db, actor.TenantID, storeID, strings.TrimSpace(r.URL.Query().Get("status")), parseOrderTruthLimit(r))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list store order truth")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": list})
}

func (s *protectedStoreServer) handleGetPartnerOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok { return }
	truth, err := orders.GetPartnerScopedOrderTruth(s.db, r.PathValue("orderId"), actor.TenantID, storeID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read store order truth")
		return
	}
	orders.RedactOrderTruthForViewer(truth, "partner")
	store.SendJSON(w, http.StatusOK, map[string]any{"order": truth})
}

func (s *protectedStoreServer) handleListOperatorOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok { return }
	list, err := orders.ListOperatorOrderTruth(s.db, actor.TenantID, strings.TrimSpace(r.URL.Query().Get("status")), parseOrderTruthLimit(r))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list tenant order truth")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": list})
}

func (s *protectedStoreServer) handleGetOperatorOrderTruth(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok { return }
	truth, err := orders.GetOrderTruth(s.db, r.PathValue("orderId"), actor.TenantID, "operator")
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read tenant order truth")
		return
	}
	orders.RedactOrderTruthForViewer(truth, "operator")
	store.SendJSON(w, http.StatusOK, map[string]any{"order": truth})
}

func parseOrderTruthLimit(r *http.Request) int {
	value := strings.TrimSpace(r.URL.Query().Get("limit"))
	if value == "" { return 50 }
	limit, err := strconv.Atoi(value)
	if err != nil || limit <= 0 || limit > 200 { return 50 }
	return limit
}
