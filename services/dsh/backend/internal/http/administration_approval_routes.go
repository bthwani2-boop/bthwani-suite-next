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

const (
	AdministrationPermissionApprove         = "administration.approve"
	AdministrationPermissionRoleRequest     = "administration.role.request"
	AdministrationPermissionRoleApprove     = "administration.role.approve"
	AdministrationPermissionStaffRequest    = "administration.staff.request"
	AdministrationPermissionStaffApprove    = "administration.staff.approve"
	AdministrationPermissionAuditRead       = "administration.audit.read"
	AdministrationPermissionDiagnosticsRead = "administration.diagnostics.read"
	AdministrationPermissionRollbackRequest = "administration.rollback.request"
	AdministrationPermissionRollbackApprove = "administration.rollback.approve"
)

func RegisterAdministrationRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
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



