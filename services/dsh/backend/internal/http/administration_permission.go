package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

// requireAdministrationPermission combines the live Identity session with the
// canonical Identity RBAC registry. A governed administration action is valid
// only for an operator session issued for the control-panel surface; RBAC then
// determines the exact action/scope. Inline session permission snapshots are
// never an authority here. Deny-by-default if Identity or RBAC is unavailable.
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
	if !identity.HasRole("operator") || identity.SessionSurface != "control-panel" {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "operator control-panel session is required")
		return store.StoreActor{}, false
	}

	actor := store.StoreActor{
		ID:                identity.Subject,
		Role:              "operator",
		OperatorContextID: identity.OperatorContextID,
		SessionID:         identity.SessionID,
		SessionSurface:    identity.SessionSurface,
		PhoneE164:         identity.PhoneE164,
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
