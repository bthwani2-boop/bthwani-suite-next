package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/orders"
	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
)

// GET /dsh/client/orders/{orderId}/pickup
//
// Serves the notification action_url the client receives from
// pickup.DeliverOtpNotification. The client never sees the OTP in plaintext
// here (marshalPickupSession does not carry it); the code only ever reaches
// the client through the notification body itself.
func (s *protectedStoreServer) handleGetClientPickupSession(w http.ResponseWriter, r *http.Request) {
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
	if order.FulfillmentMode != "pickup" {
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_INVALID_TRANSITION", "order is not a pickup order")
		return
	}

	session, err := pickup.GetByOrderID(s.db, order.ID)
	if errors.Is(err, pickup.ErrNotFound) {
		session = nil
		err = nil
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load pickup session")
		return
	}

	stage, err := pickup.ResolvePartnerStage(s.db, order.ID, string(order.Status), session)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve pickup stage")
		return
	}

	var sessionPayload any
	if session != nil {
		sessionPayload = marshalPickupSession(session)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"session": sessionPayload,
		"stage":   stage,
	})
}
