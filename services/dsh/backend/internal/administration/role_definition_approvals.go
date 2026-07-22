package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"sort"
	"strings"
	"time"
)

var roleNamePattern = regexp.MustCompile(`^[a-z][a-z0-9-]{2,79}$`)

var governedAdministrationPermissions = map[string]struct{}{
	"administration.read":             {},
	"administration.manage":           {},
	"administration.approve":          {},
	"administration.role.request":     {},
	"administration.role.approve":     {},
	"administration.staff.request":    {},
	"administration.staff.approve":    {},
	"administration.audit.read":       {},
	"administration.diagnostics.read": {},
	"administration.rollback.request": {},
	"administration.rollback.approve": {},
}

var governedAdministrationSurfaces = map[string]struct{}{
	"control-panel": {},
	"app-client":    {},
	"app-partner":   {},
	"app-captain":   {},
	"app-field":     {},
	"webapp":        {},
	"website":       {},
}

type RoleDefinitionRequest struct {
	ID          string     `json:"id"`
	RoleName    string     `json:"roleName"`
	Description string     `json:"description"`
	Permissions []string   `json:"permissions"`
	Surfaces    []string   `json:"surfaces"`
	RequestedBy string     `json:"requestedBy"`
	Reason      string     `json:"reason"`
	Status      string     `json:"status"`
	ReviewedBy  string     `json:"reviewedBy"`
	ReviewNote  string     `json:"reviewNote"`
	Version     int        `json:"version"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
}

func normalizeRoleDefinition(name string, permissions []string, surfaces []string) (string, []string, []string, error) {
	name = strings.ToLower(strings.TrimSpace(name))
	if !roleNamePattern.MatchString(name) {
		return "", nil, nil, ErrInvalid
	}
	permissionSet := make(map[string]struct{}, len(permissions))
	for _, permission := range permissions {
		permission = strings.TrimSpace(permission)
		if _, allowed := governedAdministrationPermissions[permission]; !allowed {
			return "", nil, nil, ErrInvalid
		}
		permissionSet[permission] = struct{}{}
	}
	if len(permissionSet) == 0 {
		return "", nil, nil, ErrInvalid
	}
	normalizedPermissions := make([]string, 0, len(permissionSet))
	for permission := range permissionSet {
		normalizedPermissions = append(normalizedPermissions, permission)
	}
	sort.Strings(normalizedPermissions)

	surfaceSet := make(map[string]struct{}, len(surfaces))
	for _, surface := range surfaces {
		surface = strings.ToLower(strings.TrimSpace(surface))
		if _, allowed := governedAdministrationSurfaces[surface]; !allowed {
			return "", nil, nil, ErrInvalid
		}
		surfaceSet[surface] = struct{}{}
	}
	if len(surfaceSet) == 0 {
		surfaceSet["control-panel"] = struct{}{}
	}
	if _, hasControlPanel := surfaceSet["control-panel"]; !hasControlPanel {
		return "", nil, nil, ErrInvalid
	}
	normalizedSurfaces := make([]string, 0, len(surfaceSet))
	for surface := range surfaceSet {
		normalizedSurfaces = append(normalizedSurfaces, surface)
	}
	sort.Strings(normalizedSurfaces)
	return name, normalizedPermissions, normalizedSurfaces, nil
}

func scanRoleDefinition(scanner interface{ Scan(...any) error }) (RoleDefinitionRequest, error) {
	var out RoleDefinitionRequest
	var permissionsJSON, surfacesJSON []byte
	if err := scanner.Scan(
		&out.ID,
		&out.RoleName,
		&out.Description,
		&permissionsJSON,
		&surfacesJSON,
		&out.RequestedBy,
		&out.Reason,
		&out.Status,
		&out.ReviewedBy,
		&out.ReviewNote,
		&out.Version,
		&out.CreatedAt,
		&out.UpdatedAt,
		&out.ReviewedAt,
	); err != nil {
		return RoleDefinitionRequest{}, err
	}
	if err := json.Unmarshal(permissionsJSON, &out.Permissions); err != nil {
		return RoleDefinitionRequest{}, err
	}
	if err := json.Unmarshal(surfacesJSON, &out.Surfaces); err != nil {
		return RoleDefinitionRequest{}, err
	}
	return out, nil
}

func RequestRoleDefinition(
	ctx context.Context,
	db *sql.DB,
	roleName string,
	description string,
	permissions []string,
	surfaces []string,
	requestedBy string,
	reason string,
) (RoleDefinitionRequest, error) {
	requestedBy = strings.TrimSpace(requestedBy)
	reason = strings.TrimSpace(reason)
	description = strings.TrimSpace(description)
	roleName, permissions, surfaces, err := normalizeRoleDefinition(roleName, permissions, surfaces)
	if err != nil || db == nil || requestedBy == "" || len(reason) < 5 {
		return RoleDefinitionRequest{}, ErrInvalid
	}
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return RoleDefinitionRequest{}, err
	}
	surfacesJSON, err := json.Marshal(surfaces)
	if err != nil {
		return RoleDefinitionRequest{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RoleDefinitionRequest{}, err
	}
	defer tx.Rollback()

	request, err := scanRoleDefinition(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_role_definition_requests
			(role_name, description, permissions, surfaces, requested_by, reason)
		SELECT $1, $2, $3::jsonb, $4::jsonb, $5, $6
		WHERE NOT EXISTS (SELECT 1 FROM dsh_admin_roles WHERE lower(name) = lower($1))
		RETURNING id::TEXT, role_name, description, permissions, surfaces, requested_by,
		          reason, status, COALESCE(reviewed_by,''), COALESCE(review_note,''),
		          version, created_at, updated_at, reviewed_at`,
		roleName, description, string(permissionsJSON), string(surfacesJSON), requestedBy, reason))
	if errors.Is(err, sql.ErrNoRows) {
		return RoleDefinitionRequest{}, ErrApprovalConflict
	}
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return RoleDefinitionRequest{}, ErrApprovalConflict
		}
		return RoleDefinitionRequest{}, err
	}
	if err := writeAdminAudit(ctx, tx, requestedBy, "role_definition_requested", roleName, map[string]string{
		"permission_count": stringCount(len(permissions)),
		"surface_count":    stringCount(len(surfaces)),
		"reason_provided":  "true",
	}); err != nil {
		return RoleDefinitionRequest{}, err
	}
	if err := tx.Commit(); err != nil {
		return RoleDefinitionRequest{}, err
	}
	return request, nil
}

