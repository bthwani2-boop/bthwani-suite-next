package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

// Operations permission actions on the control-panel surface, shared by
// orders/cart/checkout/dispatch/field-readiness operator views. "operator"
// remains a valid fallback role during RBAC data migration.
const (
	OperationsPermissionRead   = "operations.read"
	OperationsPermissionManage = "operations.manage"
)

func parseIfMatchVersion(w http.ResponseWriter, r *http.Request) (int, bool) {
	val := strings.TrimSpace(r.Header.Get("If-Match-Version"))
	if val == "" {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "If-Match-Version header is required")
		return 0, false
	}
	version, err := strconv.Atoi(val)
	if err != nil || version <= 0 {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "If-Match-Version must be a positive integer")
		return 0, false
	}
	return version, true
}

// POST /dsh/partner/orders/{orderId}/decision
func (s *protectedStoreServer) handlePartnerOrderDecision(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}

	var body struct {
		Decision   string `json:"decision"` // "accept" or "reject"
		ReasonCode string `json:"reasonCode"`
		ReasonNote string `json:"reasonNote"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Idempotency-Key header is required")
		return
	}

	version, ok := parseIfMatchVersion(w, r)
	if !ok {
		return
	}

	order, err := orders.DecidePartnerOrder(s.db, orders.DecidePartnerOrderInput{
		OrderID:         ownedOrder.ID,
		StoreID:         ownedOrder.StoreID,
		ActorID:         actor.ID,
		Decision:        body.Decision,
		ReasonCode:      body.ReasonCode,
		ReasonNote:      body.ReasonNote,
		ExpectedVersion: version,
		IdempotencyKey:  idempotencyKey,
	})

	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to process order decision")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"order": marshalOrder(order)})
}

// POST /dsh/partner/orders/{orderId}/preparing
func (s *protectedStoreServer) handleMarkPreparing(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	order, err := orders.MarkPreparing(s.db, ownedOrder.ID, actor.ID)
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
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	order, err := orders.MarkReadyForPickup(s.db, ownedOrder.ID, actor.ID)
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



// POST /dsh/operator/orders/{orderId}/cancel
// Compatibility alias: all operator cancellation writes execute through the
// canonical platform-context-scoped, idempotent order handler.
func (s *protectedStoreServer) handleOperatorCancelOrder(w http.ResponseWriter, r *http.Request) {
	s.handleOperatorCancelOrderGoverned(w, r)
}

func marshalOrder(o *orders.Order) map[string]any {
	items := make([]map[string]any, len(o.Items))
	totalPrice := 0.0
	for i, it := range o.Items {
		lineTotal := it.UnitPrice * float64(it.Quantity)
		totalPrice += lineTotal
		items[i] = map[string]any{
			"id":          it.ID,
			"productId":   it.ProductID,
			"productName": it.ProductName,
			"quantity":    it.Quantity,
			"unitPrice":   it.UnitPrice,
			"currency":    it.Currency,
		}
	}
	return map[string]any{
		"id":               o.ID,
		"checkoutIntentId": o.CheckoutIntentID,
		"storeId":          o.StoreID,
		"fulfillmentMode":  o.FulfillmentMode,
		"clientId":         o.ClientID,
		"status":           string(o.Status),
		"rejectionReason":  o.RejectionReason,
		"wltPaymentRefId":  o.WltPaymentRefID,
		"currency":         o.Currency,
		"totalPrice":       totalPrice,
		"items":            items,
		"createdAt":        o.CreatedAt,
		"updatedAt":        o.UpdatedAt,
	}
}

func marshalOrders(list []orders.Order) []map[string]any {
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = marshalOrder(&list[i])
	}
	return out
}
