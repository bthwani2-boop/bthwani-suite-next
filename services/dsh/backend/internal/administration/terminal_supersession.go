package administration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/auth"
	"github.com/lib/pq"
)

// SupersedeTerminalFailureParams carries the optimistic fence for the failed
// source and a privacy-safe reason code. ReplacementReason belongs only to the
// new maker request; the old request reason and checker decision stay intact.
type SupersedeTerminalFailureParams struct {
	ExpectedVersion   int    `json:"expectedVersion"`
	ReasonCode        string `json:"reasonCode"`
	ReplacementReason string `json:"replacementReason"`
}

func normalizeTerminalSupersessionParams(params SupersedeTerminalFailureParams) (SupersedeTerminalFailureParams, error) {
	params.ReasonCode = strings.TrimSpace(params.ReasonCode)
	params.ReplacementReason = strings.TrimSpace(params.ReplacementReason)
	if params.ExpectedVersion < 1 || len(params.ReplacementReason) < 5 || !validSupersessionReasonCode(params.ReasonCode) {
		return SupersedeTerminalFailureParams{}, ErrInvalid
	}
	return params, nil
}

func validSupersessionReasonCode(value string) bool {
	if len(value) < 3 || len(value) > 64 || value[0] < 'a' || value[0] > 'z' {
		return false
	}
	for index := 1; index < len(value); index++ {
		current := value[index]
		if (current < 'a' || current > 'z') && (current < '0' || current > '9') && current != '_' {
			return false
		}
	}
	return true
}

func requireCurrentCanonicalRole(ctx context.Context, identityClient *auth.Client, roleName string) (auth.RbacRoleDefinition, error) {
	if identityClient == nil {
		return auth.RbacRoleDefinition{}, ErrIdentityUnavailable
	}
	definition, err := identityClient.GetRoleDefinition(ctx, roleName)
	if err != nil {
		if errors.Is(err, auth.ErrRbacRoleNotFound) {
			return auth.RbacRoleDefinition{}, ErrNotFound
		}
		return auth.RbacRoleDefinition{}, ErrIdentityUnavailable
	}
	return definition, nil
}

func lockFailedTerminalIntentTx(ctx context.Context, tx *sql.Tx, operationType, requestID string) error {
	var status string
	if err := tx.QueryRowContext(ctx, `
		SELECT status
		FROM dsh_admin_canonical_mutation_intents
		WHERE operation_type = $1 AND request_id = $2
		FOR UPDATE
	`, operationType, requestID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: request has no canonical execution", ErrConflict)
		}
		return err
	}
	if status != "failed_terminal" {
		return fmt.Errorf("%w: canonical execution is not failed terminal", ErrConflict)
	}
	return nil
}

func supersessionConflict(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && (pqErr.Code == "23505" || pqErr.Code == "23514" || pqErr.Code == "23503") {
		return ErrConflict
	}
	return err
}

