package administration

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound    = errors.New("not found")
	ErrInvalid     = errors.New("invalid input")
	ErrForbidden   = errors.New("transition not allowed")
)

// ── Roles ─────────────────────────────────────────────────────────────────────

type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Permissions []string  `json:"permissions"`
	CreatedAt   time.Time `json:"createdAt"`
}

func ListRoles(db *sql.DB) ([]Role, error) {
	rows, err := db.Query(`
		SELECT id, name, COALESCE(description,''), created_at
		FROM dsh_admin_roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.CreatedAt); err != nil {
			return nil, err
		}
		r.Permissions = []string{}
		out = append(out, r)
	}
	if out == nil {
		out = []Role{}
	}
	return out, rows.Err()
}

func CreateRole(db *sql.DB, name, description string) (Role, error) {
	if name == "" {
		return Role{}, ErrInvalid
	}
	var r Role
	err := db.QueryRow(`
		INSERT INTO dsh_admin_roles (name, description)
		VALUES ($1, $2)
		RETURNING id, name, COALESCE(description,''), created_at`,
		name, description).Scan(&r.ID, &r.Name, &r.Description, &r.CreatedAt)
	r.Permissions = []string{}
	return r, err
}

// ── Staff ─────────────────────────────────────────────────────────────────────

type StaffMember struct {
	ID        string    `json:"id"`
	ActorID   string    `json:"actorId"`
	RoleID    string    `json:"roleId"`
	RoleName  string    `json:"roleName"`
	AssignedBy string   `json:"assignedBy"`
	AssignedAt time.Time `json:"assignedAt"`
}

func ListStaff(db *sql.DB) ([]StaffMember, error) {
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
	var out []StaffMember
	for rows.Next() {
		var m StaffMember
		if err := rows.Scan(&m.ID, &m.ActorID, &m.RoleID, &m.RoleName,
			&m.AssignedBy, &m.AssignedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	if out == nil {
		out = []StaffMember{}
	}
	return out, rows.Err()
}

func AssignStaffRole(db *sql.DB, actorID, roleID, assignedBy string) (StaffMember, error) {
	if actorID == "" || roleID == "" {
		return StaffMember{}, ErrInvalid
	}
	var m StaffMember
	err := db.QueryRow(`
		INSERT INTO dsh_admin_staff_assignments (actor_id, role_id, assigned_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (actor_id, role_id) DO UPDATE SET assigned_by=EXCLUDED.assigned_by, assigned_at=NOW()
		RETURNING id, actor_id, role_id, (SELECT name FROM dsh_admin_roles WHERE id=$2),
		          COALESCE(assigned_by,''), assigned_at`,
		actorID, roleID, assignedBy).Scan(
		&m.ID, &m.ActorID, &m.RoleID, &m.RoleName, &m.AssignedBy, &m.AssignedAt)
	return m, err
}

// ── Partner Activation ────────────────────────────────────────────────────────

type PartnerActivation struct {
	ID         string     `json:"id"`
	PartnerID  string     `json:"partnerId"`
	Status     string     `json:"status"`
	ReviewedBy string     `json:"reviewedBy"`
	Notes      string     `json:"notes"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

var validActivationTransitions = map[string][]string{
	"submitted":    {"ops_approved", "blocked"},
	"ops_approved": {"partner_active", "blocked"},
	"partner_active": {"blocked"},
	"blocked":      {"submitted"},
}

func ListPartnerActivations(db *sql.DB, status string) ([]PartnerActivation, error) {
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
	var out []PartnerActivation
	for rows.Next() {
		var a PartnerActivation
		if err := rows.Scan(&a.ID, &a.PartnerID, &a.Status,
			&a.ReviewedBy, &a.Notes, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	if out == nil {
		out = []PartnerActivation{}
	}
	return out, rows.Err()
}

func transitionPartner(db *sql.DB, partnerID, targetStatus, reviewedBy, notes string) (PartnerActivation, error) {
	var current string
	var id string
	err := db.QueryRow(`SELECT id, status FROM dsh_admin_partner_activations WHERE partner_id=$1`, partnerID).
		Scan(&id, &current)
	if errors.Is(err, sql.ErrNoRows) {
		if targetStatus == "ops_approved" || targetStatus == "partner_active" {
			var a PartnerActivation
			err2 := db.QueryRow(`
				INSERT INTO dsh_admin_partner_activations (partner_id, status, reviewed_by, notes)
				VALUES ($1, $2, $3, $4)
				RETURNING id, partner_id, status, COALESCE(reviewed_by,''),
				          COALESCE(notes,''), created_at, updated_at`,
				partnerID, targetStatus, reviewedBy, notes).Scan(
				&a.ID, &a.PartnerID, &a.Status, &a.ReviewedBy, &a.Notes, &a.CreatedAt, &a.UpdatedAt)
			return a, err2
		}
		return PartnerActivation{}, ErrNotFound
	}
	if err != nil {
		return PartnerActivation{}, err
	}
	allowed := validActivationTransitions[current]
	valid := false
	for _, s := range allowed {
		if s == targetStatus {
			valid = true
			break
		}
	}
	if !valid {
		return PartnerActivation{}, ErrForbidden
	}
	var a PartnerActivation
	err = db.QueryRow(`
		UPDATE dsh_admin_partner_activations
		SET status=$2, reviewed_by=$3, notes=$4, updated_at=NOW()
		WHERE id=$1
		RETURNING id, partner_id, status, COALESCE(reviewed_by,''),
		          COALESCE(notes,''), created_at, updated_at`,
		id, targetStatus, reviewedBy, notes).Scan(
		&a.ID, &a.PartnerID, &a.Status, &a.ReviewedBy, &a.Notes, &a.CreatedAt, &a.UpdatedAt)
	return a, err
}

func ActivatePartner(db *sql.DB, partnerID, reviewedBy, notes string) (PartnerActivation, error) {
	return transitionPartner(db, partnerID, "partner_active", reviewedBy, notes)
}

func BlockPartner(db *sql.DB, partnerID, reviewedBy, notes string) (PartnerActivation, error) {
	return transitionPartner(db, partnerID, "blocked", reviewedBy, notes)
}

// ── Captain Credentials ───────────────────────────────────────────────────────

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
	var out []CaptainCredential
	for rows.Next() {
		var c CaptainCredential
		if err := rows.Scan(&c.ID, &c.CaptainID, &c.LicenseNumber, &c.VehicleType,
			&c.Status, &c.ReviewedBy, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	if out == nil {
		out = []CaptainCredential{}
	}
	return out, rows.Err()
}

func UpsertCaptainCredential(db *sql.DB, captainID, licenseNumber, vehicleType, status, reviewedBy string) (CaptainCredential, error) {
	if captainID == "" {
		return CaptainCredential{}, ErrInvalid
	}
	if status == "" {
		status = "pending"
	}
	var c CaptainCredential
	err := db.QueryRow(`
		INSERT INTO dsh_admin_captain_credentials
		       (captain_id, license_number, vehicle_type, status, reviewed_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (captain_id) DO UPDATE
		SET license_number=EXCLUDED.license_number,
		    vehicle_type=EXCLUDED.vehicle_type,
		    status=EXCLUDED.status,
		    reviewed_by=EXCLUDED.reviewed_by,
		    updated_at=NOW()
		RETURNING id, captain_id, COALESCE(license_number,''), COALESCE(vehicle_type,''),
		          status, COALESCE(reviewed_by,''), updated_at`,
		captainID, licenseNumber, vehicleType, status, reviewedBy).Scan(
		&c.ID, &c.CaptainID, &c.LicenseNumber, &c.VehicleType,
		&c.Status, &c.ReviewedBy, &c.UpdatedAt)
	return c, err
}

// ── Audit Trail ───────────────────────────────────────────────────────────────

type AdminAuditEntry struct {
	ID        string    `json:"id"`
	ActorID   string    `json:"actorId"`
	Action    string    `json:"action"`
	TargetID  string    `json:"targetId"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"createdAt"`
}

func ListAdminAudit(db *sql.DB, actorID string, limit int) ([]AdminAuditEntry, error) {
	rows, err := db.Query(`
		SELECT id, actor_id, action, COALESCE(target_id,''),
		       COALESCE(detail,''), created_at
		FROM dsh_admin_audit
		WHERE ($1='' OR actor_id=$1)
		ORDER BY created_at DESC LIMIT $2`, actorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AdminAuditEntry
	for rows.Next() {
		var e AdminAuditEntry
		if err := rows.Scan(&e.ID, &e.ActorID, &e.Action,
			&e.TargetID, &e.Detail, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	if out == nil {
		out = []AdminAuditEntry{}
	}
	return out, rows.Err()
}
