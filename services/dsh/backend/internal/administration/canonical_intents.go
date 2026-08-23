package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

const canonicalMutationLeaseDuration = 30 * time.Second

type canonicalMutationIntent struct {
	operationType string
	requestID     string
	payload       []byte
	attempts      int
}

type roleMutationIntentPayload struct {
	TargetActorID string `json:"targetActorId"`
	RoleName      string `json:"roleName"`
	ActionType    string `json:"actionType"`
	ReviewerID    string `json:"reviewerId"`
	ReviewNote    string `json:"reviewNote,omitempty"`
}

type roleDefinitionIntentPayload struct {
	RoleName        string            `json:"roleName"`
	Description     string            `json:"description"`
	Active          bool              `json:"active"`
	ExpectedVersion int               `json:"expectedVersion"`
	Permissions     []auth.Permission `json:"permissions"`
	ReviewerID      string            `json:"reviewerId"`
	ReviewNote      string            `json:"reviewNote,omitempty"`
}

// enqueueCanonicalMutation persists the intent before crossing the Identity
// service boundary. Identity remains the mutation authority; this row is only
// the durable DSH reconciliation obligation.
func enqueueCanonicalMutation(ctx context.Context, db *sql.DB, operationType, requestID, payload string) error {
	if db == nil || strings.TrimSpace(operationType) == "" || strings.TrimSpace(requestID) == "" {
		return ErrInvalid
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(operation_type, request_id, payload, status, attempts, next_attempt_at)
		VALUES ($1, $2, $3::jsonb, 'pending', 0, NOW())
		ON CONFLICT (operation_type, request_id) DO NOTHING
	`, operationType, requestID, payload)
	return err
}

func enqueueCanonicalMutationTx(ctx context.Context, tx *sql.Tx, operationType, requestID, payload string) error {
	if tx == nil || strings.TrimSpace(operationType) == "" || strings.TrimSpace(requestID) == "" {
		return ErrInvalid
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(operation_type, request_id, payload, status, attempts, next_attempt_at)
		VALUES ($1, $2, $3::jsonb, 'pending', 0, NOW())
		ON CONFLICT (operation_type, request_id) DO NOTHING
	`, operationType, requestID, payload)
	return err
}

