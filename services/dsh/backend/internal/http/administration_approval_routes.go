package http

import (
	"database/sql"
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

const AdministrationPermissionApprove = "administration.approve"

func RegisterAdministrationRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	router.HandleFunc("GET /dsh/operator/admin/roles", server.handleListRoles)
	router.HandleFunc("POST /dsh/operator/admin/roles/requests", server.handleRequestRoleDefinition)
	router.HandleFunc("GET /dsh/operator/admin/role-requests", server.handleListRoleDefinitionRequests)
	router.HandleFunc("POST /dsh/operator/admin/role-requests/{requestId}/review", server.handleReviewRoleDefinition)
	router.HandleFunc("GET /dsh/operator/admin/staff", server.handleListStaff)
	router.HandleFunc("POST /dsh/operator/admin/staff/{staffId}/roles", server.handleRequestStaffRoleAssignment)
	router.HandleFunc("GET /dsh/operator/admin/approvals", server.handleListRoleAssignmentApprovals)
	router.HandleFunc("POST /dsh/operator/admin/approvals/{approvalId}/review", server.handleReviewStaffRoleAssignment)
	router.HandleFunc("GET /dsh/operator/admin/partners", server.handleListPartnerActivations)
	router.HandleFunc("GET /dsh/operator/admin/captains", server.handleListCaptainCredentials)
	router.HandleFunc("GET /dsh/operator/admin/audit", server.handleListAdminAudit)
}

func writeAdministrationApprovalError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, administration.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "required approval fields are invalid")
	case errors.Is(err, administration.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "role or approval request not found")
	case errors.Is(err, administration.ErrSelfApproval):
		store.SendError(w, http.StatusForbidden, "SELF_APPROVAL_FORBIDDEN", "maker, beneficiary, and checker must be different actors")
	case errors.Is(err, administration.ErrApprovalConflict):
		store.SendError(w, http.StatusConflict, "APPROVAL_CONFLICT", "approval request changed or the requested role state is no longer valid")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "administration approval action failed")
	}
}

func (s *protectedStoreServer) handleRequestRoleDefinition(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionManage)
	if !ok {
		return
	}
	var body struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
		Reason      string   `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	request, err := administration.RequestRoleDefinition(
		r.Context(), s.db, body.Name, body.Description, body.Permissions, actor.ID, body.Reason,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"request": request})
}

func (s *protectedStoreServer) handleListRoleDefinitionRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	requests, err := administration.ListRoleDefinitionRequests(r.Context(), s.db, r.URL.Query().Get("status"), 100)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (s *protectedStoreServer) handleReviewRoleDefinition(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionApprove)
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
	request, role, err := administration.ReviewRoleDefinition(
		r.Context(), s.db, r.PathValue("requestId"), actor.ID,
		body.Decision, body.ReviewNote, body.ExpectedVersion,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"request": request, "role": role})
}

// POST /dsh/operator/admin/staff/{staffId}/roles
// actionType is mandatory so assignment and revocation share one governed path.
func (s *protectedStoreServer) handleRequestStaffRoleAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionManage)
	if !ok {
		return
	}
	var body struct {
		RoleID     string `json:"roleId"`
		ActionType string `json:"actionType"`
		Reason     string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	var (
		approval administration.RoleAssignmentApproval
		err      error
	)
	switch body.ActionType {
	case administration.RoleChangeAssign:
		approval, err = administration.RequestStaffRoleAssignment(
			r.Context(), s.db, r.PathValue("staffId"), body.RoleID, actor.ID, body.Reason,
		)
	case administration.RoleChangeRevoke:
		approval, err = administration.RequestStaffRoleRevocation(
			r.Context(), s.db, r.PathValue("staffId"), body.RoleID, actor.ID, body.Reason,
		)
	default:
		err = administration.ErrInvalid
	}
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"approval": approval})
}

func (s *protectedStoreServer) handleListRoleAssignmentApprovals(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	approvals, err := administration.ListRoleAssignmentApprovals(r.Context(), s.db, r.URL.Query().Get("status"), 100)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"approvals": approvals})
}

func (s *protectedStoreServer) handleReviewStaffRoleAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionApprove)
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
	approval, assignment, err := administration.ReviewStaffRoleAssignment(
		r.Context(), s.db, r.PathValue("approvalId"), actor.ID,
		body.Decision, body.ReviewNote, body.ExpectedVersion,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"approval":   approval,
		"assignment": assignment,
	})
}
