package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

func RegisterAdministrationRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	router.HandleFunc("GET /dsh/operator/admin/audit", server.handleListAdminAudit)
	router.HandleFunc("GET /dsh/operator/admin/permission-vocabulary", server.handleListPermissionVocabulary)
}
