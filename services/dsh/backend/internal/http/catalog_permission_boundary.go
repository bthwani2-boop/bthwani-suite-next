package http

import (
	"net/http"

	"dsh-api/internal/store"
)

// requireCatalogPermission keeps central-catalog handlers on the same
// Identity-owned permission boundary as the rest of DSH. It does not add a
// fallback role or a parallel authorization rule: it is a thin, catalog-scoped
// wrapper over requirePermission so every catalog handler is authenticated
// and authorized against the exact action its caller passed, not merely
// against whichever actor happened to already be in the request context.
func (s *protectedStoreServer) requireCatalogPermission(
	w http.ResponseWriter,
	r *http.Request,
	action string,
) (store.StoreActor, bool) {
	return s.requirePermission(w, r, "control-panel", action)
}
