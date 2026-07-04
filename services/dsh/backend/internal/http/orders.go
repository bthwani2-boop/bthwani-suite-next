package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

// POST /dsh/client/orders
func (s *protectedStoreServer) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		CheckoutIntentID string `json:"checkoutIntentId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CheckoutIntentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "checkoutIntentId is required")
		return
	}

	order, err := orders.CreateOrder(s.db, orders.CreateOrderInput{
		CheckoutIntentID: body.CheckoutIntentID,
		ClientID:         actor.ID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create order")
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{"order": marshalOrder(order)})
}

// GET /dsh/client/orders
func (s *protectedStoreServer) handleListClientOrders(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	list, err := orders.ListClientOrders(s.db, actor.ID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list orders")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": marshalOrders(list)})
}

// GET /dsh/client/orders/{orderId}
func (s *protectedStoreServer) handleGetClientOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	order, err := orders.GetClientOrder(s.db, orderID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// GET /dsh/partner/orders?storeId=...&status=...
func (s *protectedStoreServer) handleListPartnerOrders(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId query param is required")
		return
	}
	statusFilter := r.URL.Query().Get("status")
	list, err := orders.ListPartnerOrders(s.db, storeID, statusFilter, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner orders")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": marshalOrders(list)})
}

// POST /dsh/partner/orders/{orderId}/accept
func (s *protectedStoreServer) handleAcceptOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	order, err := orders.AcceptOrder(s.db, orderID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "order cannot be accepted in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to accept order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// POST /dsh/partner/orders/{orderId}/reject
func (s *protectedStoreServer) handleRejectOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "rejection reason is required")
		return
	}
	order, err := orders.RejectOrder(s.db, orderID, actor.ID, body.Reason)
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "order cannot be rejected in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to reject order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// POST /dsh/partner/orders/{orderId}/preparing
func (s *protectedStoreServer) handleMarkPreparing(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	order, err := orders.MarkPreparing(s.db, orderID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "order cannot be marked preparing in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// POST /dsh/partner/orders/{orderId}/ready
func (s *protectedStoreServer) handleMarkReadyForPickup(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	order, err := orders.MarkReadyForPickup(s.db, orderID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "order cannot be marked ready in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// GET /dsh/operator/orders?status=...
func (s *protectedStoreServer) handleListOperatorOrders(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	statusFilter := r.URL.Query().Get("status")
	list, err := orders.ListOperatorOrders(s.db, statusFilter, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list orders")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orders": marshalOrders(list)})
}

// POST /dsh/operator/orders/{orderId}/cancel
func (s *protectedStoreServer) handleOperatorCancelOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cancellation reason is required")
		return
	}
	order, err := orders.CancelOrderByOperator(s.db, orderID, actor.ID, body.Reason)
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "order cannot be cancelled in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to cancel order")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

func marshalOrder(o *orders.Order) map[string]any {
	items := make([]map[string]any, len(o.Items))
	for i, it := range o.Items {
		items[i] = map[string]any{
			"id":          it.ID,
			"productId":   it.ProductID,
			"productName": it.ProductName,
			"quantity":    it.Quantity,
			"unitPrice":   it.UnitPrice,
		}
	}
	return map[string]any{
		"id":               o.ID,
		"checkoutIntentId": o.CheckoutIntentID,
		"storeId":          o.StoreID,
		"clientId":         o.ClientID,
		"status":           string(o.Status),
		"rejectionReason":  o.RejectionReason,
		"wltPaymentRefId":  o.WltPaymentRefID,
		"items":            items,
		"createdAt":        o.CreatedAt,
		"updatedAt":        o.UpdatedAt,
	}
}

func marshalOrders(list []orders.Order) []map[string]any {
	out := make([]map[string]any, len(list))
	for i, o := range list {
		out[i] = map[string]any{
			"id":               o.ID,
			"checkoutIntentId": o.CheckoutIntentID,
			"storeId":          o.StoreID,
			"clientId":         o.ClientID,
			"status":           string(o.Status),
			"rejectionReason":  o.RejectionReason,
			"wltPaymentRefId":  o.WltPaymentRefID,
			"createdAt":        o.CreatedAt,
			"updatedAt":        o.UpdatedAt,
		}
	}
	return out
}
