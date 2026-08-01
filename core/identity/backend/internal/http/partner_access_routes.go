package http

import (
	"net/http"

	"identity-api/internal/identity"
)

func RegisterPartnerAccessRoutes(handler http.Handler, repository *identity.Repository) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("identity partner access routes require *http.ServeMux")
	}
	mux.HandleFunc("GET /internal/partner/permission-bundles", func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, map[string]any{"permissionBundles": identity.PartnerPermissionBundles()})
	})
}