func ListRoleDefinitionRequests(
	ctx context.Context,
	db *sql.DB,
	status string,
	limit int,
) ([]RoleDefinitionRequest, error) {
	status = strings.TrimSpace(status)
	if db == nil || (status != "" && status != "pending" && status != "approved" && status != "rejected") {
		return nil, ErrInvalid
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id::TEXT, role_name, description, permissions, surfaces, requested_by,
		       reason, status, COALESCE(reviewed_by,''), COALESCE(review_note,''),
		       version, created_at, updated_at, reviewed_at
		FROM dsh_admin_role_definition_requests
		WHERE ($1 = '' OR status = $1)
		ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RoleDefinitionRequest, 0)
	for rows.Next() {
		request, scanErr := scanRoleDefinition(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		out = append(out, request)
	}
	return out, rows.Err()
}

func ReviewRoleDefinition(
	ctx context.Context,
	db *sql.DB,
	requestID string,
	checkerActorID string,
	decision string,
	reviewNote string,
	expectedVersion int,
) (RoleDefinitionRequest, *Role, error) {
	requestID = strings.TrimSpace(requestID)
	checkerActorID = strings.TrimSpace(checkerActorID)
	decision = strings.TrimSpace(decision)
	reviewNote = strings.TrimSpace(reviewNote)
	if db == nil || requestID == "" || checkerActorID == "" || expectedVersion < 1 ||
		(decision != "approved" && decision != "rejected") ||
		(decision == "rejected" && len(reviewNote) < 5) {
		return RoleDefinitionRequest{}, nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RoleDefinitionRequest{}, nil, err
	}
	defer tx.Rollback()

	current, err := scanRoleDefinition(tx.QueryRowContext(ctx, `
		SELECT id::TEXT, role_name, description, permissions, surfaces, requested_by,
		       reason, status, COALESCE(reviewed_by,''), COALESCE(review_note,''),
		       version, created_at, updated_at, reviewed_at
		FROM dsh_admin_role_definition_requests
		WHERE id = $1
		FOR UPDATE`, requestID))
	if errors.Is(err, sql.ErrNoRows) {
		return RoleDefinitionRequest{}, nil, ErrNotFound
	}
	if err != nil {
		return RoleDefinitionRequest{}, nil, err
	}
	if current.Status != "pending" || current.Version != expectedVersion {
		return RoleDefinitionRequest{}, nil, ErrApprovalConflict
	}
	if current.RequestedBy == checkerActorID {
		return RoleDefinitionRequest{}, nil, ErrSelfApproval
	}

	var createdRole *Role
	if decision == "approved" {
		permissionsJSON, marshalErr := json.Marshal(current.Permissions)
		if marshalErr != nil {
			return RoleDefinitionRequest{}, nil, marshalErr
		}
		surfacesJSON, marshalErr := json.Marshal(current.Surfaces)
		if marshalErr != nil {
			return RoleDefinitionRequest{}, nil, marshalErr
		}
		var role Role
		var rolePermissionsJSON, roleSurfacesJSON []byte
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_admin_roles (name, description, permissions, surfaces)
			VALUES ($1, $2, $3::jsonb, $4::jsonb)
			RETURNING id::TEXT, name, COALESCE(description,''), permissions, surfaces,
			          active, version, created_at`,
			current.RoleName, current.Description, string(permissionsJSON), string(surfacesJSON)).Scan(
			&role.ID, &role.Name, &role.Description, &rolePermissionsJSON, &roleSurfacesJSON,
			&role.Active, &role.Version, &role.CreatedAt,
		)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
				return RoleDefinitionRequest{}, nil, ErrApprovalConflict
			}
			return RoleDefinitionRequest{}, nil, err
		}
		if err := json.Unmarshal(rolePermissionsJSON, &role.Permissions); err != nil {
			return RoleDefinitionRequest{}, nil, err
		}
		if err := json.Unmarshal(roleSurfacesJSON, &role.Surfaces); err != nil {
			return RoleDefinitionRequest{}, nil, err
		}
		createdRole = &role
	}

	reviewed, err := scanRoleDefinition(tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_role_definition_requests
		SET status = $2, reviewed_by = $3, review_note = $4,
		    reviewed_at = NOW(), updated_at = NOW(), version = version + 1
		WHERE id = $1 AND status = 'pending' AND version = $5
		RETURNING id::TEXT, role_name, description, permissions, surfaces, requested_by,
		          reason, status, COALESCE(reviewed_by,''), COALESCE(review_note,''),
		          version, created_at, updated_at, reviewed_at`,
		requestID, decision, checkerActorID, reviewNote, expectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return RoleDefinitionRequest{}, nil, ErrApprovalConflict
	}
	if err != nil {
		return RoleDefinitionRequest{}, nil, err
	}
	if err := writeAdminAudit(ctx, tx, checkerActorID, "role_definition_"+decision, current.RoleName, map[string]string{
		"request_id":    requestID,
		"decision":      decision,
		"note_provided": boolText(reviewNote != ""),
	}); err != nil {
		return RoleDefinitionRequest{}, nil, err
	}
	if err := tx.Commit(); err != nil {
		return RoleDefinitionRequest{}, nil, err
	}
	return reviewed, createdRole, nil
}

func stringCount(value int) string {
	if value == 0 {
		return "0"
	}
	const digits = "0123456789"
	result := ""
	for value > 0 {
		result = string(digits[value%10]) + result
		value /= 10
	}
	return result
}
