package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/store"
)

// GET /dsh/partner/orders/{orderId}/partner-delivery
func (s *protectedStoreServer) handleGetPartnerDeliveryTask(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	if ownedOrder.FulfillmentMode != "partner_delivery" {
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_NOT_APPLICABLE", "order is not partner_delivery")
		return
	}
	task, err := partnerdelivery.GetByOrderIDForOperatorContext(s.db, actor.OperatorContextID, ownedOrder.ID)
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
