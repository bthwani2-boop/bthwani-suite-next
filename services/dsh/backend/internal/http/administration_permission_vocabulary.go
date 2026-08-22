package http

import (
	"net/http"

	"dsh-api/internal/store"
)

// GET /dsh/operator/admin/permission-vocabulary
func (s *protectedStoreServer) handleListPermissionVocabulary(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.role.request")
	if !ok {
		return
	}
	if s.identity == nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return
	}

	permissions, err := s.identity.ListPermissionVocabulary(r.Context(), "dsh", "control-panel")
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]interface{}{"permissions": permissions})
}
