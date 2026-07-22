package administration

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
)

// Role is the governed DSH authorization role projection. Identity owns the
// authenticated actor and session, while these permissions own only DSH
// administration actions after an independently approved assignment.
type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	Surfaces    []string  `json:"surfaces"`
	Active      bool      `json:"active"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
}

func ListRoles(db *sql.DB) ([]Role, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, name, COALESCE(description,''), permissions, surfaces,
		       active, version, created_at
		FROM dsh_admin_roles ORDER BY active DESC, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Role, 0)
	for rows.Next() {
		var role Role
		var permissionsJSON, surfacesJSON []byte
		if err := rows.Scan(
			&role.ID, &role.Name, &role.Description, &permissionsJSON, &surfacesJSON,
			&role.Active, &role.Version, &role.CreatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(permissionsJSON, &role.Permissions); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(surfacesJSON, &role.Surfaces); err != nil {
			return nil, err
		}
		if role.Permissions == nil {
			role.Permissions = []string{}
		}
		if role.Surfaces == nil {
			role.Surfaces = []string{}
		}
		out = append(out, role)
	}
	return out, rows.Err()
}

// AdministrationPermissionCandidates keeps legacy broad permissions working
// while allowing least-privilege permissions for each governed operation.
func AdministrationPermissionCandidates(action string) []string {
	action = strings.TrimSpace(action)
	if !strings.HasPrefix(action, "administration.") {
		return nil
	}
	candidates := []string{action}
	switch action {
	case "administration.role.request", "administration.staff.request", "administration.rollback.request":
		candidates = append(candidates, "administration.manage")
	case "administration.role.approve", "administration.staff.approve", "administration.rollback.approve":
		candidates = append(candidates, "administration.approve")
	case "administration.audit.read", "administration.diagnostics.read":
		candidates = append(candidates, "administration.read")
	}
	return candidates
}

// ActorHasPermission evaluates only approved, active DSH role assignments. It
// never authenticates the actor and never expands access outside the DSH
// administration action namespace or the control-panel surface.
func ActorHasPermission(db *sql.DB, actorID string, action string) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	candidates := AdministrationPermissionCandidates(action)
	if db == nil || actorID == "" || len(candidates) == 0 {
		return false, ErrInvalid
	}
	candidate1, candidate2 := candidates[0], candidates[0]
	if len(candidates) > 1 {
		candidate2 = candidates[1]
	}
	var allowed bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM dsh_admin_staff_assignments assignment
			JOIN dsh_admin_roles role ON role.id = assignment.role_id
			WHERE assignment.actor_id = $1
			  AND role.active = TRUE
			  AND role.surfaces ? 'control-panel'
			  AND (role.permissions ? $2 OR role.permissions ? $3)
		)`, actorID, candidate1, candidate2).Scan(&allowed)
	return allowed, err
}

// StaffMember is an approved role-assignment projection. Writes are performed
// only by ReviewStaffRoleAssignment or an independently approved rollback.
type StaffMember struct {
	ID         string    `json:"id"`
	ActorID    string    `json:"actorId"`
	RoleID     string    `json:"roleId"`
	RoleName   string    `json:"roleName"`
	AssignedBy string    `json:"assignedBy"`
	AssignedAt time.Time `json:"assignedAt"`
}

func ListStaff(db *sql.DB) ([]StaffMember, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT sa.id, sa.actor_id, sa.role_id, r.name,
		       COALESCE(sa.assigned_by,''), sa.assigned_at
		FROM dsh_admin_staff_assignments sa
		JOIN dsh_admin_roles r ON r.id=sa.role_id
		WHERE r.active = TRUE
		  AND r.surfaces ? 'control-panel'
		ORDER BY sa.assigned_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]StaffMember, 0)
	for rows.Next() {
		var member StaffMember
		if err := rows.Scan(
			&member.ID, &member.ActorID, &member.RoleID, &member.RoleName,
			&member.AssignedBy, &member.AssignedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, member)
	}
	return out, rows.Err()
}

// PartnerActivation is retained as a read-only compatibility projection.
// Partner lifecycle mutations are owned by the governed partner lifecycle.
type PartnerActivation struct {
	ID         string    `json:"id"`
	PartnerID  string    `json:"partnerId"`
	Status     string    `json:"status"`
	ReviewedBy string    `json:"reviewedBy"`
	Notes      string    `json:"notes"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func ListPartnerActivations(db *sql.DB, status string) ([]PartnerActivation, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, partner_id, status, COALESCE(reviewed_by,''),
		       COALESCE(notes,''), created_at, updated_at
		FROM dsh_admin_partner_activations
		WHERE ($1='' OR status=$1)
		ORDER BY created_at DESC`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]PartnerActivation, 0)
	for rows.Next() {
		var activation PartnerActivation
		if err := rows.Scan(
			&activation.ID, &activation.PartnerID, &activation.Status,
			&activation.ReviewedBy, &activation.Notes,
			&activation.CreatedAt, &activation.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, activation)
	}
	return out, rows.Err()
}

// CaptainCredential is a read-only projection. Credential review is owned by
// the Workforce/captain accreditation journey and is not mutated by this area.
type CaptainCredential struct {
	ID            string    `json:"id"`
	CaptainID     string    `json:"captainId"`
	LicenseNumber string    `json:"licenseNumber"`
	VehicleType   string    `json:"vehicleType"`
	Status        string    `json:"status"`
	ReviewedBy    string    `json:"reviewedBy"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func ListCaptainCredentials(db *sql.DB, status string) ([]CaptainCredential, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, captain_id, COALESCE(license_number,''), COALESCE(vehicle_type,''),
		       status, COALESCE(reviewed_by,''), updated_at
		FROM dsh_admin_captain_credentials
		WHERE ($1='' OR status=$1)
		ORDER BY updated_at DESC`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]CaptainCredential, 0)
	for rows.Next() {
		var credential CaptainCredential
		if err := rows.Scan(
			&credential.ID, &credential.CaptainID, &credential.LicenseNumber,
			&credential.VehicleType, &credential.Status,
			&credential.ReviewedBy, &credential.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, credential)
	}
	return out, rows.Err()
}

type AdminAuditEntry struct {
	ID            string    `json:"id"`
	ActorID       string    `json:"actorId"`
	Action        string    `json:"action"`
	TargetID      string    `json:"targetId"`
	Detail        string    `json:"detail"`
	Sensitivity   string    `json:"sensitivity"`
	CorrelationID string    `json:"correlationId"`
	CreatedAt     time.Time `json:"createdAt"`
}

func ListAdminAudit(db *sql.DB, actorID string, limit int) ([]AdminAuditEntry, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if limit < 1 || limit > 500 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT id, actor_id, action, COALESCE(target_id,''),
		       COALESCE(detail,''), sensitivity, COALESCE(correlation_id,''), created_at
		FROM dsh_admin_audit
		WHERE ($1='' OR actor_id=$1)
		ORDER BY created_at DESC LIMIT $2`, strings.TrimSpace(actorID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AdminAuditEntry, 0)
	for rows.Next() {
		var entry AdminAuditEntry
		if err := rows.Scan(
			&entry.ID, &entry.ActorID, &entry.Action, &entry.TargetID,
			&entry.Detail, &entry.Sensitivity, &entry.CorrelationID, &entry.CreatedAt,
		); err != nil {
			return nil, err
		}
		entry.Detail = redactAuditDetail(entry.Detail)
		out = append(out, entry)
	}
	return out, rows.Err()
}
