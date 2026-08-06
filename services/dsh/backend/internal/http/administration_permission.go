package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

// requireAdministrationPermission combines Identity authentication with exact
// control-panel permissions or an approved DSH administration assignment.
// Identity remains the session authority; a broad role label never bypasses
// operation authorization. Any lookup failure is fail-closed.
func (s *protectedStoreServer) requireAdministrationPermission(
	w http.ResponseWriter,
	r *http.Request,
	action string,
) (store.StoreActor, bool) {
	identity, err := s.identity.Resolve(r.Context(), r.Header.Get("Authorization"))
	if errors.Is(err, auth.ErrUnauthenticated) {
		store.SendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "bearer session is missing or invalid")
		return store.StoreActor{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
		return store.StoreActor{}, false
	}

	actor := store.StoreActor{
		ID:       identity.Subject,
		Role:     "permission:" + action,
		OperatorContextID: identity.OperatorContextID,
	}
	candidates := administration.AdministrationPermissionCandidates(action)
	for _, permission := range identity.Permissions {
		if permission.Service != "dsh" || permission.Surface != "control-panel" {
			continue
		}
		for _, candidate := range candidates {
			if permission.Action == candidate {
				return actor, true
			}
		}
	}

	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor is not approved for this administration action")
	return store.StoreActor{}, false
}
