package http

import (
	"encoding/json"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

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
	req, err := administration.CreateRoleDefinitionRequest(r.Context(), s.db, actor.ID, params)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create request")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"request": req})
}

// GET /dsh/operator/admin/role-requests
func (s *protectedStoreServer) handleListRoleRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
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
	req, role, err := administration.ReviewRoleDefinitionRequest(r.Context(), s.db, actor.ID, reqID, params)
	if err != nil {
		if err == administration.ErrNotFound {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "request not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
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
	approval, err := administration.CreateRoleAssignmentApproval(r.Context(), s.db, actor.ID, staffID, params)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create role assignment approval")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"approval": approval})
}

// GET /dsh/operator/admin/approvals
func (s *protectedStoreServer) handleListRoleAssignmentApprovals(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
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
	approval, err := administration.ReviewRoleAssignmentApproval(r.Context(), s.db, actor.ID, approvalID, params)
	if err != nil {
		if err == administration.ErrNotFound {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "approval not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"approval":   approval,
		"assignment": nil,
	})
}

// GET /dsh/operator/admin/staff
func (s *protectedStoreServer) handleListStaff(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"staff": []interface{}{}})
}

// GET /dsh/operator/admin/diagnostics
func (s *protectedStoreServer) handleGetDiagnostics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.diagnostics.read")
	if !ok {
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"diagnostics": map[string]interface{}{
			"status": "healthy",
			"details": "Admin governance running securely.",
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
		if err == administration.ErrNotFound {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "approval not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create rollback request")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"request": req})
}

// GET /dsh/operator/admin/rollback-requests
func (s *protectedStoreServer) handleListRollbackRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
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
	req, err := administration.ReviewRollbackRequest(r.Context(), s.db, actor.ID, reqID, params)
	if err != nil {
		if err == administration.ErrNotFound {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "request not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{
		"request":    req,
		"assignment": nil,
	})
}
