package administration

import (
	"context"
	"database/sql"
	"dsh-api/internal/opctx"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"dsh-api/internal/auth"
)

const (
	canonicalMutationLeaseDuration    = 60 * time.Second
	canonicalMutationExecutionTimeout = 20 * time.Second
)

var (
	errCanonicalMutationLeaseLost   = errors.New("canonical mutation lease lost")
	errCanonicalMutationSourceDrift = errors.New("canonical mutation source drift")
)

type canonicalMutationIntent struct {
	operatorContextID string
	operationType     string
	requestID         string
	payload           []byte
	attempts          int
	leaseOwner        string
	leaseExpires      time.Time
	leaseGeneration   int64
}

type canonicalMutationResult struct {
	applied        bool
	assignment     *auth.RbacActorRoleAssignment
	roleDefinition *auth.RbacRoleDefinition
	dispositionErr error
}

type roleMutationIntentPayload struct {
	OperatorContextID   string `json:"operatorContextId"`
	TargetActorID       string `json:"targetActorId"`
	RoleName            string `json:"roleName"`
	ExpectedRoleVersion int    `json:"expectedRoleVersion"`
	ActionType          string `json:"actionType"`
	ReviewerID          string `json:"reviewerId"`
	ReviewNote          string `json:"reviewNote,omitempty"`
}

type roleDefinitionIntentPayload struct {
	OperatorContextID string            `json:"operatorContextId"`
	RoleName          string            `json:"roleName"`
	Description       string            `json:"description"`
	Active            bool              `json:"active"`
	ExpectedVersion   int               `json:"expectedVersion"`
	Permissions       []auth.Permission `json:"permissions"`
	ReviewerID        string            `json:"reviewerId"`
	ReviewNote        string            `json:"reviewNote,omitempty"`
}

