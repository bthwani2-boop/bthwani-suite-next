package http

import (
	"database/sql"
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

func parsePartnerMutationHeaders(w http.ResponseWriter, r *http.Request) (string, int, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return "", 0, false
	}
	version, ok := parseIfMatchVersion(w, r)
	if !ok {
		return "", 0, false
	}
	return idempotencyKey, version, true
}

type partnerOrderDecisionRequest struct {
	Decision   string `json:"decision"`
	Reason     string `json:"reason"`
	ReasonCode string `json:"reasonCode"`
	ReasonNote string `json:"reasonNote"`
}

func normalizePartnerDecisionReason(body partnerOrderDecisionRequest) (string, string) {
	reasonCode := strings.TrimSpace(body.ReasonCode)
	reasonNote := strings.TrimSpace(body.ReasonNote)
	legacyReason := strings.TrimSpace(body.Reason)
	if reasonCode == "" {
		reasonCode = legacyReason
	}
	if reasonNote == "" {
		reasonNote = legacyReason
	}
	return reasonCode, reasonNote
}

func (s *protectedStoreServer) currentPartnerOrderVersion(
	w http.ResponseWriter,
	r *http.Request,
	orderID,
	storeID string,
) (int, bool) {
	var version int
	err := s.db.QueryRowContext(r.Context(), `
		SELECT version
		FROM dsh_orders
		WHERE id=$1::uuid AND store_id=$2`, orderID, storeID).Scan(&version)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return 0, false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve order version")
		return 0, false
	}
	if version <= 0 {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "order version is invalid")
		return 0, false
	}
	return version, true
}

func (s *protectedStoreServer) executePartnerOrderDecision(
	w http.ResponseWriter,
	r *http.Request,
	actor store.StoreActor,
	ownedOrder *orders.Order,
	decision,
	reasonCode,
	reasonNote string,
	requireExplicitConcurrency bool,
) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		if requireExplicitConcurrency {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Idempotency-Key header is required")
			return
		}
		// The public accept/reject facade predates explicit mutation headers. A
		// stable server-owned key preserves retry safety while every mutation is
		// still executed by the single governed decision engine below.
		idempotencyKey = "partner-order-" + decision + ":" + ownedOrder.ID
	}

	var version int
	var ok bool
	if strings.TrimSpace(r.Header.Get("If-Match-Version")) != "" || requireExplicitConcurrency {
		version, ok = parseIfMatchVersion(w, r)
	} else {
		version, ok = s.currentPartnerOrderVersion(w, r, ownedOrder.ID, ownedOrder.StoreID)
	}
	if !ok {
		return
	}

	order, err := orders.DecidePartnerOrder(s.db, orders.DecidePartnerOrderInput{
		OrderID:         ownedOrder.ID,
		StoreID:         ownedOrder.StoreID,
		ActorID:         actor.ID,
		Decision:        decision,
		ReasonCode:      reasonCode,
		ReasonNote:      reasonNote,
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

// POST /dsh/partner/orders/{orderId}/decision
// This is the explicit OCC/idempotency form used by governed automation and
// advanced clients. Public accept/reject routes below execute through the same
// mutation engine instead of maintaining separate state-transition logic.
func (s *protectedStoreServer) handlePartnerOrderDecision(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}

	var body partnerOrderDecisionRequest
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	decision := strings.TrimSpace(body.Decision)
	reasonCode, reasonNote := normalizePartnerDecisionReason(body)
	s.executePartnerOrderDecision(w, r, actor, ownedOrder, decision, reasonCode, reasonNote, true)
}

// POST /dsh/partner/orders/{orderId}/accept
// Public partner contract facade. It retains the documented endpoint while the
// actual mutation is owned exclusively by DecidePartnerOrder. If callers send
// If-Match-Version/Idempotency-Key they are honored; older callers receive a
// server-owned stable idempotency key and an OCC snapshot that still fails on
// a concurrent version change inside DecidePartnerOrder.
func (s *protectedStoreServer) handlePartnerAcceptOrder(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	s.executePartnerOrderDecision(w, r, actor, ownedOrder, "accept", "", "", false)
}

// POST /dsh/partner/orders/{orderId}/reject
func (s *protectedStoreServer) handlePartnerRejectOrder(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body partnerOrderDecisionRequest
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	reasonCode, reasonNote := normalizePartnerDecisionReason(body)
	if reasonCode == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "rejection reason is required")
		return
	}
	s.executePartnerOrderDecision(w, r, actor, ownedOrder, "reject", reasonCode, reasonNote, false)
}

// POST /dsh/partner/orders/{orderId}/preparing
func (s *protectedStoreServer) handleMarkPreparing(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	idempotencyKey, expectedVersion, ok := parsePartnerMutationHeaders(w, r)
	if !ok {
		return
	}
	order, err := orders.TransitionPartnerPreparation(s.db, orders.PartnerPreparationTransitionInput{
		OrderID: ownedOrder.ID, StoreID: ownedOrder.StoreID, ActorID: actor.ID,
		Operation: "prepare", ExpectedVersion: expectedVersion, IdempotencyKey: idempotencyKey,
	})
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
	idempotencyKey, expectedVersion, ok := parsePartnerMutationHeaders(w, r)
	if !ok {
		return
	}
	order, err := orders.TransitionPartnerPreparation(s.db, orders.PartnerPreparationTransitionInput{
		OrderID: ownedOrder.ID, StoreID: ownedOrder.StoreID, ActorID: actor.ID,
		Operation: "ready", ExpectedVersion: expectedVersion, IdempotencyKey: idempotencyKey,
	})
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
		"version":          o.Version,
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
