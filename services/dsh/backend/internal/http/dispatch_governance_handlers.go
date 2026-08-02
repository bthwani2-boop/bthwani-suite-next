package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) handleCreateGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		OrderID                string `json:"orderId"`
		CaptainID              string `json:"captainId"`
		ServiceAreaCode        string `json:"serviceAreaCode"`
		IdempotencyKey         string `json:"idempotencyKey"`
		Priority               int    `json:"priority"`
		DistanceMeters         *int   `json:"distanceMeters"`
		OfferReason            string `json:"offerReason"`
		ResponseTimeoutSeconds int    `json:"responseTimeoutSeconds"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	financialEligibility, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, body.CaptainID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	if !financialEligibility.Eligible {
		store.SendError(w, http.StatusConflict, financialEligibility.IneligibilityReason, "captain does not meet the WLT-backed dispatch balance requirement")
		return
	}
	idempotencyKey := strings.TrimSpace(body.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	}
	assignment, replayed, err := dispatch.CreateGovernedAssignment(s.db, dispatch.GovernedCreateAssignmentInput{
		OrderID: body.OrderID, OperatorContextID: operatorContextID, CaptainID: body.CaptainID,
		ActorID: actor.ID, ServiceAreaCode: body.ServiceAreaCode, IdempotencyKey: idempotencyKey,
		Priority: body.Priority, DistanceMeters: body.DistanceMeters, OfferReason: body.OfferReason,
		ResponseTimeoutSecond: body.ResponseTimeoutSeconds,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	status := http.StatusCreated
	if replayed {
		status = http.StatusOK
	}
	store.SendJSON(w, status, map[string]any{"assignment": payload, "replayed": replayed})
}

func (s *protectedStoreServer) handleListGovernedOperatorDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	operatorContextID := r.URL.Query().Get("operatorContextId")
	if _, err := dispatch.ExpireOverdueAssignments(s.db, operatorContextID, actor.ID, 100); err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	list, err := dispatch.ListOperatorAssignmentsInOperatorContext(s.db, operatorContextID, 200)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignments(list)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": payload})
}

func (s *protectedStoreServer) handleListGovernedCaptainDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	operatorContextID := r.URL.Query().Get("operatorContextId")
	if _, err := dispatch.ExpireOverdueAssignments(s.db, operatorContextID, "dispatch-captain-inbox", 100); err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	list, err := dispatch.ListCaptainAssignmentsInOperatorContext(s.db, operatorContextID, actor.ID, 100)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignments(list)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": payload})
}

func (s *protectedStoreServer) handleAcceptGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OperatorContext_REQUIRED", "captain OperatorContext context is required")
		return
	}
	financialEligibility, err := s.refreshCaptainFinancialEligibility(r, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	if !financialEligibility.Eligible {
		store.SendError(w, http.StatusConflict, financialEligibility.IneligibilityReason, "captain does not meet the WLT-backed dispatch balance requirement")
		return
	}
	assignment, err := dispatch.AcceptGovernedAssignment(s.db, r.PathValue("assignmentId"), actor.ID)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleDeclineGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		ReasonCode string `json:"reasonCode"`
		Reason     string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignment, err := dispatch.DeclineGovernedAssignment(
		s.db, r.PathValue("assignmentId"), actor.ID, body.ReasonCode, body.Reason,
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleUpsertCaptainDispatchProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		AccreditationStatus  string `json:"accreditationStatus"`
		AvailabilityStatus   string `json:"availabilityStatus"`
		MaxActiveAssignments int    `json:"maxActiveAssignments"`
		PriorityScore        int    `json:"priorityScore"`
		ExpectedVersion      int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	candidate, err := dispatch.UpsertCaptainDispatchProfile(s.db, dispatch.CaptainDispatchProfileInput{
		OperatorContextID: operatorContextID, CaptainID: r.PathValue("captainId"),
		AccreditationStatus: body.AccreditationStatus, AvailabilityStatus: body.AvailabilityStatus,
		MaxActiveAssignments: body.MaxActiveAssignments, PriorityScore: body.PriorityScore,
		ExpectedVersion: body.ExpectedVersion, ActorID: actor.ID,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	financial, financialErr := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, operatorContextID, r.PathValue("captainId"))
	if financialErr != nil || !financial.Eligible || !financial.ExpiresAt.After(time.Now()) {
		candidate.Eligible = false
		candidate.IneligibilityReason = "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"
		if financialErr == nil && financial.IneligibilityReason != "" {
			candidate.IneligibilityReason = financial.IneligibilityReason
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"candidate": candidate})
}

func (s *protectedStoreServer) handleListCaptainDispatchCandidates(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	operatorContextID := r.URL.Query().Get("operatorContextId")
	limit := parseDispatchLimit(r.URL.Query().Get("limit"), 100)
	items, err := dispatch.ListCaptainDispatchCandidates(
		s.db, operatorContextID, r.URL.Query().Get("serviceAreaCode"), limit,
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	now := time.Now()
	for index := range items {
		financial, financialErr := dispatch.GetCaptainFinancialEligibilitySnapshot(r.Context(), s.db, operatorContextID, items[index].CaptainID)
		if financialErr != nil || !financial.Eligible || !financial.ExpiresAt.After(now) {
			items[index].Eligible = false
			items[index].IneligibilityReason = "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"
			if financialErr == nil && financial.IneligibilityReason != "" {
				items[index].IneligibilityReason = financial.IneligibilityReason
			}
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"candidates": items})
}

func (s *protectedStoreServer) handleReassignGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		CaptainID              string `json:"captainId"`
		ServiceAreaCode        string `json:"serviceAreaCode"`
		IdempotencyKey         string `json:"idempotencyKey"`
		Priority               int    `json:"priority"`
		DistanceMeters         *int   `json:"distanceMeters"`
		Reason                 string `json:"reason"`
		ResponseTimeoutSeconds int    `json:"responseTimeoutSeconds"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	financialEligibility, err := s.refreshCaptainFinancialEligibility(r, operatorContextID, body.CaptainID)
	if err != nil {
		writeCaptainFinancialEligibilityError(w, err)
		return
	}
	if !financialEligibility.Eligible {
		store.SendError(w, http.StatusConflict, financialEligibility.IneligibilityReason, "captain does not meet the WLT-backed dispatch balance requirement")
		return
	}
	idempotencyKey := strings.TrimSpace(body.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	}
	assignment, err := dispatch.ReassignGovernedAssignment(s.db, dispatch.ReassignAssignmentInput{
		AssignmentID: r.PathValue("assignmentId"), OperatorContextID: operatorContextID,
		CaptainID: body.CaptainID, ActorID: actor.ID, ServiceAreaCode: body.ServiceAreaCode,
		IdempotencyKey: idempotencyKey, Priority: body.Priority, DistanceMeters: body.DistanceMeters,
		Reason: body.Reason, ResponseTimeoutSecond: body.ResponseTimeoutSeconds,
	})
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	payload, err := s.marshalGovernedDispatchAssignment(assignment)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"assignment": payload})
}

