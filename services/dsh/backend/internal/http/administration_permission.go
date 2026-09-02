package http

import (
	"dsh-api/internal/opctx"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/store"
)

func controlPanelActorRole(identity auth.ActorIdentity) string {
	if identity.HasRole("operator") {
		return "operator"
	}
	if identity.HasRole("employee") {
		return "employee"
	}
	for _, role := range identity.Roles {
		if trimmed := strings.TrimSpace(role); trimmed != "" {
			return trimmed
		}
	}
	return "authenticated"
}

func resolvedControlPanelPermissions(
	s *protectedStoreServer,
	r *http.Request,
	identity auth.ActorIdentity,
) ([]auth.Permission, error) {
	if identity.HasRole("operator") {
		operatorContextID := strings.TrimSpace(identity.OperatorContextID)
		if operatorContextID == "" || operatorContextID == "legacy-unscoped" {
			return nil, auth.ErrIdentityUnavailable
		}
		return s.identity.ResolvePermissions(opctx.WithOperatorContext(r.Context(), operatorContextID), identity.Subject)
	}
	// Resolve() calls Identity /auth/session for every protected request, so
	// these are the actor's current server-side permissions, not a browser or
	// token snapshot. Non-operator control-panel employees are governed by this
	// exact permission set.
	return identity.Permissions, nil
}

// requireAdministrationPermission separates authentication from authorization:
// the exact live session must be bound to control-panel, then the current
// permission authority for that actor must contain the requested action.
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
	if strings.TrimSpace(identity.OperatorContextID) == "" || strings.TrimSpace(identity.OperatorContextID) == "legacy-unscoped" {
		store.SendError(w, http.StatusForbidden, "OPERATOR_CONTEXT_REQUIRED", "session has no executable operator context")
		return store.StoreActor{}, false
	}
	*r = *r.WithContext(opctx.WithOperatorContext(r.Context(), identity.OperatorContextID))
	if identity.SessionSurface != "control-panel" {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "control-panel session is required")
		return store.StoreActor{}, false
	}

	permissions, permissionErr := resolvedControlPanelPermissions(s, r, identity)
	if permissionErr != nil {
		store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "permission authority is unavailable")
		return store.StoreActor{}, false
	}
	action = strings.TrimSpace(action)
	if action == "" || (!strings.HasPrefix(action, "administration.") && action != "support.read" && action != "support.manage") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "administration action is invalid")
		return store.StoreActor{}, false
	}
	for _, permission := range permissions {
		if permission.Service != "dsh" || permission.Surface != "control-panel" {
			continue
		}
		if permission.Action == action && strings.TrimSpace(permission.Scope) == "all" {
			return store.StoreActor{
				ID:                 identity.Subject,
				Role:               controlPanelActorRole(identity),
				OperatorContextID:  identity.OperatorContextID,
				SessionID:          identity.SessionID,
				SessionSurface:     identity.SessionSurface,
				PhoneE164:          identity.PhoneE164,
				AuthorizedAction:   action,
				AuthorizationScope: permission.Scope,
			}, true
		}
	}

	store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor is not approved for this administration action")
	return store.StoreActor{}, false
}