func markCanonicalMutationState(ctx context.Context, db *sql.DB, operationType, requestID, status, lastError, leaseOwner string, terminal bool) error {
	if db == nil {
		return ErrInvalid
	}
	operationType = strings.TrimSpace(operationType)
	requestID = strings.TrimSpace(requestID)
	if operationType == "" || requestID == "" || (status != "applied" && status != "failed") {
		return ErrInvalid
	}

	var result sql.Result
	var err error
	if status == "applied" {
		result, err = db.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'applied',
			    attempts = attempts + 1,
			    last_error = NULL,
			    next_attempt_at = NULL,
			    terminal_failure = FALSE,
			    lease_owner = NULL,
			    lease_expires_at = NULL,
			    updated_at = NOW()
			WHERE operation_type = $1 AND request_id = $2
			  AND ($3 = '' OR lease_owner = $3)
		`, operationType, requestID, leaseOwner)
	} else if terminal {
		result, err = db.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'failed',
			    attempts = attempts + 1,
			    last_error = NULLIF($1, ''),
			    next_attempt_at = NULL,
			    terminal_failure = TRUE,
			    lease_owner = NULL,
			    lease_expires_at = NULL,
			    updated_at = NOW()
			WHERE operation_type = $2 AND request_id = $3
			  AND ($4 = '' OR lease_owner = $4)
		`, strings.TrimSpace(lastError), operationType, requestID, leaseOwner)
	} else {
		result, err = db.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'failed',
			    attempts = attempts + 1,
			    last_error = NULLIF($1, ''),
			    next_attempt_at = NOW() + make_interval(secs => LEAST(300, (5 * power(2, LEAST(attempts, 6)))::int)),
			    terminal_failure = FALSE,
			    lease_owner = NULL,
			    lease_expires_at = NULL,
			    updated_at = NOW()
			WHERE operation_type = $2 AND request_id = $3
			  AND ($4 = '' OR lease_owner = $4)
		`, strings.TrimSpace(lastError), operationType, requestID, leaseOwner)
	}
	if err != nil {
		return err
	}
	if leaseOwner != "" {
		rows, rowsErr := result.RowsAffected()
		if rowsErr != nil {
			return rowsErr
		}
		if rows != 1 {
			return errors.New("canonical mutation lease lost")
		}
	}
	return nil
}

func markCanonicalMutation(ctx context.Context, db *sql.DB, operationType, requestID, status, lastError string) error {
	return markCanonicalMutationState(ctx, db, operationType, requestID, status, lastError, "", false)
}

func claimCanonicalMutations(ctx context.Context, db *sql.DB, limit int, leaseOwner string) ([]canonicalMutationIntent, error) {
	leaseSeconds := int(canonicalMutationLeaseDuration / time.Second)
	rows, err := db.QueryContext(ctx, `
		WITH candidates AS (
			SELECT id
			FROM dsh_admin_canonical_mutation_intents
			WHERE status <> 'applied'
			  AND terminal_failure = FALSE
			  AND next_attempt_at IS NOT NULL
			  AND next_attempt_at <= NOW()
			  AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
			ORDER BY created_at
			FOR UPDATE SKIP LOCKED
			LIMIT $1
		)
		UPDATE dsh_admin_canonical_mutation_intents AS intent
		SET lease_owner = $2,
		    lease_expires_at = NOW() + make_interval(secs => $3),
		    updated_at = NOW()
		FROM candidates
		WHERE intent.id = candidates.id
		RETURNING intent.operation_type, intent.request_id, intent.payload, intent.attempts
	`, limit, leaseOwner, leaseSeconds)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	intents := make([]canonicalMutationIntent, 0, limit)
	for rows.Next() {
		var current canonicalMutationIntent
		if err := rows.Scan(&current.operationType, &current.requestID, &current.payload, &current.attempts); err != nil {
			return nil, err
		}
		intents = append(intents, current)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return intents, nil
}

func markIntentRetry(ctx context.Context, db *sql.DB, current canonicalMutationIntent, leaseOwner string, err error) (bool, error) {
	message := "canonical mutation retry required"
	if err != nil && strings.TrimSpace(err.Error()) != "" {
		message = err.Error()
	}
	return false, markCanonicalMutationState(ctx, db, current.operationType, current.requestID, "failed", message, leaseOwner, false)
}

func markIntentTerminal(ctx context.Context, db *sql.DB, current canonicalMutationIntent, leaseOwner, message string) (bool, error) {
	return false, markCanonicalMutationState(ctx, db, current.operationType, current.requestID, "failed", message, leaseOwner, true)
}

func markIntentApplied(ctx context.Context, db *sql.DB, current canonicalMutationIntent, leaseOwner string) (bool, error) {
	if err := markCanonicalMutationState(ctx, db, current.operationType, current.requestID, "applied", "", leaseOwner, false); err != nil {
		return false, err
	}
	return true, nil
}

func canonicalActorHasRole(ctx context.Context, identityClient *auth.Client, actorID, roleName string) (bool, error) {
	staff, err := identityClient.ListStaff(ctx)
	if err != nil {
		return false, err
	}
	for _, actor := range staff {
		if actor.ID != actorID {
			continue
		}
		for _, currentRole := range actor.Roles {
			if currentRole == roleName {
				return true, nil
			}
		}
		return false, nil
	}
	return false, nil
}

func applyCanonicalRoleMutation(ctx context.Context, identityClient *auth.Client, payload roleMutationIntentPayload, idempotencyKey string) error {
	desiredPresent := payload.ActionType == "staff_role_assignment"
	if !desiredPresent && payload.ActionType != "staff_role_revocation" {
		return errors.New("unsupported role mutation action")
	}

	present, err := canonicalActorHasRole(ctx, identityClient, payload.TargetActorID, payload.RoleName)
	if err != nil {
		return err
	}
	if present == desiredPresent {
		return nil
	}

	if desiredPresent {
		if _, err := identityClient.GrantRoleWithIdempotency(ctx, payload.TargetActorID, payload.RoleName, payload.ReviewerID, idempotencyKey); err != nil {
			return err
		}
	} else if err := identityClient.RevokeRoleWithIdempotency(ctx, payload.TargetActorID, payload.RoleName, payload.ReviewerID, idempotencyKey); err != nil {
		return err
	}

	present, err = canonicalActorHasRole(ctx, identityClient, payload.TargetActorID, payload.RoleName)
	if err != nil {
		return err
	}
	if present != desiredPresent {
		return errors.New("canonical actor-role readback mismatch")
	}
	return nil
}

func reconcileRoleAssignmentIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent, leaseOwner string) (bool, error) {
	var payload roleMutationIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "invalid role-assignment intent payload")
	}

	var targetActorID, roleName, actionType, requestedBy, status string
	var version int
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT target_actor_id, role_name, action_type, requested_by, status, version, reviewed_by
		FROM dsh_admin_approval_requests
		WHERE id = $1
	`, current.requestID).Scan(&targetActorID, &roleName, &actionType, &requestedBy, &status, &version, &reviewedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, leaseOwner, "role-assignment source request is missing")
		}
		return false, err
	}
	if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ActionType != actionType {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-assignment intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-assignment source request is not executable")
	}
	if err := validateRoleReviewSeparation(requestedBy, targetActorID, payload.ReviewerID); err != nil {
		return markIntentTerminal(ctx, db, current, leaseOwner, err.Error())
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-assignment reviewer drift detected")
	}

	if err := applyCanonicalRoleMutation(ctx, identityClient, payload, current.requestID); err != nil {
		return markIntentRetry(ctx, db, current, leaseOwner, err)
	}
	if status == "pending" {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return false, err
		}
		defer tx.Rollback()
		var updatedVersion int
		if err := tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_approval_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version
		`, payload.ReviewerID, payload.ReviewNote, current.requestID, version).Scan(&updatedVersion); err != nil {
			return markIntentRetry(ctx, db, current, leaseOwner, errors.New("role-assignment finalize version conflict"))
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, 'ROLE_ASSIGNMENT_APPROVED', $2, $3, 'HIGH', $4)
		`, payload.ReviewerID, current.requestID, "Reviewed "+actionType+" for role "+roleName+" and actor "+targetActorID, current.requestID); err != nil {
			return false, err
		}
		if err := tx.Commit(); err != nil {
			return false, err
		}
	}
	return markIntentApplied(ctx, db, current, leaseOwner)
}

func reconcileRoleRollbackIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent, leaseOwner string) (bool, error) {
	var payload roleMutationIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "invalid role-rollback intent payload")
	}

	var targetActorID, roleName, inverseActionType, requestedBy, status, sourceApprovedBy string
	var version int
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT rollback.target_actor_id, rollback.role_name, rollback.inverse_action_type,
		       rollback.requested_by, rollback.status, rollback.version, rollback.reviewed_by,
		       COALESCE(source.reviewed_by, '')
		FROM dsh_admin_rollback_requests rollback
		JOIN dsh_admin_approval_requests source ON source.id = rollback.source_approval_id
		WHERE rollback.id = $1
	`, current.requestID).Scan(&targetActorID, &roleName, &inverseActionType, &requestedBy, &status, &version, &reviewedBy, &sourceApprovedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, leaseOwner, "role-rollback source request is missing")
		}
		return false, err
	}
	if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ActionType != inverseActionType {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-rollback intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-rollback source request is not executable")
	}
	if err := validateRollbackReviewSeparation(requestedBy, targetActorID, sourceApprovedBy, payload.ReviewerID); err != nil {
		return markIntentTerminal(ctx, db, current, leaseOwner, err.Error())
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-rollback reviewer drift detected")
	}

	if err := applyCanonicalRoleMutation(ctx, identityClient, payload, current.requestID); err != nil {
		return markIntentRetry(ctx, db, current, leaseOwner, err)
	}
	if status == "pending" {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return false, err
		}
		defer tx.Rollback()
		var updatedVersion int
		if err := tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_rollback_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version
		`, payload.ReviewerID, payload.ReviewNote, current.requestID, version).Scan(&updatedVersion); err != nil {
			return markIntentRetry(ctx, db, current, leaseOwner, errors.New("role-rollback finalize version conflict"))
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, 'ROLLBACK_APPROVED', $2, $3, 'HIGH', $4)
		`, payload.ReviewerID, current.requestID, "Reviewed rollback for role "+roleName+" and actor "+targetActorID, current.requestID); err != nil {
			return false, err
		}
		if err := tx.Commit(); err != nil {
			return false, err
		}
	}
	return markIntentApplied(ctx, db, current, leaseOwner)
}

func permissionActions(permissions []auth.Permission) []string {
	actions := make([]string, 0, len(permissions))
	for _, permission := range permissions {
		actions = append(actions, permission.Action)
	}
	sort.Strings(actions)
	return actions
}

func reconcileRoleDefinitionIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent, leaseOwner string) (bool, error) {
	var payload roleDefinitionIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" || strings.TrimSpace(payload.RoleName) == "" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "invalid role-definition intent payload")
	}

	var roleName, description, requestedBy, status string
	var active bool
	var expectedVersion, version int
	var permissionsJSON []byte
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT role_name, description, active, expected_role_version, permissions,
		       requested_by, status, version, reviewed_by
		FROM dsh_admin_role_definition_requests
		WHERE id = $1
	`, current.requestID).Scan(&roleName, &description, &active, &expectedVersion, &permissionsJSON, &requestedBy, &status, &version, &reviewedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, leaseOwner, "role-definition source request is missing")
		}
		return false, err
	}
	var requestedActions []string
	if err := json.Unmarshal(permissionsJSON, &requestedActions); err != nil {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-definition permissions are invalid")
	}
	sort.Strings(requestedActions)
	payloadActions := permissionActions(payload.Permissions)
	if payload.RoleName != roleName || payload.Description != description || payload.Active != active || payload.ExpectedVersion != expectedVersion || strings.Join(payloadActions, "\x1f") != strings.Join(requestedActions, "\x1f") {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-definition intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-definition source request is not executable")
	}
	if requestedBy == payload.ReviewerID {
		return markIntentTerminal(ctx, db, current, leaseOwner, "cannot review own request")
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, leaseOwner, "role-definition reviewer drift detected")
	}

	req := RoleDefinitionRequest{
		RoleName:            roleName,
		Description:         description,
		Active:              active,
		ExpectedRoleVersion: expectedVersion,
	}
	converged := false
	readback, err := identityClient.GetRoleDefinition(ctx, roleName)
	if err == nil {
		converged = roleDefinitionMatchesRequest(readback, req, payload.Permissions)
	} else if !errors.Is(err, auth.ErrRbacRoleNotFound) {
		return markIntentRetry(ctx, db, current, leaseOwner, err)
	}
	if !converged {
		if _, err := identityClient.UpsertRoleDefinition(ctx, roleName, description, active, expectedVersion, payload.Permissions, current.requestID); err != nil {
			return markIntentRetry(ctx, db, current, leaseOwner, err)
		}
		readback, err = identityClient.GetRoleDefinition(ctx, roleName)
		if err != nil {
			return markIntentRetry(ctx, db, current, leaseOwner, err)
		}
		if !roleDefinitionMatchesRequest(readback, req, payload.Permissions) {
			return markIntentRetry(ctx, db, current, leaseOwner, errors.New("canonical role-definition readback mismatch"))
		}
	}

	if status == "pending" {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return false, err
		}
		defer tx.Rollback()
		var updatedVersion int
		if err := tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_role_definition_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version
		`, payload.ReviewerID, payload.ReviewNote, current.requestID, version).Scan(&updatedVersion); err != nil {
			return markIntentRetry(ctx, db, current, leaseOwner, errors.New("role-definition finalize version conflict"))
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, 'ROLE_DEFINITION_APPROVED', $2, $3, 'HIGH', $4)
		`, payload.ReviewerID, current.requestID, "Reviewed canonical role: "+roleName, current.requestID); err != nil {
			return false, err
		}
		if err := tx.Commit(); err != nil {
			return false, err
		}
	}
	return markIntentApplied(ctx, db, current, leaseOwner)
}

func reconcileCanonicalMutationIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent, leaseOwner string) (bool, error) {
	switch current.operationType {
	case "role-definition-upsert":
		return reconcileRoleDefinitionIntent(ctx, db, identityClient, current, leaseOwner)
	case "role-assignment":
		return reconcileRoleAssignmentIntent(ctx, db, identityClient, current, leaseOwner)
	case "role-rollback":
		return reconcileRoleRollbackIntent(ctx, db, identityClient, current, leaseOwner)
	default:
		return markIntentTerminal(ctx, db, current, leaseOwner, "unsupported mutation operation")
	}
}

// RetryPendingCanonicalMutations claims due intents with an expiring lease,
// reconciles Identity from canonical readback, and finalizes the DSH ledger
// without re-entering review functions that require the source row to be
// pending. This makes retries safe across process crashes and post-Identity
// finalize failures.
func RetryPendingCanonicalMutations(ctx context.Context, db *sql.DB, identityClient *auth.Client, limit int) (int, error) {
	if db == nil || identityClient == nil {
		return 0, ErrInvalid
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	leaseOwner := fmt.Sprintf("canonical-worker-%d", time.Now().UnixNano())
	intents, err := claimCanonicalMutations(ctx, db, limit, leaseOwner)
	if err != nil {
		return 0, err
	}

	completed := 0
	for _, current := range intents {
		applied, err := reconcileCanonicalMutationIntent(ctx, db, identityClient, current, leaseOwner)
		if err != nil {
			return completed, err
		}
		if applied {
			completed++
		}
	}
	return completed, nil
}

// RunCanonicalMutationWorker continuously reconciles durable canonical intents.
// The lease prevents concurrent workers from duplicating a claimed attempt; the
// Identity idempotency key and readback make retries safe after any crash window.
func RunCanonicalMutationWorker(ctx context.Context, db *sql.DB, identityClient *auth.Client, interval time.Duration) {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			workerCtx, cancel := context.WithTimeout(ctx, canonicalMutationLeaseDuration)
			_, _ = RetryPendingCanonicalMutations(workerCtx, db, identityClient, 25)
			cancel()
		}
	}
}
