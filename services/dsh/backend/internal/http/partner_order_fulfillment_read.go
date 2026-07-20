package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
)

// GET /dsh/partner/orders/{orderId}/partner-delivery
func (s *protectedStoreServer) handleGetPartnerDeliveryTask(w http.ResponseWriter, r *http.Request) {
	_, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	if ownedOrder.FulfillmentMode != "partner_delivery" {
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_NOT_APPLICABLE", "order is not partner_delivery")
		return
	}
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
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

// GET /dsh/partner/orders/{orderId}/pickup
func (s *protectedStoreServer) handleGetPartnerPickupSession(w http.ResponseWriter, r *http.Request) {
	_, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	if ownedOrder.FulfillmentMode != "pickup" {
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_NOT_APPLICABLE", "order is not pickup")
		return
	}

	session, err := pickup.GetByOrderID(s.db, ownedOrder.ID)
	if errors.Is(err, pickup.ErrNotFound) {
		session = nil
	} else if err != nil {
		writePickupError(w, err)
		return
	}
	stage, err := pickup.ResolveStage(s.db, ownedOrder.ID, session)
	if err != nil {
		writePickupError(w, err)
		return
	}
	var responseSession any
	if session != nil {
		responseSession = marshalPickupSession(session)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": responseSession, "stage": stage})
}
