package http

import (
	"errors"
	"net/http"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

// POST /dsh/operator/dispatch/assignments
func (s *protectedStoreServer) handleCreateDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		OrderID   string `json:"orderId"`
		CaptainID string `json:"captainId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.CreateAssignment(s.db, dispatch.CreateAssignmentInput{
		OrderID:   body.OrderID,
		CaptainID: body.CaptainID,
		ActorID:   actor.ID,
	})
	s.writeDispatchResult(w, http.StatusCreated, assignment, err)
}

// GET /dsh/operator/dispatch/assignments
func (s *protectedStoreServer) handleListOperatorDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	list, err := dispatch.ListOperatorAssignments(s.db, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list dispatch assignments")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": marshalDispatchAssignments(list)})
}

// GET /dsh/captain/dispatch/assignments
func (s *protectedStoreServer) handleListCaptainDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	list, err := dispatch.ListCaptainAssignments(s.db, actor.ID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list captain assignments")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": marshalDispatchAssignments(list)})
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/accept
func (s *protectedStoreServer) handleAcceptDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	assignment, err := dispatch.AcceptAssignment(s.db, r.PathValue("assignmentId"), actor.ID)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/decline
func (s *protectedStoreServer) handleDeclineDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.DeclineAssignment(s.db, r.PathValue("assignmentId"), actor.ID, body.Reason)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/status
func (s *protectedStoreServer) handleUpdateDeliveryStatus(w http.ResponseWriter, r *http.Request) {
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
	assignment, err := dispatch.UpdateDeliveryStatus(s.db, r.PathValue("assignmentId"), actor.ID, body.Status)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/pod
func (s *protectedStoreServer) handleSubmitDispatchPoD(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body dispatch.PoDInput
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.SubmitPoD(s.db, r.PathValue("assignmentId"), actor.ID, body)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

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
		Latitude   float64 `json:"latitude"`
		Longitude  float64 `json:"longitude"`
		RecordedAt string  `json:"recordedAt"`
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
	assignment, err := dispatch.PushLocation(s.db, r.PathValue("assignmentId"), actor.ID, input)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

// POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions
func (s *protectedStoreServer) handleReportDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		ReasonCode    dispatch.DeliveryExceptionReasonCode `json:"reasonCode"`
		Note          string                               `json:"note"`
		CorrelationID string                               `json:"correlationId"`
		Latitude      *float64                             `json:"latitude"`
		Longitude     *float64                             `json:"longitude"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := dispatch.ReportDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID, dispatch.ReportDeliveryExceptionInput{
		ReasonCode: body.ReasonCode, Note: body.Note,
		CorrelationID: operationalCorrelationID(r, body.CorrelationID),
		Latitude:      body.Latitude, Longitude: body.Longitude,
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
	item, err := dispatch.GetCaptainOpenDeliveryException(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/operator/delivery-exceptions
func (s *protectedStoreServer) handleListOperatorDeliveryExceptions(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	items, err := dispatch.ListOperatorDeliveryExceptions(s.db, dispatch.DeliveryExceptionStatus(r.URL.Query().Get("status")), 100)
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
		"id": item.ID, "tenantId": item.TenantID, "assignmentId": item.AssignmentID,
		"orderId": item.OrderID, "captainId": item.CaptainID,
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
	}
}

// POST /dsh/operator/delivery-exceptions/{exceptionId}/acknowledge
func (s *protectedStoreServer) handleAcknowledgeDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	item, err := dispatch.AcknowledgeDeliveryException(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// POST /dsh/operator/delivery-exceptions/{exceptionId}/resolve
func (s *protectedStoreServer) handleResolveDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
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
		item, err = dispatch.ResolveDeliveryExceptionRetrySameCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)
	case "reassign_captain":
		item, err = dispatch.ResolveDeliveryExceptionReassignCaptain(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.NewCaptainID, body.Note, actor.ID)
	case "return_to_store":
		item, err = dispatch.ResolveDeliveryExceptionReturnToStore(s.db, r.PathValue("exceptionId"), body.ExpectedVersion, body.Note, actor.ID)
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
	item, err := dispatch.CaptainArriveReturnToStore(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

// GET /dsh/client/orders/{orderId}/tracking
func (s *protectedStoreServer) handleGetClientTracking(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	assignment, err := dispatch.GetClientTracking(s.db, r.PathValue("orderId"), actor.ID)
	s.writeDispatchResult(w, http.StatusOK, assignment, err)
}

func (s *protectedStoreServer) writeDispatchResult(w http.ResponseWriter, status int, assignment *dispatch.Assignment, err error) {
	switch {
	case err == nil:
		store.SendJSON(w, status, map[string]any{"assignment": marshalDispatchAssignment(*assignment)})
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "dispatch assignment not found")
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "CONFLICT", "dispatch transition is not allowed")
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "dispatch operation failed")
	}
}

func marshalDispatchAssignments(list []dispatch.Assignment) []map[string]any {
	out := make([]map[string]any, len(list))
	for i, item := range list {
		out[i] = marshalDispatchAssignment(item)
	}
	return out
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
