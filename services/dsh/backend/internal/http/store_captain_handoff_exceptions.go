package http

import (
	"net/http"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

type storeCaptainHandoffExceptionBody struct {
	ReasonCode    dispatch.DeliveryExceptionReasonCode `json:"reasonCode"`
	Note          string                               `json:"note"`
	CorrelationID string                               `json:"correlationId"`
	Latitude      *float64                             `json:"latitude"`
	Longitude     *float64                             `json:"longitude"`
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/handoff-exceptions
func (s *protectedStoreServer) handleReportCaptainStoreCaptainHandoffException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}

	var body storeCaptainHandoffExceptionBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	item, err := dispatch.ReportCaptainStoreCaptainHandoffException(
		s.db,
		r.PathValue("assignmentId"),
		actor.ID,
		dispatch.ReportDeliveryExceptionInput{
			ReasonCode:    body.ReasonCode,
			Note:          body.Note,
			CorrelationID: operationalCorrelationID(r, body.CorrelationID),
			Latitude:      body.Latitude,
			Longitude:     body.Longitude,
		},
	)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/partner/orders/{orderId}/captain-handoff/exceptions
func (s *protectedStoreServer) handleReportPartnerStoreCaptainHandoffException(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}

	var body storeCaptainHandoffExceptionBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	item, err := dispatch.ReportPartnerStoreCaptainHandoffException(
		s.db,
		r.PathValue("orderId"),
		storeID,
		actor.ID,
		dispatch.ReportDeliveryExceptionInput{
			ReasonCode:    body.ReasonCode,
			Note:          body.Note,
			CorrelationID: operationalCorrelationID(r, body.CorrelationID),
			Latitude:      body.Latitude,
			Longitude:     body.Longitude,
		},
	)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}

	store.SendJSON(w, http.StatusCreated, map[string]any{"exception": marshalDeliveryException(item)})
}
