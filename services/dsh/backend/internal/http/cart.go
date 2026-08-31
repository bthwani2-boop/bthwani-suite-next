package http

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/cart"
	"dsh-api/internal/clientaddress"
	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"
)

func requireCartMutationIdentity(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_INVALID", "Idempotency-Key must contain between 8 and 200 characters")
		return "", "", false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(correlationID) < 8 || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain between 8 and 200 characters")
		return "", "", false
	}
	return idempotencyKey, correlationID, true
}

// GET /dsh/client/cart/fulfillment-modes
func (s *protectedStoreServer) handleGetFulfillmentModes(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId query parameter is required")
		return
	}
	serviceAreaCode := r.URL.Query().Get("serviceAreaCode")

	// GetFulfillmentModes doesn't rely on full physical coordinates in the simple case,
	// but if we have an active address, we should technically use it.
	// For J051 lightweight capability fetch, we just rely on the zone/serviceAreaCode.
	resp, err := cart.GetFulfillmentModes(r.Context(), s.db, storeID, serviceAreaCode, nil, nil)
	if errors.Is(err, platformpolicies.ErrPolicyTruthUnavailable) {
		store.SendError(w, http.StatusServiceUnavailable, "POLICY_TRUTH_UNAVAILABLE", "operational policy truth is temporarily unavailable")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "fulfillment modes could not be evaluated")
		return
	}
	store.SendJSON(w, http.StatusOK, resp)

}

