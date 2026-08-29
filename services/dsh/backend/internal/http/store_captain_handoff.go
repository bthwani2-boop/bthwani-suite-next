package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

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
	idempotencyKey, correlationID, ok := requireCaptainCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
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

	if body.ExpectedVersion < 1 {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "version must be a positive integer")
		return
	}

	// Geofence enforcement (J066)
	if body.Status == dispatch.DeliveryArrivedStore || body.Status == dispatch.DeliveryArrivedCustomer {
		if body.Latitude == nil || body.Longitude == nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "latitude and longitude required for arrival")
			return
		}
		var sLat, sLng, cLat, cLng sql.NullFloat64
		err := s.db.QueryRowContext(r.Context(), `
		SELECT s.latitude, s.longitude,
			       NULLIF(o.delivery_address_snapshot->>'latitude', '')::float8,
			       NULLIF(o.delivery_address_snapshot->>'longitude', '')::float8
			FROM dsh_assignments a
			JOIN dsh_orders o ON o.id = a.order_id
			JOIN dsh_stores s ON s.id = o.store_id
			WHERE a.id = $1::uuid AND a.operator_context_id = $2
		`, assignmentID, actor.OperatorContextID).Scan(&sLat, &sLng, &cLat, &cLng)
		if errors.Is(err, sql.ErrNoRows) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "assignment or order location was not found")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "arrival geofence could not be verified")
			return
		}
		if !sLat.Valid || !sLng.Valid || !cLat.Valid || !cLng.Valid {
			store.SendError(w, http.StatusUnprocessableEntity, "GEOFENCE_UNAVAILABLE", "server location data is required for arrival")
			return
		}
		var dist float64
		if body.Status == dispatch.DeliveryArrivedStore {
			dist = distanceMeters(*body.Latitude, *body.Longitude, sLat.Float64, sLng.Float64)
		} else {
			dist = distanceMeters(*body.Latitude, *body.Longitude, cLat.Float64, cLng.Float64)
		}
		if dist > 150.0 {
			store.SendError(w, http.StatusUnprocessableEntity, "GEOFENCE_VIOLATION", "captain is not within arrival radius")
			return
		}
	}

	assignment, err := dispatch.UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		s.db,
		actor.OperatorContextID,
		assignmentID,
		actor.ID,
		body.Status,
		body.ExpectedVersion,
		idempotencyKey,
		correlationID,
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
	if _, ok := requireStoreCaptainHandoffIdempotencyKey(w, r); !ok {
		return
	}
	item, err := dispatch.ConfirmStoreCaptainHandoffIdempotentForOperatorContext(
		s.db,
		actor.OperatorContextID,
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

func requireStoreCaptainHandoffIdempotencyKey(w http.ResponseWriter, r *http.Request) (string, bool) {
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(key) < 8 || len(key) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return "", false
	}
	return key, true
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
