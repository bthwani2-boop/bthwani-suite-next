package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

// POST /dsh/captain/dispatch/assignments/{assignmentId}/location
//
// Foreground-only location push (register item 14 + 42): the captain app
// samples its own location every ~3 minutes while a delivery is active and
// posts it here. No background location, no history — only the latest
// point is retained, and it is purged once the assignment closes.
func (s *protectedStoreServer) handlePushDispatchLocation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		Latitude       float64  `json:"latitude"`
		Longitude      float64  `json:"longitude"`
		RecordedAt     string   `json:"recordedAt"`
		AccuracyMeters *float64 `json:"accuracyMeters"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	input := dispatch.PushLocationInput{Latitude: body.Latitude, Longitude: body.Longitude}
	if body.RecordedAt != "" {
		parsed, err := time.Parse(time.RFC3339, body.RecordedAt)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "recordedAt must be RFC3339")
			return
		}
		input.RecordedAt = &parsed
	}
	assignment, err := dispatch.PushLocationForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID, input)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions
func (s *protectedStoreServer) handleReportDeliveryException(w http.ResponseWriter, r *http.Request) {
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
		ReasonCode    dispatch.DeliveryExceptionReasonCode `json:"reasonCode"`
		Note          string                               `json:"note"`
		CorrelationID string                               `json:"correlationId"`
		Latitude      *float64                             `json:"latitude"`
		Longitude     *float64                             `json:"longitude"`
		ProofMediaRef string                               `json:"proofMediaRef"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CorrelationID != "" && strings.TrimSpace(body.CorrelationID) != correlationID {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_MISMATCH", "body correlationId must match X-Correlation-ID")
		return
	}
	item, err := dispatch.ReportDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID, dispatch.ReportDeliveryExceptionInput{
		OperatorContextID: actor.OperatorContextID,
		ReasonCode:        body.ReasonCode, Note: body.Note,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
		Latitude:       body.Latitude, Longitude: body.Longitude,
		ProofMediaRef: strings.TrimSpace(body.ProofMediaRef),
	})
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/captain/dispatch/assignments/{assignmentId}/exceptions
func (s *protectedStoreServer) handleGetCaptainDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	item, err := dispatch.GetCaptainOpenDeliveryExceptionForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/operator/delivery-exceptions
func (s *protectedStoreServer) handleListOperatorDeliveryExceptions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	items, err := dispatch.ListOperatorDeliveryExceptions(s.db, actor.OperatorContextID, dispatch.DeliveryExceptionStatus(r.URL.Query().Get("status")), 100)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for i := range items {
		out = append(out, marshalDeliveryException(&items[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exceptions": out})
}

func writeDeliveryExceptionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "delivery exception not found")
	case errors.Is(err, dispatch.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "DELIVERY_EXCEPTION_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "delivery exception operation failed")
	}
}

func marshalDeliveryException(item *dispatch.DeliveryException) map[string]any {
	return map[string]any{
		"id": item.ID, "operatorContextId": item.OperatorContextID, "assignmentId": item.AssignmentID,
		"orderId": item.OrderID, "specialRequestId": item.SpecialRequestID, "captainId": item.CaptainID,
		"reasonCode": string(item.ReasonCode), "note": item.Note,
		"deliveryStatusAtReport": string(item.DeliveryStatusAtReport),
		"severity":               string(item.Severity), "status": string(item.Status),
		"correlationId":    item.CorrelationID,
		"reportedLatitude": item.ReportedLatitude, "reportedLongitude": item.ReportedLongitude,
		"reportedAt":            item.ReportedAt,
		"acknowledgedAt":        item.AcknowledgedAt,
		"acknowledgedByActorId": item.AcknowledgedByActorID,
		"resolvedAt":            item.ResolvedAt, "resolvedByActorId": item.ResolvedByActorID,
		"resolutionAction": item.ResolutionAction, "resolutionNote": item.ResolutionNote,
		"replacementAssignmentId": item.ReplacementAssignmentID,
		"replacementCaptainId":    item.ReplacementCaptainID,
		"returnStartedAt":         item.ReturnStartedAt,
		"returnArrivedAt":         item.ReturnArrivedAt,
		"returnedAt":              item.ReturnedAt,
		"returnAcceptedByActorId": item.ReturnAcceptedByActorID,
		"version":                 item.Version, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt,
		"proofMediaRef":    item.ProofMediaRef,
		"policyNextAction": item.PolicyNextAction,
	}
}

// POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge
func (s *protectedStoreServer) handleAcknowledgeDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := dispatch.AcknowledgeDeliveryExceptionIdempotentForOperatorContext(
		s.db, actor.OperatorContextID, r.PathValue("exceptionId"), body.ExpectedVersion,
		actor.ID, idempotencyKey, correlationID,
	)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve
func (s *protectedStoreServer) handleResolveDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireOperatorCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		Action          string `json:"action"`
		Note            string `json:"note"`
		NewCaptainID    string `json:"newCaptainId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	var item *dispatch.DeliveryException
	var err error
	switch body.Action {
	case "retry_same_captain":
		item, err = dispatch.ResolveDeliveryExceptionRetrySameCaptainIdempotentForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID, idempotencyKey, correlationID)
	case "reassign_captain":
		item, err = dispatch.ResolveDeliveryExceptionReassignCaptainIdempotentForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("exceptionId"), body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID, idempotencyKey, correlationID)
	case "return_to_store":
		item, err = dispatch.ResolveDeliveryExceptionReturnToStoreIdempotentForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID, idempotencyKey, correlationID)
	case "cancel_order":
		item, err = dispatch.ResolveDeliveryExceptionCancelOrderIdempotentForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID, idempotencyKey, correlationID)
	default:
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported delivery exception resolution action")
		return
	}
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive
func (s *protectedStoreServer) handleArriveReturnToStore(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCaptainCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	item, err := dispatch.CaptainArriveReturnToStoreForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID, idempotencyKey, correlationID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

func (s *protectedStoreServer) writeDispatchResult(w http.ResponseWriter, status int, assignment *dispatch.Assignment, err error) {
	switch {
	case err == nil:
		store.SendJSON(w, status, map[string]any{"assignment": marshalDispatchAssignment(*assignment)})
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "dispatch assignment not found")
	case errors.Is(err, dispatch.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different delivery status command")
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "CONFLICT", "dispatch transition is not allowed")
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "dispatch operation failed")
	}
}

func marshalDispatchAssignment(a dispatch.Assignment) map[string]any {
	return map[string]any{
		"id":                 a.ID,
		"orderId":            a.OrderID,
		"specialRequestId":   a.SpecialRequestID,
		"requestType":        a.SpecialRequestType,
		"captainId":          a.CaptainID,
		"assignedBy":         a.AssignedBy,
		"status":             string(a.Status),
		"responseDeadlineAt": a.ResponseDeadlineAt,
		"acceptedAt":         a.AcceptedAt,
		"declinedAt":         a.DeclinedAt,
		"completedAt":        a.CompletedAt,
		"createdAt":          a.CreatedAt,
		"updatedAt":          a.UpdatedAt,
		"version":            a.Version,
		// Only the latest foreground location sample is ever retained (no
		// history, purged on closure) — see dsh-039 migration.
		"lastLatitude":       a.LastLatitude,
		"lastLongitude":      a.LastLongitude,
		"locationRecordedAt": a.LocationRecordedAt,
		"delivery": map[string]any{
			"id":           a.Delivery.ID,
			"assignmentId": a.Delivery.AssignmentID,
			"orderId":      a.Delivery.OrderID,
			"captainId":    a.Delivery.CaptainID,
			"status":       string(a.Delivery.Status),
			"podMethod":    a.Delivery.PoDMethod,
			"podReference": a.Delivery.PoDReference,
			"note":         a.Delivery.Note,
			"createdAt":    a.Delivery.CreatedAt,
			"updatedAt":    a.Delivery.UpdatedAt,
		},
	}
}