func enqueueCanonicalMutationTx(ctx context.Context, tx *sql.Tx, operatorContextID, operationType, requestID, payload string) error {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if tx == nil || operatorContextID == "" || operatorContextID == legacyUnscopedOperatorContext || strings.TrimSpace(operationType) == "" || strings.TrimSpace(requestID) == "" {
		return ErrInvalid
	}
	result, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_canonical_mutation_intents
			(operator_context_id, operation_type, request_id, payload, status, attempts, next_attempt_at)
		VALUES ($1, $2, $3, $4::jsonb, 'pending', 0, NOW())
		ON CONFLICT (operator_context_id, operation_type, request_id) DO NOTHING
	`, operatorContextID, operationType, requestID, payload)
	if err != nil {
		return err
	}
	inserted, err := result.RowsAffected()
	if err != nil || inserted == 1 {
		return err
	}

	var matches bool
	if err := tx.QueryRowContext(ctx, `
		SELECT payload = $4::jsonb
		FROM dsh_admin_canonical_mutation_intents
		WHERE operator_context_id = $1 AND operation_type = $2 AND request_id = $3
	`, operatorContextID, operationType, requestID, payload).Scan(&matches); err != nil {
		return err
	}
	if !matches {
		return ErrConflict
	}
	return nil
}

func markCanonicalMutationFailure(ctx context.Context, db *sql.DB, current canonicalMutationIntent, lastError string, terminal bool) error {
	if db == nil || strings.TrimSpace(current.leaseOwner) == "" {
		return ErrInvalid
	}

	var result sql.Result
	var err error
	if terminal {
		result, err = db.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'failed_terminal',
			    attempts = attempts + 1,
			    last_error = NULLIF($1, ''),
			    next_attempt_at = NULL,
			    lease_owner = NULL,
			    lease_expires_at = NULL,
			    updated_at = NOW()
			WHERE operation_type = $2 AND request_id = $3
			  AND operator_context_id = $6
			  AND status IN ('pending', 'retryable_failure')
			  AND lease_owner = $4
			  AND lease_generation = $5
			  AND lease_expires_at > NOW()
		`, strings.TrimSpace(lastError), current.operationType, current.requestID, current.leaseOwner, current.leaseGeneration, current.operatorContextID)
	} else {
		result, err = db.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'retryable_failure',
			    attempts = attempts + 1,
			    last_error = NULLIF($1, ''),
			    next_attempt_at = NOW() + make_interval(secs => LEAST(300, (5 * power(2, LEAST(attempts, 6)))::int)),
			    lease_owner = NULL,
			    lease_expires_at = NULL,
			    updated_at = NOW()
			WHERE operation_type = $2 AND request_id = $3
			  AND operator_context_id = $6
			  AND status IN ('pending', 'retryable_failure')
			  AND lease_owner = $4
			  AND lease_generation = $5
			  AND lease_expires_at > NOW()
		`, strings.TrimSpace(lastError), current.operationType, current.requestID, current.leaseOwner, current.leaseGeneration, current.operatorContextID)
	}
	if err != nil {
		return err
	}
	rows, rowsErr := result.RowsAffected()
	if rowsErr != nil {
		return rowsErr
	}
	if rows != 1 {
		return errCanonicalMutationLeaseLost
	}
	return nil
}

func claimCanonicalMutations(ctx context.Context, db *sql.DB, limit int, leaseOwner string) ([]canonicalMutationIntent, error) {
	leaseSeconds := int(canonicalMutationLeaseDuration / time.Second)
	rows, err := db.QueryContext(ctx, `
		WITH candidates AS (
			SELECT id
			FROM dsh_admin_canonical_mutation_intents
			WHERE status IN ('pending', 'retryable_failure')
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
		    lease_generation = lease_generation + 1,
		    updated_at = NOW()
		FROM candidates
		WHERE intent.id = candidates.id
			RETURNING intent.operator_context_id, intent.operation_type, intent.request_id, intent.payload, intent.attempts,
		          intent.lease_owner, intent.lease_expires_at, intent.lease_generation
	`, limit, leaseOwner, leaseSeconds)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	intents := make([]canonicalMutationIntent, 0, limit)
	for rows.Next() {
		var current canonicalMutationIntent
		if err := rows.Scan(&current.operatorContextID, &current.operationType, &current.requestID, &current.payload, &current.attempts, &current.leaseOwner, &current.leaseExpires, &current.leaseGeneration); err != nil {
			return nil, err
		}
		intents = append(intents, current)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return intents, nil
}

func claimCanonicalMutation(ctx context.Context, db *sql.DB, operatorContextID, operationType, requestID, leaseOwner string) (*canonicalMutationIntent, error) {
	leaseSeconds := int(canonicalMutationLeaseDuration / time.Second)
	var current canonicalMutationIntent
	err := db.QueryRowContext(ctx, `
		WITH candidate AS (
			SELECT id
			FROM dsh_admin_canonical_mutation_intents
			WHERE operator_context_id = $1 AND operation_type = $2 AND request_id = $3
			  AND status IN ('pending', 'retryable_failure')
			  AND next_attempt_at IS NOT NULL
			  AND next_attempt_at <= NOW()
			  AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
			FOR UPDATE
		)
		UPDATE dsh_admin_canonical_mutation_intents AS intent
		SET lease_owner = $4,
		    lease_expires_at = NOW() + make_interval(secs => $5),
		    lease_generation = lease_generation + 1,
		    updated_at = NOW()
		FROM candidate
		WHERE intent.id = candidate.id
			RETURNING intent.operator_context_id, intent.operation_type, intent.request_id, intent.payload, intent.attempts,
		          intent.lease_owner, intent.lease_expires_at, intent.lease_generation
	`, operatorContextID, operationType, requestID, leaseOwner, leaseSeconds).Scan(
		&current.operatorContextID, &current.operationType, &current.requestID, &current.payload, &current.attempts,
		&current.leaseOwner, &current.leaseExpires, &current.leaseGeneration,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCanonicalMutationInProgress
		}
		return nil, err
	}
	return &current, nil
}

func markIntentRetry(ctx context.Context, db *sql.DB, current canonicalMutationIntent, cause error) (canonicalMutationResult, error) {
	message := "canonical mutation retry required"
	if cause != nil && strings.TrimSpace(cause.Error()) != "" {
		message = cause.Error()
	}
	if err := markCanonicalMutationFailure(ctx, db, current, message, false); err != nil {
		return canonicalMutationResult{}, err
	}
	disposition := fmt.Errorf("%w: %s", ErrCanonicalMutationFailed, message)
	if errors.Is(cause, auth.ErrIdentityUnavailable) {
		disposition = fmt.Errorf("%w: %s", ErrIdentityUnavailable, message)
	}
	return canonicalMutationResult{dispositionErr: disposition}, nil
}

func markIntentTerminal(ctx context.Context, db *sql.DB, current canonicalMutationIntent, message string) (canonicalMutationResult, error) {
	if err := markCanonicalMutationFailure(ctx, db, current, message, true); err != nil {
		return canonicalMutationResult{}, err
	}
	return canonicalMutationResult{dispositionErr: fmt.Errorf("%w: %s", ErrCanonicalMutationFailed, message)}, nil
}

func canonicalActorHasRole(ctx context.Context, identityClient *auth.Client, actorID, roleName string) (bool, error) {
	assignments, err := identityClient.ListActorRoleAssignments(ctx, actorID)
	if err != nil {
		return false, err
	}
	for _, assignment := range assignments {
		if assignment.RoleName == roleName {
			return true, nil
		}
	}
	return false, nil
}

func applyCanonicalRoleMutation(ctx context.Context, identityClient *auth.Client, payload roleMutationIntentPayload, idempotencyKey string) (*auth.RbacActorRoleAssignment, error) {
	desiredPresent := payload.ActionType == "staff_role_assignment"
	if !desiredPresent && payload.ActionType != "staff_role_revocation" {
		return nil, errors.New("unsupported role mutation action")
	}

	present, err := canonicalActorHasRole(ctx, identityClient, payload.TargetActorID, payload.RoleName)
	if err != nil {
		return nil, err
	}
	if present == desiredPresent {
		return nil, nil
	}

	var assignment *auth.RbacActorRoleAssignment
	if desiredPresent {
		granted, err := identityClient.GrantRoleWithIdempotency(ctx, payload.TargetActorID, payload.RoleName, payload.ReviewerID, payload.ExpectedRoleVersion, idempotencyKey)
		if err != nil {
			return nil, err
		}
		assignment = &granted
	} else if err := identityClient.RevokeRoleWithIdempotency(ctx, payload.TargetActorID, payload.RoleName, payload.ReviewerID, payload.ExpectedRoleVersion, idempotencyKey); err != nil {
		return nil, err
	}

	present, err = canonicalActorHasRole(ctx, identityClient, payload.TargetActorID, payload.RoleName)
	if err != nil {
		return nil, err
	}
	if present != desiredPresent {
		return nil, errors.New("canonical actor-role readback mismatch")
	}
	return assignment, nil
}

func canonicalMutationErrorIsTerminal(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, auth.ErrRbacRoleNotFound) ||
		errors.Is(err, auth.ErrRbacSelfGrant) ||
		errors.Is(err, auth.ErrRbacInvalidRoleDefinition) ||
		errors.Is(err, auth.ErrRbacVersionConflict) ||
		errors.Is(err, errCanonicalMutationSourceDrift) ||
		err.Error() == "unsupported role mutation action"
}

func disposeMutationError(ctx context.Context, db *sql.DB, current canonicalMutationIntent, err error) (canonicalMutationResult, error) {
	if canonicalMutationErrorIsTerminal(err) {
		return markIntentTerminal(ctx, db, current, err.Error())
	}
	return markIntentRetry(ctx, db, current, err)
}

func finalizeCanonicalMutation(ctx context.Context, db *sql.DB, current canonicalMutationIntent, finalizeSource func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var status string
	var leaseOwner sql.NullString
	var leaseGeneration int64
	var leaseValid bool
	if err := tx.QueryRowContext(ctx, `
		SELECT status, lease_owner, lease_generation, COALESCE(lease_expires_at > NOW(), FALSE)
		FROM dsh_admin_canonical_mutation_intents
		WHERE operator_context_id = $1 AND operation_type = $2 AND request_id = $3
		FOR UPDATE
	`, current.operatorContextID, current.operationType, current.requestID).Scan(&status, &leaseOwner, &leaseGeneration, &leaseValid); err != nil {
		return err
	}
	if status == "applied" {
		return tx.Commit()
	}
	if !leaseOwner.Valid || leaseOwner.String != current.leaseOwner || leaseGeneration != current.leaseGeneration || !leaseValid {
		return errCanonicalMutationLeaseLost
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_admin_canonical_mutation_intents
		SET status = 'applied', attempts = attempts + 1, last_error = NULL,
		    next_attempt_at = NULL,
		    lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
		WHERE operator_context_id = $1 AND operation_type = $2 AND request_id = $3
		  AND status IN ('pending', 'retryable_failure')
		  AND lease_owner = $4
		  AND lease_generation = $5
		  AND lease_expires_at > NOW()
	`, current.operatorContextID, current.operationType, current.requestID, current.leaseOwner, current.leaseGeneration)
	if err != nil {
		return err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if updated != 1 {
		return errCanonicalMutationLeaseLost
	}
	// The source decision may become approved only after the durable execution
	// state is applied. Both writes remain atomic; any source or audit failure
	// rolls the intent update back with this transaction.
	if err := finalizeSource(tx); err != nil {
		return err
	}
	return tx.Commit()
}

func requireCanonicalSourceUpdate(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if updated != 1 {
		return errCanonicalMutationSourceDrift
	}
	return nil
}

func finalizeRoleAssignmentIntent(ctx context.Context, db *sql.DB, current canonicalMutationIntent, payload roleMutationIntentPayload) error {
	return finalizeCanonicalMutation(ctx, db, current, func(tx *sql.Tx) error {
		var targetActorID, roleName, actionType, requestedBy, status string
		var expectedRoleVersion int
		var version int
		var reviewedBy sql.NullString
		if err := tx.QueryRowContext(ctx, `
			SELECT target_actor_id, role_name, COALESCE(expected_role_version, 0), action_type, requested_by, status, version, reviewed_by
			FROM dsh_admin_approval_requests
			WHERE operator_context_id = $1 AND id = $2
			FOR UPDATE
		`, payload.OperatorContextID, current.requestID).Scan(&targetActorID, &roleName, &expectedRoleVersion, &actionType, &requestedBy, &status, &version, &reviewedBy); err != nil {
			return err
		}
		if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ExpectedRoleVersion != expectedRoleVersion || payload.ActionType != actionType ||
			validateRoleReviewSeparation(requestedBy, targetActorID, payload.ReviewerID) != nil {
			return fmt.Errorf("%w: role-assignment request changed", errCanonicalMutationSourceDrift)
		}
		if status == "approved" {
			if reviewedBy.Valid && reviewedBy.String == payload.ReviewerID {
				return nil
			}
			return fmt.Errorf("%w: role-assignment reviewer changed", errCanonicalMutationSourceDrift)
		}
		if status != "pending" {
			return fmt.Errorf("%w: role-assignment request is no longer pending", errCanonicalMutationSourceDrift)
		}
		if err := requireCanonicalSourceUpdate(tx.ExecContext(ctx, `
			UPDATE dsh_admin_approval_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE operator_context_id = $3 AND id = $4 AND status = 'pending' AND version = $5
		`, payload.ReviewerID, payload.ReviewNote, payload.OperatorContextID, current.requestID, version)); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, $2, 'ROLE_ASSIGNMENT_APPROVED', $3,
			        jsonb_build_object('request_id', $3::text, 'decision', 'approved',
			                           'action_type', $4::text, 'note_provided', btrim($5::text) <> '')::text,
			        'restricted', $3)
		`, payload.OperatorContextID, payload.ReviewerID, current.requestID, actionType, payload.ReviewNote)
		return err
	})
}

func finalizeRoleRollbackIntent(ctx context.Context, db *sql.DB, current canonicalMutationIntent, payload roleMutationIntentPayload) error {
	return finalizeCanonicalMutation(ctx, db, current, func(tx *sql.Tx) error {
		var targetActorID, roleName, inverseActionType, requestedBy, status, sourceApprovedBy string
		var expectedRoleVersion int
		var version int
		var reviewedBy sql.NullString
		if err := tx.QueryRowContext(ctx, `
			SELECT rollback.target_actor_id, rollback.role_name, COALESCE(rollback.expected_role_version, 0), rollback.inverse_action_type,
			       rollback.requested_by, rollback.status, rollback.version, rollback.reviewed_by,
			       COALESCE(source.reviewed_by, '')
			FROM dsh_admin_rollback_requests rollback
			JOIN dsh_admin_approval_requests source
			  ON source.id = rollback.source_approval_id
			 AND source.operator_context_id = rollback.operator_context_id
			WHERE rollback.operator_context_id = $1 AND rollback.id = $2
			FOR UPDATE OF rollback
		`, payload.OperatorContextID, current.requestID).Scan(&targetActorID, &roleName, &expectedRoleVersion, &inverseActionType, &requestedBy, &status, &version, &reviewedBy, &sourceApprovedBy); err != nil {
			return err
		}
		if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ExpectedRoleVersion != expectedRoleVersion || payload.ActionType != inverseActionType ||
			validateRollbackReviewSeparation(requestedBy, targetActorID, sourceApprovedBy, payload.ReviewerID) != nil {
			return fmt.Errorf("%w: role-rollback request changed", errCanonicalMutationSourceDrift)
		}
		if status == "approved" {
			if reviewedBy.Valid && reviewedBy.String == payload.ReviewerID {
				return nil
			}
			return fmt.Errorf("%w: role-rollback reviewer changed", errCanonicalMutationSourceDrift)
		}
		if status != "pending" {
			return fmt.Errorf("%w: role-rollback request is no longer pending", errCanonicalMutationSourceDrift)
		}
		if err := requireCanonicalSourceUpdate(tx.ExecContext(ctx, `
			UPDATE dsh_admin_rollback_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE operator_context_id = $3 AND id = $4 AND status = 'pending' AND version = $5
		`, payload.ReviewerID, payload.ReviewNote, payload.OperatorContextID, current.requestID, version)); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, $2, 'ROLLBACK_APPROVED', $3,
			        jsonb_build_object('request_id', $3::text, 'decision', 'approved',
			                           'action_type', $4::text, 'note_provided', btrim($5::text) <> '')::text,
			        'restricted', $3)
		`, payload.OperatorContextID, payload.ReviewerID, current.requestID, inverseActionType, payload.ReviewNote)
		return err
	})
}

func reconcileRoleAssignmentIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent) (canonicalMutationResult, error) {
	var payload roleMutationIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" {
		return markIntentTerminal(ctx, db, current, "invalid role-assignment intent payload")
	}
	operatorContextID, err := validateOperatorContextID(payload.OperatorContextID)
	if err != nil || operatorContextID != current.operatorContextID {
		return markIntentTerminal(ctx, db, current, "invalid role-assignment operator context")
	}
	scopedCtx := opctx.WithOperatorContext(ctx, operatorContextID)

	var targetActorID, roleName, actionType, requestedBy, status string
	var expectedRoleVersion int
	var version int
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT target_actor_id, role_name, COALESCE(expected_role_version, 0), action_type, requested_by, status, version, reviewed_by
		FROM dsh_admin_approval_requests
		WHERE operator_context_id = $1 AND id = $2
	`, payload.OperatorContextID, current.requestID).Scan(&targetActorID, &roleName, &expectedRoleVersion, &actionType, &requestedBy, &status, &version, &reviewedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, "role-assignment source request is missing")
		}
		return canonicalMutationResult{}, err
	}
	if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ExpectedRoleVersion != expectedRoleVersion || payload.ActionType != actionType {
		return markIntentTerminal(ctx, db, current, "role-assignment intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, "role-assignment source request is not executable")
	}
	if err := validateRoleReviewSeparation(requestedBy, targetActorID, payload.ReviewerID); err != nil {
		return markIntentTerminal(ctx, db, current, err.Error())
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, "role-assignment reviewer drift detected")
	}

	if identityClient == nil {
		return markIntentRetry(ctx, db, current, auth.ErrIdentityUnavailable)
	}
	assignment, err := applyCanonicalRoleMutation(scopedCtx, identityClient, payload, current.requestID)
	if err != nil {
		return disposeMutationError(ctx, db, current, err)
	}
	if err := finalizeRoleAssignmentIntent(scopedCtx, db, current, payload); err != nil {
		if errors.Is(err, errCanonicalMutationLeaseLost) {
			return canonicalMutationResult{}, err
		}
		if errors.Is(err, errCanonicalMutationSourceDrift) {
			return markIntentTerminal(ctx, db, current, err.Error())
		}
		return markIntentRetry(ctx, db, current, err)
	}
	return canonicalMutationResult{applied: true, assignment: assignment}, nil
}

func reconcileRoleRollbackIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent) (canonicalMutationResult, error) {
	var payload roleMutationIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" {
		return markIntentTerminal(ctx, db, current, "invalid role-rollback intent payload")
	}
	operatorContextID, err := validateOperatorContextID(payload.OperatorContextID)
	if err != nil || operatorContextID != current.operatorContextID {
		return markIntentTerminal(ctx, db, current, "invalid role-rollback operator context")
	}
	scopedCtx := opctx.WithOperatorContext(ctx, operatorContextID)

	var targetActorID, roleName, inverseActionType, requestedBy, status, sourceApprovedBy string
	var expectedRoleVersion int
	var version int
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT rollback.target_actor_id, rollback.role_name, COALESCE(rollback.expected_role_version, 0), rollback.inverse_action_type,
		       rollback.requested_by, rollback.status, rollback.version, rollback.reviewed_by,
		       COALESCE(source.reviewed_by, '')
		FROM dsh_admin_rollback_requests rollback
		JOIN dsh_admin_approval_requests source
		  ON source.id = rollback.source_approval_id
		 AND source.operator_context_id = rollback.operator_context_id
		WHERE rollback.operator_context_id = $1 AND rollback.id = $2
	`, payload.OperatorContextID, current.requestID).Scan(&targetActorID, &roleName, &expectedRoleVersion, &inverseActionType, &requestedBy, &status, &version, &reviewedBy, &sourceApprovedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, "role-rollback source request is missing")
		}
		return canonicalMutationResult{}, err
	}
	if payload.TargetActorID != targetActorID || payload.RoleName != roleName || payload.ExpectedRoleVersion != expectedRoleVersion || payload.ActionType != inverseActionType {
		return markIntentTerminal(ctx, db, current, "role-rollback intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, "role-rollback source request is not executable")
	}
	if err := validateRollbackReviewSeparation(requestedBy, targetActorID, sourceApprovedBy, payload.ReviewerID); err != nil {
		return markIntentTerminal(ctx, db, current, err.Error())
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, "role-rollback reviewer drift detected")
	}

	if identityClient == nil {
		return markIntentRetry(ctx, db, current, auth.ErrIdentityUnavailable)
	}
	assignment, err := applyCanonicalRoleMutation(scopedCtx, identityClient, payload, current.requestID)
	if err != nil {
		return disposeMutationError(ctx, db, current, err)
	}
	if err := finalizeRoleRollbackIntent(scopedCtx, db, current, payload); err != nil {
		if errors.Is(err, errCanonicalMutationLeaseLost) {
			return canonicalMutationResult{}, err
		}
		if errors.Is(err, errCanonicalMutationSourceDrift) {
			return markIntentTerminal(ctx, db, current, err.Error())
		}
		return markIntentRetry(ctx, db, current, err)
	}
	return canonicalMutationResult{applied: true, assignment: assignment}, nil
}

