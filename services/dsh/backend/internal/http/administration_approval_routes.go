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

// RegisterAdministrationRoutes exposes read models and the governed
// maker-checker role-assignment lifecycle. Legacy direct sensitive mutations
// are deliberately not mounted here.
func RegisterAdministrationRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	router.HandleFunc("GET /dsh/operator/admin/roles", server.handleListRoles)
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
		store.SendError(w, http.StatusConflict, "APPROVAL_CONFLICT", "approval request changed or an equivalent request is already pending")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "administration approval action failed")
	}
}

// POST /dsh/operator/admin/staff/{staffId}/roles
func (s *protectedStoreServer) handleRequestStaffRoleAssignment(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionManage)
	if !ok {
		return
	}
	var body struct {
		RoleID string `json:"roleId"`
		Reason string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	approval, err := administration.RequestStaffRoleAssignment(
		r.Context(), s.db, r.PathValue("staffId"), body.RoleID, actor.ID, body.Reason,
	)
	if err != nil {
		writeAdministrationApprovalError(w, err)
		return
	}
	store.SendJSON(w, http.StatusAccepted, map[string]any{"approval": approval})
}

// GET /dsh/operator/admin/approvals?status=pending
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

// POST /dsh/operator/admin/approvals/{approvalId}/review
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
