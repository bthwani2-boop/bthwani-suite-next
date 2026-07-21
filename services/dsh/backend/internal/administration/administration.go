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
	CreatedAt   time.Time `json:"createdAt"`
}

func ListRoles(db *sql.DB) ([]Role, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, name, COALESCE(description,''), permissions, created_at
		FROM dsh_admin_roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Role, 0)
	for rows.Next() {
		var r Role
		var permissionsJSON []byte
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &permissionsJSON, &r.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(permissionsJSON, &r.Permissions); err != nil {
			return nil, err
		}
		if r.Permissions == nil {
			r.Permissions = []string{}
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ActorHasPermission evaluates only approved DSH role assignments. It never
// authenticates the actor and never expands access outside the DSH
// administration action namespace.
func ActorHasPermission(db *sql.DB, actorID string, action string) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	action = strings.TrimSpace(action)
	if db == nil || actorID == "" || action == "" || !strings.HasPrefix(action, "administration.") {
		return false, ErrInvalid
	}
	var allowed bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM dsh_admin_staff_assignments assignment
			JOIN dsh_admin_roles role ON role.id = assignment.role_id
			WHERE assignment.actor_id = $1
			  AND role.permissions ? $2
		)`, actorID, action).Scan(&allowed)
	return allowed, err
}

// StaffMember is an approved role-assignment projection. Writes are performed
// only by ReviewStaffRoleAssignment after maker-checker approval.
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
		ORDER BY sa.assigned_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]StaffMember, 0)
	for rows.Next() {
		var m StaffMember
		if err := rows.Scan(&m.ID, &m.ActorID, &m.RoleID, &m.RoleName,
			&m.AssignedBy, &m.AssignedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// PartnerActivation is retained as a read-only compatibility projection.
// Partner lifecycle mutations are owned by the governed partner lifecycle,
// not by the administration dashboard.
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
		var a PartnerActivation
		if err := rows.Scan(&a.ID, &a.PartnerID, &a.Status,
			&a.ReviewedBy, &a.Notes, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// CaptainCredential is a read-only projection. Credential review is owned by
// the workforce/captain accreditation journey and is not mutated by this area.
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
		var c CaptainCredential
		if err := rows.Scan(&c.ID, &c.CaptainID, &c.LicenseNumber, &c.VehicleType,
			&c.Status, &c.ReviewedBy, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

type AdminAuditEntry struct {
	ID        string    `json:"id"`
	ActorID   string    `json:"actorId"`
	Action    string    `json:"action"`
	TargetID  string    `json:"targetId"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"createdAt"`
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
		       COALESCE(detail,''), created_at
		FROM dsh_admin_audit
		WHERE ($1='' OR actor_id=$1)
		ORDER BY created_at DESC LIMIT $2`, strings.TrimSpace(actorID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]AdminAuditEntry, 0)
	for rows.Next() {
		var e AdminAuditEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.Action,
			&e.TargetID, &e.Detail, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
