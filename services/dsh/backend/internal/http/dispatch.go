package http

import (
	"errors"
	"net/http"

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
		"captainId":          a.CaptainID,
		"assignedBy":         a.AssignedBy,
		"status":             string(a.Status),
		"responseDeadlineAt": a.ResponseDeadlineAt,
		"acceptedAt":         a.AcceptedAt,
		"declinedAt":         a.DeclinedAt,
		"completedAt":        a.CompletedAt,
		"createdAt":          a.CreatedAt,
		"updatedAt":          a.UpdatedAt,
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
