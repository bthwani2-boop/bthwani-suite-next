package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// Administration permissions still enforced by DSH. Role definition, role
// assignment and rollback approvals moved to Identity as the single registry of
// roles, permissions and assignments; DSH no longer defines permissions for
// capabilities it does not own.
const (
	AdministrationPermissionApprove   = "administration.approve"
	AdministrationPermissionAuditRead = "administration.audit.read"
)

func RegisterAdministrationRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	router.HandleFunc("GET /dsh/operator/admin/partners", server.handleListPartnerActivations)
	router.HandleFunc("GET /dsh/operator/admin/captains", server.handleListCaptainCredentials)
	router.HandleFunc("GET /dsh/operator/admin/audit", server.handleListAdminAudit)
}
