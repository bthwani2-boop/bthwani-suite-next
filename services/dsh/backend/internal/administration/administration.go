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

// PartnerActivation is a privacy-minimized read-only compatibility projection.
// Partner lifecycle mutations and review notes remain owned by the governed
// partner lifecycle and are never exposed through administration diagnostics.
type PartnerActivation struct {
	ID         string    `json:"id"`
	PartnerID  string    `json:"partnerId"`
	Status     string    `json:"status"`
	ReviewedBy string    `json:"reviewedBy"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func ListPartnerActivations(db *sql.DB, status string) ([]PartnerActivation, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, partner_id, status, COALESCE(reviewed_by,''),
		       created_at, updated_at
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
			&activation.ReviewedBy, &activation.CreatedAt, &activation.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, activation)
	}
	return out, rows.Err()
}

// CaptainCredential is a privacy-minimized read-only projection. Credential
// review and the raw license number remain owned by Workforce/captain
// accreditation and are never exposed through the administration projection.
type CaptainCredential struct {
	ID          string    `json:"id"`
	CaptainID   string    `json:"captainId"`
	VehicleType string    `json:"vehicleType"`
	Status      string    `json:"status"`
	ReviewedBy  string    `json:"reviewedBy"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func ListCaptainCredentials(db *sql.DB, status string) ([]CaptainCredential, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT id, captain_id, COALESCE(vehicle_type,''),
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
			&credential.ID, &credential.CaptainID, &credential.VehicleType,
			&credential.Status, &credential.ReviewedBy, &credential.UpdatedAt,
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
