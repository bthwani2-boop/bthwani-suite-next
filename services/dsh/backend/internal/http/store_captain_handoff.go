package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

// POST /dsh/captain/dispatch/assignments/{assignmentId}/status
//
// This governed replacement preserves all existing delivery transitions and
// adds the outbound store-captain custody requirement before picked_up.
func (s *protectedStoreServer) handleGovernedUpdateDeliveryStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		Status dispatch.DeliveryStatus `json:"status"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.UpdateDeliveryStatusGovernedIdempotent(
		s.db,
		r.PathValue("assignmentId"),
		actor.ID,
		body.Status,
	)
	if errors.Is(err, dispatch.ErrStoreHandoffRequired) {
		store.SendError(
			w,
			http.StatusConflict,
			"STORE_HANDOFF_REQUIRED",
			"the owning store must confirm package handoff before captain pickup",
		)
		return
	}
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/partner/orders/{orderId}/captain-handoff/confirm
func (s *protectedStoreServer) handleConfirmPartnerStoreCaptainHandoff(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	item, err := dispatch.ConfirmStoreCaptainHandoffIdempotent(
		s.db,
		r.PathValue("orderId"),
		storeID,
		actor.ID,
	)
	if err != nil {
		writeStoreCaptainHandoffError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"handoff": marshalStoreCaptainHandoff(item)})
}

func writeStoreCaptainHandoffError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "active store-captain handoff was not found")
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "STORE_HANDOFF_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "store-captain handoff operation failed")
	}
}

func marshalStoreCaptainHandoff(item *dispatch.StoreCaptainHandoff) map[string]any {
	return map[string]any{
		"id":                        item.ID,
		"orderId":                   item.OrderID,
		"assignmentId":              item.AssignmentID,
		"storeId":                   item.StoreID,
		"captainId":                 item.CaptainID,
		"status":                    item.Status,
		"partnerConfirmedAt":        item.PartnerConfirmedAt,
		"partnerConfirmedByActorId": item.PartnerConfirmedByActorID,
		"captainConfirmedAt":        item.CaptainConfirmedAt,
		"captainConfirmedByActorId": item.CaptainConfirmedByActorID,
		"version":                   item.Version,
		"createdAt":                 item.CreatedAt,
		"updatedAt":                 item.UpdatedAt,
	}
}
