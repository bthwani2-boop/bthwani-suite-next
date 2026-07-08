package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/cart"
	"dsh-api/internal/store"
)

type cartServer struct {
	protectedStoreServer
}

// POST /dsh/client/cart/serviceability
func (s *protectedStoreServer) handleCartServiceability(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "client"); !ok {
		return
	}
	var body struct {
		StoreID         string   `json:"storeId"`
		ServiceAreaCode string   `json:"serviceAreaCode"`
		Latitude        *float64 `json:"latitude"`
		Longitude       *float64 `json:"longitude"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.StoreID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId is required")
		return
	}
	result := cart.CheckServiceability(r.Context(), s.db, body.StoreID, body.ServiceAreaCode, body.Latitude, body.Longitude)
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
	c, err := cart.GetCart(r.Context(), s.db, actor.ID, storeID)
	if errors.Is(err, cart.ErrNotFound) {
		store.SendJSON(w, http.StatusOK, map[string]any{"cart": nil})
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart lookup failed")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cart": c})
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
	c, err := cart.GetOrCreateActiveCart(r.Context(), s.db, actor.ID, body.StoreID, mode)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not resolve cart")
		return
	}
	item, err := cart.UpsertItem(r.Context(), s.db, body.StoreID, c.ID, cart.UpsertItemInput{
		MasterProductID: body.MasterProductID,
		Quantity:        body.Quantity,
	})
	if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid cart item")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not update cart item")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"cartId": c.ID, "item": item})
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
	// Verify cart belongs to actor
	storeID := r.URL.Query().Get("storeId")
	if storeID != "" {
		if _, err := cart.GetCart(r.Context(), s.db, actor.ID, storeID); errors.Is(err, cart.ErrNotFound) {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "cart not accessible")
			return
		}
	}
	if err := cart.RemoveItem(r.Context(), s.db, cartID, itemID); errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "cart item not found")
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
		c, err := cart.GetCart(r.Context(), s.db, actor.ID, storeID)
		if errors.Is(err, cart.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart lookup failed")
			return
		}
		cartID = c.ID
	}
	if err := cart.ClearCart(r.Context(), s.db, cartID); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not clear cart")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /dsh/operator/carts?state=active
func (s *protectedStoreServer) handleOperatorCarts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireActor(w, r, "operator"); !ok {
		return
	}
	stateFilter := r.URL.Query().Get("state")
	carts, err := cart.ListOperatorCarts(r.Context(), s.db, stateFilter)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "could not load carts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"carts": carts})
}
