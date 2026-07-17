package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/cart"
	"dsh-api/internal/checkout"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// POST /dsh/client/checkout-intents
func (s *protectedStoreServer) handleCreateCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		CartID          string `json:"cartId"`
		StoreID         string `json:"storeId"`
		FulfillmentMode string `json:"fulfillmentMode"`
		PaymentMethod   string `json:"paymentMethod"`
		DeliveryAddress string `json:"deliveryAddress"`
		Note            string `json:"note"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CartID == "" || body.StoreID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId and storeId are required")
		return
	}

	snapshot, err := cart.ComputeCheckoutSnapshot(r.Context(), s.db, body.CartID)
	if errors.Is(err, cart.ErrCartItemMissingPrice) {
		store.SendError(w, http.StatusConflict, "CART_ITEM_MISSING_PRICE", "one or more cart items are missing a price snapshot")
		return
	}
	if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute cart snapshot")
		return
	}

	intentID, err := checkout.NewIntentID(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to allocate checkout intent")
		return
	}
	intent, err := checkout.CreateIntent(s.db, checkout.CreateIntentInput{
		ID:              intentID,
		ClientID:        actor.ID,
		CartID:          body.CartID,
		StoreID:         body.StoreID,
		FulfillmentMode: checkout.FulfillmentMode(body.FulfillmentMode),
		PaymentMethod:   checkout.PaymentMethod(body.PaymentMethod),
		DeliveryAddress: body.DeliveryAddress,
		Note:            body.Note,
	})
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create checkout intent")
		return
	}

	paymentSession, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		CheckoutIntentID: intent.ID,
		TenantID:         actor.TenantID,
		ClientID:         actor.ID,
		StoreID:          intent.StoreID,
		PaymentMethod:    string(intent.PaymentMethod),
		AmountMinorUnits: snapshot.AmountMinorUnits,
		Currency:         snapshot.Currency,
		CartSnapshotHash: snapshot.SnapshotHash,
		CorrelationID:    r.Header.Get("X-Correlation-ID"),
		IdempotencyKey:   "dsh-checkout-intent:" + intent.ID,
	})
	if err != nil {
		if failedIntent, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, actor.ID); markErr == nil {
			store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
				"intent": marshalIntent(failedIntent),
				"error": map[string]any{
					"code":    "WLT_HANDOFF_UNAVAILABLE",
					"message": "WLT payment-session handoff is unavailable",
				},
			})
			return
		}
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT payment-session handoff is unavailable")
		return
	}

	intent, err = checkout.AttachWltPaymentSession(s.db, intent.ID, actor.ID, paymentSession.ID)
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "checkout intent is not ready for WLT handoff")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to attach WLT payment session")
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{
		"intent": marshalIntent(intent),
	})
}

// GET /dsh/client/checkout-intents/{intentId}
func (s *protectedStoreServer) handleGetCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}

	intent, err := checkout.GetIntent(s.db, intentID, actor.ID)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout intent")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent": marshalIntent(intent),
	})
}

// POST /dsh/client/checkout-intents/{intentId}/cancel
func (s *protectedStoreServer) handleCancelCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}

	intent, err := checkout.CancelIntent(s.db, intentID, actor.ID)
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "intent not found or already closed")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to cancel checkout intent")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent": marshalIntent(intent),
	})
}

// GET /dsh/operator/checkout-intents
func (s *protectedStoreServer) handleOperatorCheckoutIntents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
		return
	}
	stateFilter := r.URL.Query().Get("state")
	intents, err := checkout.ListOperatorIntents(s.db, stateFilter, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list checkout intents")
		return
	}
	out := make([]map[string]any, len(intents))
	for i, intent := range intents {
		out[i] = marshalIntent(&intent)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"intents": out,
	})
}

func marshalIntent(i *checkout.Intent) map[string]any {
	return map[string]any{
		"id":                  i.ID,
		"clientId":            i.ClientID,
		"cartId":              i.CartID,
		"storeId":             i.StoreID,
		"fulfillmentMode":     string(i.FulfillmentMode),
		"state":               string(i.State),
		"paymentMethod":       string(i.PaymentMethod),
		"wltPaymentSessionId": i.WltPaymentSessionID,
		"deliveryAddress":     i.DeliveryAddress,
		"note":                i.Note,
		"version":             i.Version,
		"createdAt":           i.CreatedAt,
		"updatedAt":           i.UpdatedAt,
	}
}
