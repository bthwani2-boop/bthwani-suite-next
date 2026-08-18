package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/fieldassignment"
	"dsh-api/internal/partner"
	"dsh-api/internal/store"
	"dsh-api/internal/workforceclient"
)

func (s *protectedStoreServer) ensureActiveField(w http.ResponseWriter, r *http.Request, actorID, operatorContextID string) bool {
	if s.workforce == nil || !s.workforce.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WORKFORCE_UNAVAILABLE", "field workforce authority is unavailable")
		return false
	}
	if err := s.workforce.VerifyActorInOperatorContext(r.Context(), actorID, operatorContextID, "field"); err != nil {
		if errors.Is(err, workforceclient.ErrActorContextForbidden) {
			store.SendError(w, http.StatusForbidden, "FIELD_ACTOR_FORBIDDEN", "the selected field worker is outside the operator context")
		} else {
			store.SendError(w, http.StatusServiceUnavailable, "WORKFORCE_UNAVAILABLE", "field workforce authority is unavailable")
		}
		return false
	}
	readiness, err := s.workforce.FieldActivationReadiness(r.Context(), strings.TrimSpace(actorID))
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "WORKFORCE_UNAVAILABLE", "field workforce readiness is unavailable")
		return false
	}
	if !readiness.IsActive {
		store.SendError(w, http.StatusForbidden, "FIELD_NOT_ACTIVE", "the selected field worker is not active")
		return false
	}
	return true
}

func writeFieldAssignmentError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, fieldassignment.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, fieldassignment.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "field onboarding assignment not found")
	case errors.Is(err, fieldassignment.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "assignment is outside the actor scope")
	case errors.Is(err, fieldassignment.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "assignment changed; reload before retrying")
	case errors.Is(err, fieldassignment.ErrInvalidTransition):
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", "assignment state does not allow this action")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "field onboarding assignment failed")
	}
}

func (s *protectedStoreServer) handleCreateFieldOnboardingAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionManage)
	if !ok {
		return
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return
	}
	var input fieldassignment.CreateInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if !s.ensureActiveField(w, r, input.FieldActorID, actor.OperatorContextID) {
		return
	}
	item, err := fieldassignment.Create(r.Context(), s.db, actor.OperatorContextID, actor.ID, input)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"assignment": item})
}

func (s *protectedStoreServer) handleListOperatorFieldOnboardingAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead)
	if !ok {
		return
	}
	items, err := fieldassignment.ListForOperator(r.Context(), s.db, actor.OperatorContextID)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": items})
}

func (s *protectedStoreServer) handleReassignFieldOnboardingAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionManage)
	if !ok {
		return
	}
	var input fieldassignment.ReassignInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if !s.ensureActiveField(w, r, input.FieldActorID, actor.OperatorContextID) {
		return
	}
	item, err := fieldassignment.Reassign(r.Context(), s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID, input)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item})
}

func (s *protectedStoreServer) handleCancelFieldOnboardingAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionManage)
	if !ok {
		return
	}
	var input fieldassignment.TransitionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	item, err := fieldassignment.Cancel(r.Context(), s.db, actor.OperatorContextID, r.PathValue("assignmentId"), actor.ID, input)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item})
}

func (s *protectedStoreServer) fieldAssignmentActor(w http.ResponseWriter, r *http.Request) (store.StoreActor, bool) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return store.StoreActor{}, false
	}
	if strings.TrimSpace(actor.OperatorContextID) == "" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "trusted OperatorContext context is required")
		return store.StoreActor{}, false
	}
	if !s.ensureActiveField(w, r, actor.ID, actor.OperatorContextID) {
		return store.StoreActor{}, false
	}
	return actor, true
}

func (s *protectedStoreServer) handleListFieldOnboardingAssignments(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.fieldAssignmentActor(w, r)
	if !ok {
		return
	}
	items, err := fieldassignment.ListForField(r.Context(), s.db, actor.OperatorContextID, actor.ID)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignments": items})
}

