package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/cart"
	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
)

type cartServer struct {
	protectedStoreServer
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

	result := cart.CheckGovernedServiceability(
		r.Context(),
		s.db,
		body.StoreID,
		address.ServiceAreaCode,
		address.Latitude,
		address.Longitude,
		mode,
	)
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
	store.SendJSON(w, http.StatusOK, result)
}

// GET /dsh/client/cart?storeId=xxx
func (s *protectedStoreServer) handleGetCart(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId query parameter is required")
		return
	}
	current, err := cart.GetCart(r.Context(), s.db, actor.ID, storeID)
	if errors.Is(err, cart.ErrNotFound) {
		store.SendJSON(w, http.StatusOK, map[string]any{"cart": nil})
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
	store.SendJSON(w, http.StatusOK, map[string]any{
		"cart": cart.ClientCartView{Cart: current, Validation: validation},
	})
}

// POST /dsh/client/cart/items
func (s *protectedStoreServer) handleUpsertCartItem(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		StoreID         string `json:"storeId"`
		FulfillmentMode string `json:"fulfillmentMode"`
		MasterProductID string `json:"masterProductId"`
		Quantity        int    `json:"quantity"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.StoreID == "" || body.MasterProductID == "" || body.Quantity < 1 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId, masterProductId and quantity >= 1 are required")
		return
	}
	mode := cart.FulfillmentMode(body.FulfillmentMode)
	if mode != cart.ModeBthwaniDelivery && mode != cart.ModePartnerDelivery && mode != cart.ModePickup {
		mode = cart.ModeBthwaniDelivery
	}
	current, err := cart.GetOrCreateSingleStoreCart(r.Context(), s.db, actor.ID, body.StoreID, mode)
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
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cart store or fulfillment mode is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not resolve cart")
		return
	}
	item, err := cart.UpsertOwnedItem(r.Context(), s.db, actor.ID, body.StoreID, current.ID, cart.UpsertItemInput{
		MasterProductID: body.MasterProductID,
		Quantity:        body.Quantity,
	})
	if errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "active cart not found")
		return
	}
	if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusUnprocessableEntity, "CART_ITEM_UNAVAILABLE", "product is unavailable or has no valid store price")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update cart item")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cartId": current.ID, "item": item})
}

// DELETE /dsh/client/cart/items/{itemId}?cartId=xxx
func (s *protectedStoreServer) handleRemoveCartItem(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	cartID := r.URL.Query().Get("cartId")
	itemID := r.PathValue("itemId")
	if cartID == "" || itemID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId and itemId are required")
		return
	}
	if err := cart.RemoveOwnedItem(r.Context(), s.db, actor.ID, cartID, itemID); errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart item not found")
		return
	} else if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid cart item reference")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not remove cart item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /dsh/client/cart?cartId=xxx
func (s *protectedStoreServer) handleClearCart(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	cartID := r.URL.Query().Get("cartId")
	storeID := r.URL.Query().Get("storeId")
	if cartID == "" && storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId or storeId is required")
		return
	}
	if storeID != "" {
		current, err := cart.GetCart(r.Context(), s.db, actor.ID, storeID)
		if errors.Is(err, cart.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart lookup failed")
			return
		}
		cartID = current.ID
	}
	if err := cart.ClearOwnedCart(r.Context(), s.db, actor.ID, cartID); errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart not found")
		return
	} else if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid cart reference")
		return
	} else if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not clear cart")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /dsh/operator/carts?state=active
func (s *protectedStoreServer) handleOperatorCarts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
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
