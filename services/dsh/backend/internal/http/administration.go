package http

import (
	"errors"
	"net/http"
	"sort"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

func canonicalAdministrationRoleView(role administration.Role) map[string]interface{} {
	actionSet := make(map[string]struct{}, len(role.Permissions))
	for _, permission := range role.Permissions {
		if permission.Action != "" {
			actionSet[permission.Action] = struct{}{}
		}
	}
	actions := make([]string, 0, len(actionSet))
	for action := range actionSet {
		actions = append(actions, action)
	}
	sort.Strings(actions)
	return map[string]interface{}{
		"id":          role.ID,
		"name":        role.Name,
		"description": role.Description,
		"permissions": actions,
		"surfaces":    role.Surfaces,
		"active":      role.Active,
		"version":     role.Version,
		"createdAt":   role.CreatedAt,
		"updatedAt":   role.UpdatedAt,
	}
}

// GET /dsh/operator/admin/roles
func (s *protectedStoreServer) handleListRoles(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.role.read")
	if !ok {
		return
	}
	roles, err := administration.ListRoles(r.Context(), s.identity)
	if err != nil {
		if errors.Is(err, administration.ErrIdentityUnavailable) {
			store.SendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list roles")
		return
	}
	views := make([]map[string]interface{}, 0, len(roles))
	for _, role := range roles {
		views = append(views, canonicalAdministrationRoleView(role))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"roles": views})
}

// GET /dsh/operator/admin/audit
func (s *protectedStoreServer) handleListAdminAudit(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.audit.read")
	if !ok {
		return
	}
	entries, err := administration.ListAdminAudit(r.Context(), s.db, r.URL.Query().Get("actorId"), 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"entries": entries, "total": len(entries)})
}
