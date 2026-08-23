package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

// writeAdministrationReviewError maps administration review errors to
// contract-compatible status codes instead of collapsing every failure into
// a generic 500. Domain validation failures are client errors (400/409);
// only genuine internal or upstream failures return 500, and never with a
// raw internal error string in the response body.
func writeAdministrationReviewError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, administration.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "request not found")
	case errors.Is(err, administration.ErrIdentityUnavailable):
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
	case errors.Is(err, administration.ErrCanonicalMutationFailed):
		store.SendError(w, http.StatusConflict, "CANONICAL_MUTATION_FAILED", "the canonical authorization mutation was rejected; the request remains pending")
	case errors.Is(err, administration.ErrSeparationOfDuties):
		store.SendError(w, http.StatusBadRequest, "SEPARATION_OF_DUTIES_VIOLATION", "maker, beneficiary, and checker must be independent")
	case errors.Is(err, administration.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request is invalid")
	case err.Error() == "request is not pending" || err.Error() == "version conflict":
		store.SendError(w, http.StatusConflict, "REQUEST_STATE_CONFLICT", err.Error())
	case err.Error() == "invalid decision" || err.Error() == "cannot review own request" ||
		err.Error() == "unsupported action type" || err.Error() == "unsupported inverse action type":
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "review request failed")
	}
}

// writeAdministrationCreateError maps administration create-request errors
// to contract-compatible status codes. Domain validation is a client error
// (400/404/409); only a genuine internal failure returns 500.
func writeAdministrationCreateError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, administration.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "referenced approval was not found")
	case errors.Is(err, administration.ErrIdentityUnavailable):
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
	case errors.Is(err, administration.ErrConflict):
		store.SendError(w, http.StatusConflict, "REQUEST_STATE_CONFLICT", "another role change for this actor and role is already pending")
	case errors.Is(err, administration.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request is invalid")
	case err.Error() == "only approved requests can be rolled back":
		store.SendError(w, http.StatusConflict, "REQUEST_STATE_CONFLICT", err.Error())
	case err.Error() == "invalid role name length" || err.Error() == "reason too short" ||
		err.Error() == "invalid action type" || err.Error() == "cannot request role assignment for yourself" ||
		err.Error() == "cannot request rollback for yourself":
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "request could not be created")
	}
}

// POST /dsh/operator/admin/roles/requests
func (s *protectedStoreServer) handleCreateRoleRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.role.request")
	if !ok {
		return
	}
	var params administration.CreateRoleDefinitionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	req, err := administration.CreateRoleDefinitionRequest(r.Context(), s.db, s.identity, actor.ID, params)
	if err != nil {
		writeAdministrationCreateError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"request": req})
}

// GET /dsh/operator/admin/role-requests
func (s *protectedStoreServer) handleListRoleRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.role.approve")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	requests, err := administration.ListRoleDefinitionRequests(r.Context(), s.db, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list role requests")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"requests": requests})
}

// POST /dsh/operator/admin/role-requests/{requestId}/review
func (s *protectedStoreServer) handleReviewRoleRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.role.approve")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var params administration.ReviewDecisionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	req, role, err := administration.ReviewRoleDefinitionRequest(r.Context(), s.db, s.identity, actor.ID, reqID, params)
	if err != nil {
		writeAdministrationReviewError(w, err)
		return
	}
	out := map[string]interface{}{"request": req}
	if role != nil {
		out["role"] = role
	}
	store.SendJSON(w, http.StatusOK, out)
}

// POST /dsh/operator/admin/staff/{staffId}/roles
func (s *protectedStoreServer) handleCreateRoleAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.staff.request")
	if !ok {
		return
	}
	staffID := r.PathValue("staffId")
	var params administration.CreateRoleAssignmentParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	approval, err := administration.CreateRoleAssignmentApproval(r.Context(), s.db, s.identity, actor.ID, staffID, params)
	if err != nil {
		writeAdministrationCreateError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"approval": approval})
}

// GET /dsh/operator/admin/approvals
func (s *protectedStoreServer) handleListRoleAssignmentApprovals(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.staff.approve")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	approvals, err := administration.ListRoleAssignmentApprovals(r.Context(), s.db, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list role assignment approvals")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"approvals": approvals})
}

// POST /dsh/operator/admin/approvals/{approvalId}/review
func (s *protectedStoreServer) handleReviewRoleAssignmentApproval(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.staff.approve")
	if !ok {
		return
	}
	approvalID := r.PathValue("approvalId")
	var params administration.ReviewDecisionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	approval, assignment, err := administration.ReviewRoleAssignmentApproval(r.Context(), s.db, s.identity, actor.ID, approvalID, params)
	if err != nil {
		writeAdministrationReviewError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"approval":   approval,
		"assignment": assignment,
	})
}

// GET /dsh/operator/admin/staff
func (s *protectedStoreServer) handleListStaff(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.staff.read")
	if !ok {
		return
	}
	if s.identity == nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return
	}
	staff, err := s.identity.ListStaff(r.Context())
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return
	}
	members := make([]map[string]interface{}, 0, len(staff))
	for _, actor := range staff {
		members = append(members, map[string]interface{}{
			"id":        actor.ID,
			"actorId":   actor.ID,
			"username":  actor.Username,
			"roles":     actor.Roles,
			"createdAt": actor.GrantedAt,
		})
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"staff": members, "total": len(members)})
}

// GET /dsh/operator/admin/diagnostics
func (s *protectedStoreServer) handleGetDiagnostics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.diagnostics.read")
	if !ok {
		return
	}
	status := "healthy"
	details := "Admin governance database and Identity RBAC registry are reachable."

	if err := s.db.PingContext(r.Context()); err != nil {
		status = "unhealthy"
		details = "Administration database is unreachable."
	} else if s.identity == nil {
		status = "degraded"
		details = "Identity RBAC client is not configured."
	} else if _, err := s.identity.ListRoles(r.Context()); err != nil {
		status = "degraded"
		details = "Identity RBAC registry is unreachable."
	}

	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"diagnostics": map[string]interface{}{
			"status":  status,
			"details": details,
		},
	})
}

// POST /dsh/operator/admin/approvals/{approvalId}/rollback-requests
func (s *protectedStoreServer) handleCreateRollbackRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.rollback.request")
	if !ok {
		return
	}
	approvalID := r.PathValue("approvalId")
	var params administration.CreateRollbackRequestParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	req, err := administration.CreateRollbackRequest(r.Context(), s.db, actor.ID, approvalID, params)
	if err != nil {
		writeAdministrationCreateError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"request": req})
}

// GET /dsh/operator/admin/rollback-requests
func (s *protectedStoreServer) handleListRollbackRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.rollback.approve")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	requests, err := administration.ListRollbackRequests(r.Context(), s.db, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list rollback requests")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"requests": requests})
}

// POST /dsh/operator/admin/rollback-requests/{requestId}/review
func (s *protectedStoreServer) handleReviewRollbackRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, "administration.rollback.approve")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var params administration.ReviewDecisionParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json body")
		return
	}
	req, err := administration.ReviewRollbackRequest(r.Context(), s.db, s.identity, actor.ID, reqID, params)
	if err != nil {
		writeAdministrationReviewError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"request": req,
	})
}