// POST /dsh/client/cart/serviceability
func (s *protectedStoreServer) handleCartServiceability(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		StoreID         string `json:"storeId"`
		AddressID       string `json:"addressId"`
		FulfillmentMode string `json:"fulfillmentMode"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.StoreID = strings.TrimSpace(body.StoreID)
	body.AddressID = strings.TrimSpace(body.AddressID)
	if body.StoreID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId is required")
		return
	}
	mode := cart.FulfillmentMode(strings.TrimSpace(body.FulfillmentMode))
	if mode == "" {
		mode = cart.ModeBthwaniDelivery
	}
	if mode != cart.ModeBthwaniDelivery && mode != cart.ModePartnerDelivery && mode != cart.ModePickup {
		store.SendError(w, http.StatusBadRequest, "INVALID_FULFILLMENT_MODE", "fulfillmentMode is invalid")
		return
	}

	var address *clientaddress.Address
	var err error
	if body.AddressID != "" {
		address, err = clientaddress.GetOwned(r.Context(), s.db, actor.ID, body.AddressID)
	} else {
		var addresses []clientaddress.Address
		addresses, err = clientaddress.List(r.Context(), s.db, actor.ID)
		if err == nil && len(addresses) == 0 {
			store.SendError(w, http.StatusUnprocessableEntity, "ADDRESS_REQUIRED", "create a governed client address before checking delivery serviceability")
			return
		}
		if err == nil {
			address = &addresses[0]
		}
	}
	if errors.Is(err, clientaddress.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "address is not owned by the authenticated client")
		return
	}
	if err != nil || address == nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not resolve delivery address")
		return
	}

	result, err := cart.CheckGovernedServiceability(
		r.Context(),
		s.db,
		s.maps,
		body.StoreID,
		address.ServiceAreaCode,
		address.Latitude,
		address.Longitude,
		mode,
	)
	if errors.Is(err, platformpolicies.ErrPolicyTruthUnavailable) {
		store.SendError(w, http.StatusServiceUnavailable, "POLICY_TRUTH_UNAVAILABLE", "operational policy truth is temporarily unavailable")
		return
	}
	if errors.Is(err, platformpolicies.ErrNotFound) {
		store.SendError(w, http.StatusUnprocessableEntity, "OPERATIONAL_POLICY_NOT_CONFIGURED", "store is not mapped to a governed operational zone")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "operational policy could not be evaluated")
		return
	}
	result.AddressID = address.ID
	result.AddressVersion = address.Version
	if err := cart.RecordServiceabilityCheck(
		r.Context(),
		s.db,
		actor.ID,
		body.StoreID,
		address.ServiceAreaCode,
		correlationID(r),
		result,
	); err != nil {
		store.SendError(w, http.StatusInternalServerError, "SERVICEABILITY_AUDIT_FAILED", "serviceability result could not be recorded")
		return
	}

	type EtaWindow struct {
		MinMinutes int `json:"minMinutes"`
		MaxMinutes int `json:"maxMinutes"`
	}
	type Response struct {
		Serviceable    bool                               `json:"serviceable"`
		Code           string                             `json:"code"`
		Reason         string                             `json:"reason,omitempty"`
		AvailableModes []cart.FulfillmentModeAvailability `json:"availableModes,omitempty"`
		EtaWindow      *EtaWindow                         `json:"etaWindow,omitempty"`
		EtaStatus      string                             `json:"etaStatus"`
		EtaReasonCode  string                             `json:"etaReasonCode,omitempty"`
		QuoteVersion   string                             `json:"quoteVersion,omitempty"`
		ExpiresAt      *time.Time                         `json:"expiresAt,omitempty"`
	}

	resp := Response{
		Serviceable:    result.Serviceable,
		Code:           result.Code,
		Reason:         result.Reason,
		AvailableModes: result.AvailableModes,
		EtaStatus:      result.EtaStatus,
		EtaReasonCode:  result.EtaReasonCode,
		QuoteVersion:   result.QuoteVersion,
		ExpiresAt:      result.ExpiresAt,
	}
	if result.EtaMinMinutes != nil && result.EtaMaxMinutes != nil {
		resp.EtaWindow = &EtaWindow{
			MinMinutes: *result.EtaMinMinutes,
			MaxMinutes: *result.EtaMaxMinutes,
		}
	}

	store.SendJSON(w, http.StatusOK, resp)
}

// GET /dsh/client/cart?storeId=xxx (storeId is optional when discovering the
// one active cart owned by the authenticated client.)
func (s *protectedStoreServer) handleGetCart(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	storeID := r.URL.Query().Get("storeId")
	var current *cart.Cart
	var err error
	if strings.TrimSpace(storeID) == "" {
		current, err = cart.GetActiveCartForClient(r.Context(), s.db, s.wlt, actor.ID)
	} else {
		current, err = cart.GetCart(r.Context(), s.db, s.wlt, actor.ID, storeID)
	}
	if errors.Is(err, cart.ErrNotFound) {
		store.SendJSON(w, http.StatusOK, map[string]any{"cart": nil})
		return
	}
	if errors.Is(err, cart.ErrFinancialUnavailable) {
		store.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_QUOTE_UNAVAILABLE", "canonical financial pricing is temporarily unavailable")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart lookup failed")
		return
	}
	validation, err := cart.ValidateCart(r.Context(), s.db, current.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart validation failed")
		return
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%d"`, current.Version))
	store.SendJSON(w, http.StatusOK, map[string]any{
		"cart": cart.ClientCartView{Cart: current, Validation: validation},
	})
}

// GET /dsh/client/cart/mutations/{idempotencyKey}
// Returns only the authenticated client's committed cart mutation receipt.
// A missing receipt is an explicit not-committed result for reconciliation.
func (s *protectedStoreServer) handleGetCartMutationReceipt(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey := strings.TrimSpace(r.PathValue("idempotencyKey"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_INVALID", "idempotencyKey must contain between 8 and 200 characters")
		return
	}

	receipt, err := cart.FindMutationReceipt(r.Context(), s.db, actor.ID, idempotencyKey)
	if errors.Is(err, cart.ErrMutationReceiptNotFound) {
		store.SendError(w, http.StatusNotFound, "MUTATION_NOT_COMMITTED", "no committed cart mutation receipt exists for this actor and key")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart mutation receipt could not be read")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"mutation": map[string]any{
			"idempotencyKey": receipt.IdempotencyKey,
			"operation":      receipt.Operation,
			"cartId":         receipt.CartID,
			"itemId":         receipt.ItemID,
			"version":        receipt.Version,
			"resultDeleted":  receipt.ResultDeleted,
			"createdAt":      receipt.CreatedAt,
		},
	})
}

