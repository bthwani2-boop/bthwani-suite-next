package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/fieldreadiness"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetChecklistPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	policy, err := fieldreadiness.ListChecklistPolicy(
		r.Context(), s.db, actor.OperatorContextID, r.PathValue("businessVerticalId"),
	)
	if err != nil {
		s.writeChecklistPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleReplaceChecklistPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int                                  `json:"expectedVersion"`
		Items           []fieldreadiness.ChecklistPolicyItem `json:"items"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	policy, err := fieldreadiness.ReplaceChecklistPolicy(
		r.Context(), s.db, actor.OperatorContextID, r.PathValue("businessVerticalId"),
		actor.ID, body.ExpectedVersion, body.Items,
	)
	if err != nil {
		s.writeChecklistPolicyError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) writeChecklistPolicyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, fieldreadiness.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "CHECKLIST_POLICY_NOT_FOUND", "checklist policy is not configured for this business vertical")
	case errors.Is(err, fieldreadiness.ErrConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "checklist policy changed; reload before saving")
	case errors.Is(err, fieldreadiness.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "trusted operator context is required")
	case errors.Is(err, fieldreadiness.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", strings.TrimPrefix(err.Error(), fieldreadiness.ErrInvalid.Error()+": "))
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "checklist policy operation failed")
	}
}