func (s *protectedStoreServer) handleCancelGovernedDispatchAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		ReasonCode string `json:"reasonCode"`
		Reason     string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if err := dispatch.CancelGovernedAssignment(
		s.db, r.PathValue("assignmentId"), actor.ID, body.ReasonCode, body.Reason,
	); err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleExpireGovernedDispatchAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Limit    int    `json:"limit"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	operatorContextID, ok := wlt.OperatorContextIDFromContext(r.Context())
	if !ok {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorContextId is required in context")
		return
	}
	count, err := dispatch.ExpireOverdueAssignments(s.db, operatorContextID, actor.ID, body.Limit)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"expiredCount": count})
}

func (s *protectedStoreServer) handleListDispatchDecisions(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator")
	if !ok {
		return
	}
	items, err := dispatch.ListDispatchDecisions(
		s.db, r.URL.Query().Get("operatorContextId"), r.URL.Query().Get("assignmentId"),
		r.URL.Query().Get("orderId"), parseDispatchLimit(r.URL.Query().Get("limit"), 100),
	)
	if err != nil {
		writeGovernedDispatchError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"decisions": items})
}

func (s *protectedStoreServer) marshalGovernedDispatchAssignment(item *dispatch.Assignment) (map[string]any, error) {
	payload := marshalDispatchAssignment(*item)
	governance, err := dispatch.GetAssignmentGovernance(s.db, item.ID)
	if err != nil {
		return nil, err
	}
	payload["operatorContextId"] = governance.OperatorContextID
	payload["serviceAreaCode"] = governance.ServiceAreaCode
	payload["priority"] = governance.Priority
	payload["distanceMeters"] = governance.DistanceMeters
	payload["offerReason"] = governance.OfferReason
	payload["responseReason"] = governance.ResponseReason
	payload["expiredAt"] = governance.ExpiredAt
	payload["cancelledAt"] = governance.CancelledAt
	payload["cancelledBy"] = governance.CancelledBy
	payload["supersedesAssignmentId"] = governance.SupersedesAssignmentID
	payload["version"] = governance.Version
	return payload, nil
}

func (s *protectedStoreServer) marshalGovernedDispatchAssignments(items []dispatch.Assignment) ([]map[string]any, error) {
	ids := make([]string, len(items))
	for i := range items {
		ids[i] = items[i].ID
	}
	governance, err := dispatch.ListAssignmentGovernance(s.db, ids)
	if err != nil {
		return nil, err
	}
	payload := make([]map[string]any, len(items))
	for i := range items {
		row := marshalDispatchAssignment(items[i])
		meta, ok := governance[items[i].ID]
		if !ok {
			return nil, errors.New("dispatch assignment governance readback missing")
		}
		row["operatorContextId"] = meta.OperatorContextID
		row["serviceAreaCode"] = meta.ServiceAreaCode
		row["priority"] = meta.Priority
		row["distanceMeters"] = meta.DistanceMeters
		row["offerReason"] = meta.OfferReason
		row["responseReason"] = meta.ResponseReason
		row["expiredAt"] = meta.ExpiredAt
		row["cancelledAt"] = meta.CancelledAt
		row["cancelledBy"] = meta.CancelledBy
		row["supersedesAssignmentId"] = meta.SupersedesAssignmentID
		row["version"] = meta.Version
		payload[i] = row
	}
	return payload, nil
}

func parseDispatchLimit(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	if value > 500 {
		return 500
	}
	return value
}

func writeGovernedDispatchError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, dispatch.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "DISPATCH_NOT_FOUND", err.Error())
	case errors.Is(err, dispatch.ErrCaptainNotEligible) || strings.Contains(err.Error(), "CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED"):
		store.SendError(w, http.StatusConflict, "CAPTAIN_NOT_ELIGIBLE", err.Error())
	case errors.Is(err, dispatch.ErrCaptainAtCapacity):
		store.SendError(w, http.StatusConflict, "CAPTAIN_AT_CAPACITY", err.Error())
	case errors.Is(err, dispatch.ErrOfferExpired):
		store.SendError(w, http.StatusConflict, "DISPATCH_OFFER_EXPIRED", err.Error())
	case errors.Is(err, dispatch.ErrConflict):
		store.SendError(w, http.StatusConflict, "DISPATCH_CONFLICT", err.Error())
	case errors.Is(err, dispatch.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "dispatch operation failed")
	}
}