func appendTerminalSupersessionAuditTx(ctx context.Context, tx *sql.Tx, actorID, action, operationType, oldRequestID, replacementRequestID string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit
			(actor_id, action, target_id, detail, sensitivity, correlation_id, metadata)
		VALUES
			($1, $2, $3,
			 jsonb_build_object(
			   'request_id', $5::text,
			   'decision', 'superseded',
			   'action_type', $4::text,
			   'reason_provided', TRUE
			 )::text,
			 'restricted', $3,
			 jsonb_build_object(
			   'request_id', $5::text,
			   'decision', 'superseded',
			   'action_type', $4::text,
			   'reason_provided', TRUE
			 ))
	`, actorID, action, oldRequestID, operationType, replacementRequestID)
	return err
}

// SupersedeFailedRoleAssignmentApproval atomically freezes a failed terminal
// assignment/revocation request and creates a fresh maker request. It never
// changes or re-enqueues the old canonical intent.
func SupersedeFailedRoleAssignmentApproval(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID, requestID string, params SupersedeTerminalFailureParams) (*RoleAssignmentApproval, error) {
	if db == nil || strings.TrimSpace(actorID) == "" || strings.TrimSpace(requestID) == "" {
		return nil, ErrInvalid
	}
	params, err := normalizeTerminalSupersessionParams(params)
	if err != nil {
		return nil, err
	}

	var preflightRoleName string
	if err := db.QueryRowContext(ctx, `SELECT role_name FROM dsh_admin_approval_requests WHERE id = $1`, requestID).Scan(&preflightRoleName); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	currentRole, err := requireCurrentCanonicalRole(ctx, identityClient, preflightRoleName)
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var old RoleAssignmentApproval
	if err := tx.QueryRowContext(ctx, `
		SELECT id, action_type, target_actor_id, role_name, COALESCE(expected_role_version, 0), requested_by, reason, status, version
		FROM dsh_admin_approval_requests
		WHERE id = $1
		FOR UPDATE
	`, requestID).Scan(
		&old.ID, &old.ActionType, &old.TargetActorID, &old.RoleName, &old.ExpectedRoleVersion, &old.RequestedBy,
		&old.Reason, &old.Status, &old.Version,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if old.Status != "pending" || old.Version != params.ExpectedVersion || old.RoleName != preflightRoleName || actorID == old.TargetActorID {
		return nil, ErrConflict
	}
	if err := lockFailedTerminalIntentTx(ctx, tx, "role-assignment", old.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_admin_approval_requests
		SET status = 'superseded', superseded_by = $1, superseded_reason_code = $2,
		    superseded_at = NOW(), version = version + 1, updated_at = NOW()
		WHERE id = $3 AND status = 'pending' AND version = $4
	`, actorID, params.ReasonCode, old.ID, old.Version); err != nil {
		return nil, supersessionConflict(err)
	}

	var replacement RoleAssignmentApproval
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_approval_requests
			(action_type, target_actor_id, role_name, expected_role_version, requested_by, reason, status, supersedes_request_id)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
		RETURNING id, action_type, target_actor_id, role_name, expected_role_version, requested_by, reason, status,
		          version, created_at, updated_at
	`, old.ActionType, old.TargetActorID, old.RoleName, currentRole.Version, actorID, params.ReplacementReason, old.ID).Scan(
		&replacement.ID, &replacement.ActionType, &replacement.TargetActorID, &replacement.RoleName,
		&replacement.ExpectedRoleVersion, &replacement.RequestedBy, &replacement.Reason, &replacement.Status, &replacement.Version,
		&replacement.CreatedAt, &replacement.UpdatedAt,
	); err != nil {
		return nil, supersessionConflict(err)
	}
	if err := appendTerminalSupersessionAuditTx(ctx, tx, actorID, "ROLE_ASSIGNMENT_SUPERSEDED", "role-assignment", old.ID, replacement.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, supersessionConflict(err)
	}
	replacement.ExecutionStatus = "not_started"
	return &replacement, nil
}

type roleDefinitionSupersessionPreflight struct {
	roleName        string
	description     string
	active          bool
	permissionsJSON []byte
	surfacesJSON    []byte
	version         int
}

// SupersedeFailedRoleDefinitionRequest creates the replacement against the
// current Identity role version and current permission vocabulary.
func SupersedeFailedRoleDefinitionRequest(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID, requestID string, params SupersedeTerminalFailureParams) (*RoleDefinitionRequest, error) {
	if db == nil || strings.TrimSpace(actorID) == "" || strings.TrimSpace(requestID) == "" {
		return nil, ErrInvalid
	}
	params, err := normalizeTerminalSupersessionParams(params)
	if err != nil {
		return nil, err
	}

	var preflight roleDefinitionSupersessionPreflight
	if err := db.QueryRowContext(ctx, `
		SELECT role_name, description, active, permissions, surfaces, version
		FROM dsh_admin_role_definition_requests
		WHERE id = $1
	`, requestID).Scan(
		&preflight.roleName, &preflight.description, &preflight.active,
		&preflight.permissionsJSON, &preflight.surfacesJSON, &preflight.version,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if preflight.version != params.ExpectedVersion {
		return nil, ErrConflict
	}
	var requestedActions []string
	if err := json.Unmarshal(preflight.permissionsJSON, &requestedActions); err != nil {
		return nil, ErrInvalid
	}
	_, normalizedActions, err := canonicalPermissionsForRoleRequest(ctx, identityClient, requestedActions)
	if err != nil {
		return nil, err
	}
	permissionsJSON, err := json.Marshal(normalizedActions)
	if err != nil {
		return nil, err
	}
	currentRoleVersion := 0
	if identityClient == nil {
		return nil, ErrIdentityUnavailable
	}
	if definition, getErr := identityClient.GetRoleDefinition(ctx, preflight.roleName); getErr == nil {
		currentRoleVersion = definition.Version
	} else if !errors.Is(getErr, auth.ErrRbacRoleNotFound) {
		return nil, ErrIdentityUnavailable
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var old RoleDefinitionRequest
	var lockedPermissions, lockedSurfaces []byte
	if err := tx.QueryRowContext(ctx, `
		SELECT id, role_name, description, active, expected_role_version, permissions, surfaces,
		       requested_by, reason, status, version
		FROM dsh_admin_role_definition_requests
		WHERE id = $1
		FOR UPDATE
	`, requestID).Scan(
		&old.ID, &old.RoleName, &old.Description, &old.Active, &old.ExpectedRoleVersion,
		&lockedPermissions, &lockedSurfaces, &old.RequestedBy, &old.Reason, &old.Status, &old.Version,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if old.Status != "pending" || old.Version != params.ExpectedVersion || old.RoleName != preflight.roleName ||
		old.Description != preflight.description || old.Active != preflight.active ||
		!bytes.Equal(lockedPermissions, preflight.permissionsJSON) || !bytes.Equal(lockedSurfaces, preflight.surfacesJSON) {
		return nil, ErrConflict
	}
	if err := lockFailedTerminalIntentTx(ctx, tx, "role-definition-upsert", old.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_admin_role_definition_requests
		SET status = 'superseded', superseded_by = $1, superseded_reason_code = $2,
		    superseded_at = NOW(), version = version + 1, updated_at = NOW()
		WHERE id = $3 AND status = 'pending' AND version = $4
	`, actorID, params.ReasonCode, old.ID, old.Version); err != nil {
		return nil, supersessionConflict(err)
	}

	var replacement RoleDefinitionRequest
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_role_definition_requests
			(role_name, description, active, expected_role_version, permissions, surfaces,
			 requested_by, reason, status, supersedes_request_id)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'pending', $9)
		RETURNING id, role_name, description, active, expected_role_version, permissions, surfaces,
		          requested_by, reason, status, version, created_at, updated_at
	`, old.RoleName, old.Description, old.Active, currentRoleVersion, string(permissionsJSON), string(lockedSurfaces),
		actorID, params.ReplacementReason, old.ID).Scan(
		&replacement.ID, &replacement.RoleName, &replacement.Description, &replacement.Active,
		&replacement.ExpectedRoleVersion, &permissionsJSON, &lockedSurfaces, &replacement.RequestedBy,
		&replacement.Reason, &replacement.Status, &replacement.Version, &replacement.CreatedAt, &replacement.UpdatedAt,
	); err != nil {
		return nil, supersessionConflict(err)
	}
	if err := json.Unmarshal(permissionsJSON, &replacement.Permissions); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(lockedSurfaces, &replacement.Surfaces); err != nil {
		return nil, err
	}
	if err := appendTerminalSupersessionAuditTx(ctx, tx, actorID, "ROLE_DEFINITION_SUPERSEDED", "role-definition-upsert", old.ID, replacement.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, supersessionConflict(err)
	}
	replacement.ExecutionStatus = "not_started"
	return &replacement, nil
}

// SupersedeFailedRollbackRequest preserves the original approved source and
// creates a new pending inverse request with a new maker/checker decision.
func SupersedeFailedRollbackRequest(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID, requestID string, params SupersedeTerminalFailureParams) (*RollbackRequest, error) {
	if db == nil || strings.TrimSpace(actorID) == "" || strings.TrimSpace(requestID) == "" {
		return nil, ErrInvalid
	}
	params, err := normalizeTerminalSupersessionParams(params)
	if err != nil {
		return nil, err
	}

	var preflightRoleName string
	if err := db.QueryRowContext(ctx, `SELECT role_name FROM dsh_admin_rollback_requests WHERE id = $1`, requestID).Scan(&preflightRoleName); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	currentRole, err := requireCurrentCanonicalRole(ctx, identityClient, preflightRoleName)
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var old RollbackRequest
	var sourceStatus string
	if err := tx.QueryRowContext(ctx, `
		SELECT rollback.id, rollback.source_approval_id, source.action_type,
		       rollback.inverse_action_type, rollback.target_actor_id, rollback.role_name, COALESCE(rollback.expected_role_version, 0),
		       rollback.requested_by, rollback.reason, rollback.status, rollback.version,
		       COALESCE(source.reviewed_by, ''), source.status
		FROM dsh_admin_rollback_requests AS rollback
		JOIN dsh_admin_approval_requests AS source ON source.id = rollback.source_approval_id
		WHERE rollback.id = $1
		FOR UPDATE OF rollback
	`, requestID).Scan(
		&old.ID, &old.SourceApprovalID, &old.SourceActionType, &old.InverseActionType,
		&old.TargetActorID, &old.RoleName, &old.ExpectedRoleVersion, &old.RequestedBy, &old.Reason, &old.Status,
		&old.Version, &old.SourceApprovedBy, &sourceStatus,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if old.Status != "pending" || old.Version != params.ExpectedVersion || old.RoleName != preflightRoleName ||
		sourceStatus != "approved" || actorID == old.TargetActorID {
		return nil, ErrConflict
	}
	if err := lockFailedTerminalIntentTx(ctx, tx, "role-rollback", old.ID); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_admin_rollback_requests
		SET status = 'superseded', superseded_by = $1, superseded_reason_code = $2,
		    superseded_at = NOW(), version = version + 1, updated_at = NOW()
		WHERE id = $3 AND status = 'pending' AND version = $4
	`, actorID, params.ReasonCode, old.ID, old.Version); err != nil {
		return nil, supersessionConflict(err)
	}

	var replacement RollbackRequest
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_rollback_requests
			(source_approval_id, inverse_action_type, target_actor_id, role_name, expected_role_version,
			 requested_by, reason, status, supersedes_request_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
		RETURNING id, source_approval_id, inverse_action_type, target_actor_id, role_name, expected_role_version,
		          requested_by, reason, status, version, created_at, updated_at
	`, old.SourceApprovalID, old.InverseActionType, old.TargetActorID, old.RoleName, currentRole.Version,
		actorID, params.ReplacementReason, old.ID).Scan(
		&replacement.ID, &replacement.SourceApprovalID, &replacement.InverseActionType,
		&replacement.TargetActorID, &replacement.RoleName, &replacement.ExpectedRoleVersion, &replacement.RequestedBy,
		&replacement.Reason, &replacement.Status, &replacement.Version,
		&replacement.CreatedAt, &replacement.UpdatedAt,
	); err != nil {
		return nil, supersessionConflict(err)
	}
	replacement.SourceActionType = old.SourceActionType
	replacement.SourceApprovedBy = old.SourceApprovedBy
	if err := appendTerminalSupersessionAuditTx(ctx, tx, actorID, "ROLLBACK_SUPERSEDED", "role-rollback", old.ID, replacement.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, supersessionConflict(err)
	}
	replacement.ExecutionStatus = "not_started"
	return &replacement, nil
}
