package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/administration"
	"dsh-api/internal/store"
)

// Administration permission actions on the control-panel surface.
// "operator" remains a valid fallback role during RBAC data migration.
const (
	AdministrationPermissionRead   = "administration.read"
	AdministrationPermissionManage = "administration.manage"
)

// GET /dsh/operator/admin/roles
func (s *protectedStoreServer) handleListRoles(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionRead, "operator")
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

// POST /dsh/operator/admin/roles
func (s *protectedStoreServer) handleCreateRole(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	role, err := administration.CreateRole(s.db, body.Name, body.Description)
	if errors.Is(err, administration.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "name is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create role")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"role": role})
}

// GET /dsh/operator/admin/staff
func (s *protectedStoreServer) handleListStaff(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionRead, "operator")
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

// POST /dsh/operator/admin/staff/{staffId}/roles
func (s *protectedStoreServer) handleAssignStaffRole(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionManage, "operator")
	if !ok {
		return
	}
	staffID := r.PathValue("staffId")
	var body struct {
		RoleID string `json:"roleId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	m, err := administration.AssignStaffRole(s.db, staffID, body.RoleID, actor.ID)
	if errors.Is(err, administration.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "roleId is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to assign role")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assignment": m})
}

// GET /dsh/operator/admin/partners
func (s *protectedStoreServer) handleListPartnerActivations(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionRead, "operator")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	activations, err := administration.ListPartnerActivations(s.db, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner activations")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"activations": activations})
}

// POST /dsh/operator/admin/partners/{partnerId}/activate
func (s *protectedStoreServer) handleActivatePartner(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionManage, "operator")
	if !ok {
		return
	}
	partnerID := r.PathValue("partnerId")
	var body struct {
		Notes string `json:"notes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	a, err := administration.ActivatePartner(s.db, partnerID, actor.ID, body.Notes)
	if errors.Is(err, administration.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner activation record not found")
		return
	}
	if errors.Is(err, administration.ErrForbidden) {
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", "cannot activate from current status")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to activate partner")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"activation": a})
}

// POST /dsh/operator/admin/partners/{partnerId}/block
func (s *protectedStoreServer) handleBlockPartner(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionManage, "operator")
	if !ok {
		return
	}
	partnerID := r.PathValue("partnerId")
	var body struct {
		Notes string `json:"notes"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	a, err := administration.BlockPartner(s.db, partnerID, actor.ID, body.Notes)
	if errors.Is(err, administration.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner activation record not found")
		return
	}
	if errors.Is(err, administration.ErrForbidden) {
		store.SendError(w, http.StatusConflict, "INVALID_TRANSITION", "cannot block from current status")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to block partner")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"activation": a})
}

// GET /dsh/operator/admin/captains
func (s *protectedStoreServer) handleListCaptainCredentials(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionRead, "operator")
	if !ok {
		return
	}
	status := r.URL.Query().Get("status")
	creds, err := administration.ListCaptainCredentials(s.db, status)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list credentials")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"credentials": creds})
}

// POST /dsh/operator/admin/captains/{captainId}/credential
func (s *protectedStoreServer) handleUpsertCaptainCredential(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionManage, "operator")
	if !ok {
		return
	}
	captainID := r.PathValue("captainId")
	var body struct {
		LicenseNumber string `json:"licenseNumber"`
		VehicleType   string `json:"vehicleType"`
		Status        string `json:"status"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	cred, err := administration.UpsertCaptainCredential(s.db,
		captainID, body.LicenseNumber, body.VehicleType, body.Status, actor.ID)
	if errors.Is(err, administration.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "captainId is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to upsert credential")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"credential": cred})
}

// GET /dsh/operator/admin/audit
func (s *protectedStoreServer) handleListAdminAudit(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AdministrationPermissionRead, "operator")
	if !ok {
		return
	}
	actorFilter := r.URL.Query().Get("actorId")
	entries, err := administration.ListAdminAudit(s.db, actorFilter, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list audit")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"audit": entries})
}
