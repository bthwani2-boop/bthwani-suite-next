package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/orders"
	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/store"
)

// GET /dsh/client/orders/{orderId}/partner-delivery
//
// The client-facing reference status for JRN-016: the client never sees this
// for bthwani_delivery orders (those use dispatch tracking instead), only for
// orders the store fulfils through its own fleet.
func (s *protectedStoreServer) handleGetClientPartnerDeliveryTask(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	order, err := orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify order ownership")
		return
	}
	if order.FulfillmentMode != "partner_delivery" {
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_NOT_APPLICABLE", "order is not partner_delivery")
		return
	}

	task, err := partnerdelivery.GetByOrderID(s.db, order.ID)
	if errors.Is(err, partnerdelivery.ErrNotFound) {
		store.SendJSON(w, http.StatusOK, map[string]any{"task": nil, "stage": "unassigned"})
		return
	}
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(task), "stage": task.Status})
}
