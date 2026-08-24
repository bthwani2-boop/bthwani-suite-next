package administration

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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
	// ErrCanonicalMutationInProgress means another valid leased executor owns
	// the durable intent. Callers must not fall back to a direct Identity write
	// or report success before canonical readback and fenced finalization.
	ErrCanonicalMutationInProgress = errors.New("canonical authorization mutation is reconciling")
	ErrSeparationOfDuties          = errors.New("separation of duties violation")
)

func separationOfDutiesError(message string) error {
	return fmt.Errorf("%w: %s", ErrSeparationOfDuties, message)
}

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

// AdministrationDiagnostics is the privacy-safe operator read model. Identity
// remains the authority for active-role truth; DSH contributes only governed
// request, intent, and audit projections.
type AdministrationDiagnostics struct {
	Status                     string    `json:"status"`
	ActiveRoleCount            int       `json:"activeRoleCount"`
	ApprovedAssignmentCount    int       `json:"approvedAssignmentCount"`
	PendingRoleDefinitionCount int       `json:"pendingRoleDefinitionCount"`
	PendingRoleAssignmentCount int       `json:"pendingRoleAssignmentCount"`
	PendingRollbackCount       int       `json:"pendingRollbackCount"`
	RecentRestrictedAuditCount int       `json:"recentRestrictedAuditCount"`
	GeneratedAt                time.Time `json:"generatedAt"`
	Details                    string    `json:"details,omitempty"`
}

// LoadDiagnostics intentionally reports operator attention as a valid 200
// read-model result. A dependency failure never creates a second public status
// vocabulary, and it never turns a diagnostic read into an authorization
// mutation.
func LoadDiagnostics(ctx context.Context, db *sql.DB, identityClient *auth.Client) AdministrationDiagnostics {
	diagnostics := AdministrationDiagnostics{
		Status:      "healthy",
		GeneratedAt: time.Now().UTC(),
		Details:     "Administration database and Identity RBAC truth are reachable.",
	}
	attention := func(detail string) {
		diagnostics.Status = "attention"
		diagnostics.Details = detail
	}

	if db == nil {
		attention("Administration database is not configured.")
		return diagnostics
	}

	var pendingRoleDefinitions, pendingAssignments, pendingRollbacks, appliedAssignments, recentRestrictedAudit int
	err := db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM dsh_admin_role_definition_requests WHERE status = 'pending'),
			(SELECT COUNT(*) FROM dsh_admin_approval_requests WHERE status = 'pending'),
			(SELECT COUNT(*) FROM dsh_admin_rollback_requests WHERE status = 'pending'),
			(SELECT COUNT(*)
			 FROM dsh_admin_approval_requests request
			 JOIN dsh_admin_canonical_mutation_intents intent
			   ON intent.operation_type = 'role-assignment' AND intent.request_id = request.id
			 WHERE request.status = 'approved' AND intent.status = 'applied'),
			(SELECT COUNT(*) FROM dsh_admin_audit
			 WHERE sensitivity = 'restricted' AND created_at >= NOW() - INTERVAL '24 hours')
	`).Scan(
		&pendingRoleDefinitions, &pendingAssignments, &pendingRollbacks,
		&appliedAssignments, &recentRestrictedAudit,
	)
	if err != nil {
		attention("Administration database is unavailable.")
	} else {
		diagnostics.PendingRoleDefinitionCount = pendingRoleDefinitions
		diagnostics.PendingRoleAssignmentCount = pendingAssignments
		diagnostics.PendingRollbackCount = pendingRollbacks
		diagnostics.ApprovedAssignmentCount = appliedAssignments
		diagnostics.RecentRestrictedAuditCount = recentRestrictedAudit
	}

	if identityClient == nil {
		attention("Identity RBAC truth is not configured.")
		return diagnostics
	}
	roles, err := ListRoles(ctx, identityClient)
	if err != nil {
		attention("Identity RBAC truth is unavailable.")
		return diagnostics
	}
	for _, role := range roles {
		if role.Active {
			diagnostics.ActiveRoleCount++
		}
	}
	return diagnostics
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
