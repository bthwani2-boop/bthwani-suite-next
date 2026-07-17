package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

// partnerOrder resolves the authenticated partner's sovereign store and then
// proves the requested order belongs to that store. Partner mutations must use
// this helper instead of checking only actor.Role, otherwise a valid partner
// token could action another partner's order by guessing its UUID.
//
// Ownership failures intentionally return NOT_FOUND so callers cannot use the
// endpoint as an order-existence oracle across partner boundaries.
func (s *protectedStoreServer) partnerOrder(
	w http.ResponseWriter,
	r *http.Request,
) (store.StoreActor, *orders.Order, bool) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return store.StoreActor{}, nil, false
	}

	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return store.StoreActor{}, nil, false
	}

	order, err := orders.GetOrder(s.db, orderID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return store.StoreActor{}, nil, false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify order ownership")
		return store.StoreActor{}, nil, false
	}
	if order.StoreID != storeID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return store.StoreActor{}, nil, false
	}

	return actor, order, true
}
