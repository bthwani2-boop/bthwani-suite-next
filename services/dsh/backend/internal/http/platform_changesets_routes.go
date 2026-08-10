package http

import (
	"encoding/json"
	"net/http"

	"dsh-api/internal/store"
)

type createChangeSetInput struct {
	TargetType  string          `json:"targetType"`
	TargetID    string          `json:"targetId"`
	BaseVersion int             `json:"baseVersion"`
	Payload     json.RawMessage `json:"payload"`
}

func (s *protectedStoreServer) handleCreateChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage")
	if !ok {
		return
	}
	var input createChangeSetInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	cs, err := s.changeSets.Create(r.Context(), input.TargetType, input.TargetID, input.BaseVersion, input.Payload, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusCreated, cs)
}

func (s *protectedStoreServer) handleSubmitChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage")
	if !ok {
		return
	}
	_ = actor // just need permission
	err := s.changeSets.SubmitForReview(r.Context(), r.PathValue("changesetId"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]string{"status": "REVIEW"})
}

func (s *protectedStoreServer) handleApproveChangeSet(w http.ResponseWriter, r *http.Request) {
	// Approval requires separate explicit permission
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.approve")
	if !ok {
		return
	}
	err := s.changeSets.Approve(r.Context(), r.PathValue("changesetId"), actor.ID)
	if err != nil {
		store.SendError(w, http.StatusForbidden, "SEPARATION_OF_DUTIES", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]string{"status": "APPROVED"})
}

func (s *protectedStoreServer) handleApplyChangeSet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "platform.manage")
	if !ok {
		return
	}
	err := s.changeSets.Apply(r.Context(), r.PathValue("changesetId"), actor.ID)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	// TODO: Actually emit event or apply the payload depending on targetType.

	store.SendJSON(w, http.StatusOK, map[string]string{"status": "APPLIED"})
}

func (s *protectedStoreServer) handleRejectChangeSet(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "platform.manage")
	if !ok {
		return
	}
	err := s.changeSets.Reject(r.Context(), r.PathValue("changesetId"))
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]string{"status": "FAILED"})
}

func (s *protectedStoreServer) handleGetChangeSet(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", "platform.read")
	if !ok {
		return
	}
	cs, err := s.changeSets.Get(r.Context(), r.PathValue("changesetId"))
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "changeset not found")
		return
	}
	store.SendJSON(w, http.StatusOK, cs)
}
