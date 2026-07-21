package http

import (
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

const (
	AdministrationPermissionRead   = "administration.read"
	AdministrationPermissionManage = "administration.manage"
)

// GET /dsh/operator/admin/roles
func (s *protectedStoreServer) handleListRoles(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	roles, err := administration.ListRoles(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list roles")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"roles": roles})
}

// GET /dsh/operator/admin/staff
func (s *protectedStoreServer) handleListStaff(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	staff, err := administration.ListStaff(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list staff")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"staff": staff})
}

// GET /dsh/operator/admin/partners
func (s *protectedStoreServer) handleListPartnerActivations(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	activations, err := administration.ListPartnerActivations(s.db, r.URL.Query().Get("status"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner activations")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"activations": activations})
}

// GET /dsh/operator/admin/captains
func (s *protectedStoreServer) handleListCaptainCredentials(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	credentials, err := administration.ListCaptainCredentials(s.db, r.URL.Query().Get("status"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list credentials")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"credentials": credentials})
}

// GET /dsh/operator/admin/audit
func (s *protectedStoreServer) handleListAdminAudit(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, AdministrationPermissionRead)
	if !ok {
		return
	}
	entries, err := administration.ListAdminAudit(s.db, r.URL.Query().Get("actorId"), 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"audit": entries})
}
