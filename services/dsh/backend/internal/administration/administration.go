package administration

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
	ErrConflict = errors.New("request conflicts with another pending role change")
	// ErrIdentityUnavailable is returned when a review requires a canonical
	// Identity mutation but no Identity client is configured.
	ErrIdentityUnavailable = errors.New("identity is unavailable")
	// ErrCanonicalMutationFailed is returned when Identity rejects the
	// canonical authorization mutation an approval depends on. The approval
	// must remain unapplied; this error must never be swallowed into a
	// local-only status flip.
	ErrCanonicalMutationFailed = errors.New("canonical authorization mutation failed")
)

// Role is a DSH API view of the complete Identity-owned role definition.
// Permissions are canonical service/surface/action/scope bindings. Surfaces is
// derived from those bindings for presentation only and is never persisted as
// an independent authorization authority in DSH.
type Role struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Active      bool              `json:"active"`
	Version     int               `json:"version"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
	Permissions []auth.Permission `json:"permissions"`
	Surfaces    []string          `json:"surfaces"`
}

func roleFromCanonical(definition auth.RbacRoleDefinition) Role {
	surfaceSet := make(map[string]struct{}, len(definition.Permissions))
	for _, permission := range definition.Permissions {
		if surface := strings.TrimSpace(permission.Surface); surface != "" {
			surfaceSet[surface] = struct{}{}
		}
	}
	surfaces := make([]string, 0, len(surfaceSet))
	for surface := range surfaceSet {
		surfaces = append(surfaces, surface)
	}
	sort.Strings(surfaces)
	permissions := append([]auth.Permission(nil), definition.Permissions...)
	if permissions == nil {
		permissions = []auth.Permission{}
	}
	return Role{
		ID:          definition.ID,
		Name:        definition.Name,
		Description: definition.Description,
		Active:      definition.Active,
		Version:     definition.Version,
		CreatedAt:   definition.CreatedAt,
		UpdatedAt:   definition.UpdatedAt,
		Permissions: permissions,
		Surfaces:    surfaces,
	}
}

// ListRoles reads role shells and each complete definition from Identity. DSH
// does not retain a local role-definition registry.
func ListRoles(ctx context.Context, identityClient *auth.Client) ([]Role, error) {
	if identityClient == nil {
		return nil, ErrIdentityUnavailable
	}
	shells, err := identityClient.ListRoles(ctx)
	if err != nil {
		return nil, ErrIdentityUnavailable
	}
	out := make([]Role, 0, len(shells))
	for _, shell := range shells {
		definition, err := identityClient.GetRoleDefinition(ctx, shell.Name)
		if err != nil {
			return nil, ErrIdentityUnavailable
		}
		out = append(out, roleFromCanonical(definition))
	}
	return out, nil
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
