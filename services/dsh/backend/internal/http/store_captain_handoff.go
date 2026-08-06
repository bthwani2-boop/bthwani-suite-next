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
		Status          dispatch.DeliveryStatus `json:"status"`
		Latitude        *float64                `json:"latitude,omitempty"`
		Longitude       *float64                `json:"longitude,omitempty"`
		ExpectedVersion int                     `json:"version,omitempty"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignmentID := r.PathValue("assignmentId")

	// Verify assignment and version for offline action queueing
	if body.ExpectedVersion > 0 {
		meta, err := dispatch.GetAssignmentGovernance(s.db, assignmentID)
		if err != nil {
			writeGovernedDispatchError(w, err)
			return
		}
		if meta.Version != body.ExpectedVersion {
			store.SendError(w, http.StatusConflict, "STALE_OFFLINE_ACTION", "assignment version mismatch")
			return
		}
	}

	// Geofence enforcement (J066)
	if body.Status == dispatch.DeliveryArrivedStore || body.Status == dispatch.DeliveryArrivedCustomer {
		if body.Latitude == nil || body.Longitude == nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "latitude and longitude required for arrival")
			return
		}
		var sLat, sLng, cLat, cLng float64
		err := s.db.QueryRow(`
			SELECT s.latitude, s.longitude,
			       COALESCE((o.delivery_address_snapshot->>'latitude')::float8, 0),
			       COALESCE((o.delivery_address_snapshot->>'longitude')::float8, 0)
			FROM dsh_assignments a
			JOIN dsh_orders o ON o.id = a.order_id
			JOIN dsh_stores s ON s.id = o.store_id
			WHERE a.id = $1::uuid
		`, assignmentID).Scan(&sLat, &sLng, &cLat, &cLng)
		if err == nil {
			var dist float64
			if body.Status == dispatch.DeliveryArrivedStore {
				dist = distanceMeters(*body.Latitude, *body.Longitude, sLat, sLng)
			} else {
				dist = distanceMeters(*body.Latitude, *body.Longitude, cLat, cLng)
			}
			if dist > 150.0 {
				store.SendError(w, http.StatusUnprocessableEntity, "GEOFENCE_VIOLATION", "captain is not within arrival radius")
				return
			}
		}
	}

	assignment, err := dispatch.UpdateDeliveryStatusGovernedIdempotent(
		s.db,
		assignmentID,
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
