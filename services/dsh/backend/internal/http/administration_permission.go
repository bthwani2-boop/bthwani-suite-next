package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

// requireAdministrationPermission combines Identity authentication with the
// approved DSH administration assignment projection. Identity remains the
// session authority; DSH grants only administration.* actions that survived
// maker-checker approval. Any lookup failure is fail-closed.
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
		ID:        identity.Subject,
		Role:      "permission:" + action,
		TenantID:  identity.TenantID,
		PhoneE164: identity.PhoneE164,
	}
	if identity.HasRole("operator") {
		actor.Role = "operator"
		return actor, true
	}
	for _, permission := range identity.Permissions {
		if permission.Service == "dsh" && permission.Surface == "control-panel" && permission.Action == action {
			return actor, true
		}
	}

	allowed, permissionErr := administration.ActorHasPermission(s.db, identity.Subject, action)
	if permissionErr != nil {
		store.SendError(w, http.StatusInternalServerError, "AUTHORIZATION_UNAVAILABLE", "administration authorization could not be verified")
		return store.StoreActor{}, false
	}
	if !allowed {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor is not approved for this administration action")
		return store.StoreActor{}, false
	}
	actor.Role = "approved-role:" + action
	return actor, true
}
