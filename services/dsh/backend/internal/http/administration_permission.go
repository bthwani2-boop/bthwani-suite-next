package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

// requireAdministrationPermission combines Identity authentication with the
// canonical Identity RBAC registry. Identity remains both the session and
// the permission authority: inline session claims (identity.Permissions)
// are stale snapshots taken at login and cannot be used to authorize a
// governed administration action — see the identical rule enforced for
// operator actors in requirePermission (protected_store.go). Deny-by-default:
// if the RBAC registry is unavailable, access is denied, never granted.
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
		ID:                identity.Subject,
		Role:              "permission:" + action,
		OperatorContextID: identity.OperatorContextID,
		AuthorizedAction:  action,
	}

	rbacPerms, rbacErr := s.identity.ResolvePermissions(r.Context(), identity.Subject)
	if rbacErr != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "RBAC registry is unavailable")
		return store.StoreActor{}, false
	}
	candidates := administration.AdministrationPermissionCandidates(action)
	for _, permission := range rbacPerms {
		if permission.Service != "dsh" || permission.Surface != "control-panel" {
			continue
		}
		for _, candidate := range candidates {
			if permission.Action == candidate {
				actor.AuthorizationScope = permission.Scope
				return actor, true
			}
		}
	}

	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor is not approved for this administration action")
	return store.StoreActor{}, false
}