// POST /dsh/client/cart/items
func (s *protectedStoreServer) handleUpsertCartItem(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCartMutationIdentity(w, r)
	if !ok {
		return
	}
	var body struct {
		StoreID         string   `json:"storeId"`
		FulfillmentMode string   `json:"fulfillmentMode"`
		MasterProductID string   `json:"masterProductId"`
		Quantity        int      `json:"quantity"`
		Options         []string `json:"options"`
		Note            string   `json:"note"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.StoreID = strings.TrimSpace(body.StoreID)
	body.MasterProductID = strings.TrimSpace(body.MasterProductID)
	if body.StoreID == "" || body.MasterProductID == "" || body.Quantity < 1 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId, masterProductId and quantity >= 1 are required")
		return
	}
	mode := cart.FulfillmentMode(body.FulfillmentMode)
	if mode != cart.ModeBthwaniDelivery && mode != cart.ModePartnerDelivery && mode != cart.ModePickup {
		mode = cart.ModeBthwaniDelivery
	}
	var expectedVersion *int
	if match := r.Header.Get("If-Match-Version"); match != "" {
		var v int
		if _, err := fmt.Sscanf(match, "%d", &v); err != nil || v < 1 {
			store.SendError(w, http.StatusBadRequest, "INVALID_VERSION", "If-Match-Version must be a positive integer")
			return
		}
		expectedVersion = &v
	}
	result, err := cart.UpsertItemIdempotent(r.Context(), s.db, actor.ID, body.StoreID, mode, cart.UpsertItemInput{
		MasterProductID: body.MasterProductID,
		Quantity:        body.Quantity,
		Options:         body.Options,
		Note:            body.Note,
		ExpectedVersion: expectedVersion,
		FulfillmentMode: &mode,
	}, cart.MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		DeviceID:       strings.TrimSpace(r.Header.Get("X-Dsh-Device-Id")),
		SessionID:      strings.TrimSpace(r.Header.Get("X-Dsh-Session-Id")),
	})
	if errors.Is(err, cart.ErrStoreConflict) {
		conflict := &cart.StoreConflictError{}
		if errors.As(err, &conflict) {
			store.SendJSON(w, http.StatusConflict, map[string]any{
				"code":          "CART_STORE_CONFLICT",
				"message":       "clear the active cart before adding products from another store",
				"activeCartId":  conflict.ActiveCartID,
				"activeStoreId": conflict.ActiveStoreID,
			})
			return
		}
		store.SendError(w, http.StatusConflict, "CART_STORE_CONFLICT", "another store already owns the active cart")
		return
	}
	if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusUnprocessableEntity, "CART_ITEM_UNAVAILABLE", "product is unavailable, has no valid store price, or note exceeds limits")
		return
	}
	if errors.Is(err, cart.ErrConflict) {
		store.SendError(w, http.StatusPreconditionFailed, "VERSION_CONFLICT", "cart has been updated by another request")
		return
	}
	if errors.Is(err, cart.ErrIdempotencyConflict) {
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different cart mutation")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart item update failed")
		return
	}
	if result == nil || result.Item == nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart mutation returned no item result")
		return
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%d"`, result.Version))
	store.SendJSON(w, http.StatusOK, map[string]any{"cartId": result.CartID, "item": result.Item})
}

