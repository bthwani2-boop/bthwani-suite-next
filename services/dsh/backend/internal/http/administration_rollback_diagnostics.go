package http

import (
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleRequestDecisionRollback(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRollbackRequest)
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	request, err := administration.RequestDecisionRollback(
		r.Context(), s.db, r.PathValue("approvalId"), actor.ID, body.Reason,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"request": request})
}

func (s *protectedStoreServer) handleListRollbackRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRollbackApprove)
	if !ok {
		return
	}
	requests, err := administration.ListRollbackRequests(
		r.Context(), s.db, r.URL.Query().Get("status"), 100,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (s *protectedStoreServer) handleReviewDecisionRollback(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRollbackApprove)
	if !ok {
		return
	}
	var body struct {
		Decision        string `json:"decision"`
		ReviewNote      string `json:"reviewNote"`
		ExpectedVersion int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	request, assignment, err := administration.ReviewDecisionRollback(
		r.Context(), s.db, r.PathValue("requestId"), actor.ID,
		body.Decision, body.ReviewNote, body.ExpectedVersion,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"request":    request,
		"assignment": assignment,
	})
}

func (s *protectedStoreServer) handleAdministrationDiagnostics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionDiagnosticsRead)
	if !ok {
		return
	}
	diagnostics, err := administration.GetAdministrationDiagnostics(r.Context(), s.db)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"diagnostics": diagnostics})
}