func permissionActions(permissions []auth.Permission) []string {
	actions := make([]string, 0, len(permissions))
	for _, permission := range permissions {
		actions = append(actions, permission.Action)
	}
	sort.Strings(actions)
	return actions
}

func finalizeRoleDefinitionIntent(ctx context.Context, db *sql.DB, current canonicalMutationIntent, payload roleDefinitionIntentPayload) error {
	return finalizeCanonicalMutation(ctx, db, current, func(tx *sql.Tx) error {
		var roleName, description, requestedBy, status string
		var active bool
		var expectedVersion, version int
		var permissionsJSON []byte
		var reviewedBy sql.NullString
		if err := tx.QueryRowContext(ctx, `
			SELECT role_name, description, active, expected_role_version, permissions,
			       requested_by, status, version, reviewed_by
			FROM dsh_admin_role_definition_requests
			WHERE operator_context_id = $1 AND id = $2
			FOR UPDATE
		`, payload.OperatorContextID, current.requestID).Scan(&roleName, &description, &active, &expectedVersion, &permissionsJSON, &requestedBy, &status, &version, &reviewedBy); err != nil {
			return err
		}
		var requestedActions []string
		if err := json.Unmarshal(permissionsJSON, &requestedActions); err != nil {
			return fmt.Errorf("%w: role-definition permissions changed", errCanonicalMutationSourceDrift)
		}
		sort.Strings(requestedActions)
		payloadActions := permissionActions(payload.Permissions)
		if payload.RoleName != roleName || payload.Description != description || payload.Active != active ||
			payload.ExpectedVersion != expectedVersion || requestedBy == payload.ReviewerID ||
			strings.Join(payloadActions, "\x1f") != strings.Join(requestedActions, "\x1f") {
			return fmt.Errorf("%w: role-definition request changed", errCanonicalMutationSourceDrift)
		}
		if status == "approved" {
			if reviewedBy.Valid && reviewedBy.String == payload.ReviewerID {
				return nil
			}
			return fmt.Errorf("%w: role-definition reviewer changed", errCanonicalMutationSourceDrift)
		}
		if status != "pending" {
			return fmt.Errorf("%w: role-definition request is no longer pending", errCanonicalMutationSourceDrift)
		}
		if err := requireCanonicalSourceUpdate(tx.ExecContext(ctx, `
			UPDATE dsh_admin_role_definition_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2,
			    version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE operator_context_id = $3 AND id = $4 AND status = 'pending' AND version = $5
		`, payload.ReviewerID, payload.ReviewNote, payload.OperatorContextID, current.requestID, version)); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, $2, 'ROLE_DEFINITION_APPROVED', $3,
			        jsonb_build_object('request_id', $3::text, 'decision', 'approved',
			                           'note_provided', btrim($4::text) <> '',
			                           'permission_count', $5::int, 'surface_count', 1)::text,
			        'restricted', $3)
		`, payload.OperatorContextID, payload.ReviewerID, current.requestID, payload.ReviewNote, len(payload.Permissions))
		return err
	})
}

func reconcileRoleDefinitionIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent) (canonicalMutationResult, error) {
	var payload roleDefinitionIntentPayload
	if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" || strings.TrimSpace(payload.RoleName) == "" {
		return markIntentTerminal(ctx, db, current, "invalid role-definition intent payload")
	}
	operatorContextID, err := validateOperatorContextID(payload.OperatorContextID)
	if err != nil || operatorContextID != current.operatorContextID {
		return markIntentTerminal(ctx, db, current, "invalid role-definition operator context")
	}
	scopedCtx := opctx.WithOperatorContext(ctx, operatorContextID)

	var roleName, description, requestedBy, status string
	var active bool
	var expectedVersion, version int
	var permissionsJSON []byte
	var reviewedBy sql.NullString
	if err := db.QueryRowContext(ctx, `
		SELECT role_name, description, active, expected_role_version, permissions,
		       requested_by, status, version, reviewed_by
		FROM dsh_admin_role_definition_requests
		WHERE operator_context_id = $1 AND id = $2
	`, payload.OperatorContextID, current.requestID).Scan(&roleName, &description, &active, &expectedVersion, &permissionsJSON, &requestedBy, &status, &version, &reviewedBy); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return markIntentTerminal(ctx, db, current, "role-definition source request is missing")
		}
		return canonicalMutationResult{}, err
	}
	var requestedActions []string
	if err := json.Unmarshal(permissionsJSON, &requestedActions); err != nil {
		return markIntentTerminal(ctx, db, current, "role-definition permissions are invalid")
	}
	sort.Strings(requestedActions)
	payloadActions := permissionActions(payload.Permissions)
	if payload.RoleName != roleName || payload.Description != description || payload.Active != active || payload.ExpectedVersion != expectedVersion || strings.Join(payloadActions, "\x1f") != strings.Join(requestedActions, "\x1f") {
		return markIntentTerminal(ctx, db, current, "role-definition intent does not match source request")
	}
	if status != "pending" && status != "approved" {
		return markIntentTerminal(ctx, db, current, "role-definition source request is not executable")
	}
	if requestedBy == payload.ReviewerID {
		return markIntentTerminal(ctx, db, current, "cannot review own request")
	}
	if status == "approved" && (!reviewedBy.Valid || reviewedBy.String != payload.ReviewerID) {
		return markIntentTerminal(ctx, db, current, "role-definition reviewer drift detected")
	}
	if identityClient == nil {
		return markIntentRetry(ctx, db, current, auth.ErrIdentityUnavailable)
	}

	req := RoleDefinitionRequest{
		RoleName:            roleName,
		Description:         description,
		Active:              active,
		ExpectedRoleVersion: expectedVersion,
	}
	converged := false
	readback, err := identityClient.GetRoleDefinition(scopedCtx, roleName)
	if err == nil {
		converged = roleDefinitionMatchesRequest(readback, req, payload.Permissions)
	} else if !errors.Is(err, auth.ErrRbacRoleNotFound) {
		return markIntentRetry(ctx, db, current, err)
	}
	if !converged {
		if _, err := identityClient.UpsertRoleDefinition(scopedCtx, roleName, description, active, expectedVersion, payload.Permissions, current.requestID); err != nil {
			return disposeMutationError(ctx, db, current, err)
		}
		readback, err = identityClient.GetRoleDefinition(scopedCtx, roleName)
		if err != nil {
			return markIntentRetry(ctx, db, current, err)
		}
		if !roleDefinitionMatchesRequest(readback, req, payload.Permissions) {
			return markIntentRetry(ctx, db, current, errors.New("canonical role-definition readback mismatch"))
		}
	}
	if err := finalizeRoleDefinitionIntent(scopedCtx, db, current, payload); err != nil {
		if errors.Is(err, errCanonicalMutationLeaseLost) {
			return canonicalMutationResult{}, err
		}
		if errors.Is(err, errCanonicalMutationSourceDrift) {
			return markIntentTerminal(ctx, db, current, err.Error())
		}
		return markIntentRetry(ctx, db, current, err)
	}
	return canonicalMutationResult{applied: true, roleDefinition: &readback}, nil
}

func reconcileCanonicalMutationIntent(ctx context.Context, db *sql.DB, identityClient *auth.Client, current canonicalMutationIntent) (canonicalMutationResult, error) {
	switch current.operationType {
	case "role-definition-upsert":
		return reconcileRoleDefinitionIntent(ctx, db, identityClient, current)
	case "role-assignment":
		return reconcileRoleAssignmentIntent(ctx, db, identityClient, current)
	case "role-rollback":
		return reconcileRoleRollbackIntent(ctx, db, identityClient, current)
	default:
		return markIntentTerminal(ctx, db, current, "unsupported mutation operation")
	}
}

func executeCanonicalMutationNow(ctx context.Context, db *sql.DB, identityClient *auth.Client, operationType, requestID string) (canonicalMutationResult, error) {
	if db == nil {
		return canonicalMutationResult{}, ErrInvalid
	}
	operatorContextID, err := requireOperatorContext(ctx)
	if err != nil {
		return canonicalMutationResult{}, err
	}
	leaseOwner := fmt.Sprintf("canonical-review-%d", time.Now().UnixNano())
	current, err := claimCanonicalMutation(ctx, db, operatorContextID, operationType, requestID, leaseOwner)
	if err != nil {
		if !errors.Is(err, ErrCanonicalMutationInProgress) {
			return canonicalMutationResult{}, err
		}
		var status string
		var lastError sql.NullString
		if stateErr := db.QueryRowContext(ctx, `
			SELECT status, last_error
			FROM dsh_admin_canonical_mutation_intents
			WHERE operator_context_id = $1 AND operation_type = $2 AND request_id = $3
		`, operatorContextID, operationType, requestID).Scan(&status, &lastError); stateErr != nil {
			return canonicalMutationResult{}, stateErr
		}
		if status == "applied" {
			return canonicalMutationResult{applied: true}, nil
		}
		if status == "failed_terminal" {
			message := "canonical mutation failed"
			if lastError.Valid && strings.TrimSpace(lastError.String) != "" {
				message = lastError.String
			}
			return canonicalMutationResult{}, fmt.Errorf("%w: %s", ErrCanonicalMutationFailed, message)
		}
		return canonicalMutationResult{}, ErrCanonicalMutationInProgress
	}

	executionCtx, cancel := context.WithTimeout(ctx, canonicalMutationExecutionTimeout)
	defer cancel()
	result, err := reconcileCanonicalMutationIntent(executionCtx, db, identityClient, *current)
	if err != nil {
		return canonicalMutationResult{}, err
	}
	if result.dispositionErr != nil {
		return result, result.dispositionErr
	}
	return result, nil
}

// RetryPendingCanonicalMutations claims due intents with an expiring lease,
// reconciles Identity from canonical readback, and finalizes the DSH ledger
// without re-entering review functions that require the source row to be
// pending. This makes retries safe across process crashes and post-Identity
// finalize failures.
func RetryPendingCanonicalMutations(ctx context.Context, db *sql.DB, identityClient *auth.Client, limit int) (int, error) {
	if db == nil {
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

	type itemResult struct {
		applied bool
		err     error
	}
	results := make(chan itemResult, len(intents))
	var workers sync.WaitGroup
	for _, claimed := range intents {
		current := claimed
		workers.Add(1)
		go func() {
			defer workers.Done()
			executionCtx, cancel := context.WithTimeout(ctx, canonicalMutationExecutionTimeout)
			defer cancel()
			result, reconcileErr := reconcileCanonicalMutationIntent(executionCtx, db, identityClient, current)
			if reconcileErr == nil && result.dispositionErr != nil {
				reconcileErr = result.dispositionErr
			}
			results <- itemResult{applied: result.applied, err: reconcileErr}
		}()
	}
	workers.Wait()
	close(results)

	completed := 0
	var itemErrors []error
	for result := range results {
		if result.applied {
			completed++
		}
		if result.err != nil {
			itemErrors = append(itemErrors, result.err)
		}
	}
	return completed, errors.Join(itemErrors...)
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
			_, _ = RetryPendingCanonicalMutations(ctx, db, identityClient, 25)
		}
	}
}