// DELETE /dsh/client/cart/items/{itemId}?cartId=xxx
func (s *protectedStoreServer) handleRemoveCartItem(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCartMutationIdentity(w, r)
	if !ok {
		return
	}
	cartID := strings.TrimSpace(r.URL.Query().Get("cartId"))
	itemID := strings.TrimSpace(r.PathValue("itemId"))
	if cartID == "" || itemID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId and itemId are required")
		return
	}
	var expectedVersion *int
	if match := r.Header.Get("If-Match-Version"); match != "" {
		var v int
		if _, err := fmt.Sscanf(match, "%d", &v); err != nil || v < 1 {
			store.SendError(w, http.StatusBadRequest, "INVALID_VERSION", "If-Match-Version must be a positive integer")
			return
		}
		expectedVersion = &v
	}

	result, err := cart.RemoveItemIdempotent(r.Context(), s.db, actor.ID, cartID, itemID, expectedVersion, cart.MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		DeviceID:       strings.TrimSpace(r.Header.Get("X-Dsh-Device-Id")),
		SessionID:      strings.TrimSpace(r.Header.Get("X-Dsh-Session-Id")),
	})
	if errors.Is(err, cart.ErrIdempotencyConflict) {
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different cart mutation")
		return
	} else if errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart item not found")
		return
	} else if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid cart item reference")
		return
	} else if errors.Is(err, cart.ErrConflict) {
		store.SendError(w, http.StatusPreconditionFailed, "VERSION_CONFLICT", "cart has been updated by another request")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not remove cart item")
		return
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%d"`, result.Version))
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /dsh/client/cart?cartId=xxx
func (s *protectedStoreServer) handleClearCart(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCartMutationIdentity(w, r)
	if !ok {
		return
	}
	cartID := strings.TrimSpace(r.URL.Query().Get("cartId"))
	storeID := strings.TrimSpace(r.URL.Query().Get("storeId"))
	if cartID == "" && storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId or storeId is required")
		return
	}
	var expectedVersion *int
	if match := r.Header.Get("If-Match-Version"); match != "" {
		var v int
		if _, err := fmt.Sscanf(match, "%d", &v); err != nil || v < 1 {
			store.SendError(w, http.StatusBadRequest, "INVALID_VERSION", "If-Match-Version must be a positive integer")
			return
		}
		expectedVersion = &v
	}

	result, err := cart.ClearCartIdempotent(r.Context(), s.db, actor.ID, cartID, storeID, expectedVersion, cart.MutationContext{
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		DeviceID:       strings.TrimSpace(r.Header.Get("X-Dsh-Device-Id")),
		SessionID:      strings.TrimSpace(r.Header.Get("X-Dsh-Session-Id")),
	})
	if errors.Is(err, cart.ErrIdempotencyConflict) {
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different cart mutation")
		return
	} else if errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart not found")
		return
	} else if errors.Is(err, cart.ErrConflict) {
		store.SendError(w, http.StatusPreconditionFailed, "VERSION_CONFLICT", "cart has been updated by another request")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not clear cart")
		return
	}
	if result != nil && result.CartID != "" && result.Version > 0 {
		w.Header().Set("ETag", fmt.Sprintf(`"%d"`, result.Version))
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /dsh/operator/carts?state=active
func (s *protectedStoreServer) handleOperatorCarts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ActorFromContext(r.Context()); !ok {
		return
	}
	stateFilter := r.URL.Query().Get("state")
	carts, err := cart.ListOperatorCarts(r.Context(), s.db, stateFilter)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load carts")
		return
	}
	carts, err = cart.HydrateOperatorCartItems(r.Context(), s.db, carts)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load cart items")
		return
	}
	views := make([]cart.ClientCartView, 0, len(carts))
	for index := range carts {
		validation, validationErr := cart.ValidateCart(r.Context(), s.db, carts[index].ID)
		if validationErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not validate operator cart view")
			return
		}
		current := carts[index]
		views = append(views, cart.ClientCartView{Cart: &current, Validation: validation})
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"carts": views})
}