func (s *protectedStoreServer) getFieldAssignmentForActor(w http.ResponseWriter, r *http.Request) (store.StoreActor, fieldassignment.Assignment, bool) {
	actor, ok := s.fieldAssignmentActor(w, r)
	if !ok {
		return store.StoreActor{}, fieldassignment.Assignment{}, false
	}
	item, err := fieldassignment.Get(r.Context(), s.db, actor.OperatorContextID, r.PathValue("assignmentId"))
	if errors.Is(err, fieldassignment.ErrNotFound) || (err == nil && item.FieldActorID != actor.ID) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "field onboarding assignment not found")
		return store.StoreActor{}, fieldassignment.Assignment{}, false
	}
	if err != nil {
		writeFieldAssignmentError(w, err)
		return store.StoreActor{}, fieldassignment.Assignment{}, false
	}
	return actor, item, true
}

func (s *protectedStoreServer) handleGetFieldOnboardingAssignment(w http.ResponseWriter, r *http.Request) {
	_, item, ok := s.getFieldAssignmentForActor(w, r)
	if !ok {
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item})
}

func (s *protectedStoreServer) handleOpenFieldOnboardingAssignment(w http.ResponseWriter, r *http.Request) {
	actor, item, ok := s.getFieldAssignmentForActor(w, r)
	if !ok {
		return
	}
	var input fieldassignment.TransitionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	if item.Status == fieldassignment.StatusInProgress || item.Status == fieldassignment.StatusDraftLinked {
		store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item, "replayed": true})
		return
	}
	updated, err := fieldassignment.Open(r.Context(), s.db, actor.OperatorContextID, item.ID, actor.ID, input)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": updated})
}

func (s *protectedStoreServer) handleConvertFieldOnboardingAssignmentToDraft(w http.ResponseWriter, r *http.Request) {
	actor, item, ok := s.getFieldAssignmentForActor(w, r)
	if !ok {
		return
	}
	if item.Status == fieldassignment.StatusDraftLinked && item.DraftPartnerID != "" {
		store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item, "replayed": true})
		return
	}
	if item.Status != fieldassignment.StatusInProgress {
		writeFieldAssignmentError(w, fieldassignment.ErrInvalidTransition)
		return
	}
	var input partner.CreatePartnerInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.CreatedByActorID = actor.ID
	input.CreatedBySurface = "app-field"
	created, replayed, err := partner.CreatePartnerForOperatorContextIdempotent(
		r.Context(), s.db, actor.OperatorContextID, r.Header.Get("Idempotency-Key"), r.Header.Get("X-Correlation-ID"), input)
	if err != nil {
		if errors.Is(err, partner.ErrPartnerCreationIdempotencyRequired) {
			store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", err.Error())
			return
		}
		if errors.Is(err, partner.ErrIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "draft request was already used with different data")
			return
		}
		if errors.Is(err, partner.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if errors.Is(err, partner.ErrConflict) {
			store.SendError(w, http.StatusConflict, "CONFLICT", "draft conflicts with an existing partner")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create onboarding draft")
		return
	}
	updated, err := fieldassignment.LinkDraft(r.Context(), s.db, actor.OperatorContextID, item.ID, actor.ID, created.ID)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	if replayed {
		w.Header().Set("Idempotent-Replayed", "true")
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"assignment": updated, "draft": created})
}

func (s *protectedStoreServer) handleLinkFieldOnboardingAssignmentDraft(w http.ResponseWriter, r *http.Request) {
	actor, item, ok := s.getFieldAssignmentForActor(w, r)
	if !ok {
		return
	}
	partnerID := r.PathValue("partnerId")
	owned, err := partner.GetPartnerForOperatorContext(s.db, actor.OperatorContextID, partnerID)
	if errors.Is(err, partner.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "draft not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to verify draft ownership")
		return
	}
	if owned.CreatedByActorID != actor.ID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "draft is outside the assignment owner scope")
		return
	}
	if item.Status == fieldassignment.StatusDraftLinked && item.DraftPartnerID == partnerID {
		store.SendJSON(w, http.StatusOK, map[string]any{"assignment": item, "replayed": true})
		return
	}
	if item.Status != fieldassignment.StatusInProgress {
		writeFieldAssignmentError(w, fieldassignment.ErrInvalidTransition)
		return
	}
	updated, err := fieldassignment.LinkDraft(r.Context(), s.db, actor.OperatorContextID, item.ID, actor.ID, partnerID)
	if err != nil {
		writeFieldAssignmentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": updated})
}
