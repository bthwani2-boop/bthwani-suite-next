package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

// enqueueCanonicalMutation persists the intent before crossing the Identity
// service boundary. The request row may remain pending when Identity is
// unavailable; a later retry can safely reuse the same operation key.
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

func markCanonicalMutation(ctx context.Context, db *sql.DB, operationType, requestID, status, lastError string) error {
	if db == nil {
		return ErrInvalid
	}
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_admin_canonical_mutation_intents
		SET status = $1,
		    attempts = attempts + 1,
		    last_error = NULLIF($2, ''),
		    next_attempt_at = CASE WHEN $1 = 'applied' THEN NULL ELSE NOW() END,
		    updated_at = NOW()
		WHERE operation_type = $3 AND request_id = $4
	`, status, strings.TrimSpace(lastError), operationType, requestID)
	return err
}

// RetryPendingCanonicalMutations replays durable approvals after a process
// restart or an Identity outage. Review functions remain the single state
// transition owner, so retries preserve maker/checker and readback checks.
// Callers should invoke this from the service worker with a bounded limit.
func RetryPendingCanonicalMutations(ctx context.Context, db *sql.DB, identityClient *auth.Client, limit int) (int, error) {
	if db == nil || identityClient == nil {
		return 0, ErrInvalid
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}
	rows, err := db.QueryContext(ctx, `
		SELECT operation_type, request_id, payload
		FROM dsh_admin_canonical_mutation_intents
		WHERE status <> 'applied' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
		ORDER BY created_at
		LIMIT $1`, limit)
	if err != nil {
		return 0, err
	}
	type intent struct {
		operationType string
		requestID     string
		payload       []byte
	}
	intents := make([]intent, 0, limit)
	for rows.Next() {
		var current intent
		if err := rows.Scan(&current.operationType, &current.requestID, &current.payload); err != nil {
			rows.Close()
			return 0, err
		}
		intents = append(intents, current)
	}
	if err := rows.Close(); err != nil {
		return 0, err
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	completed := 0
	for _, current := range intents {
		var payload struct {
			ReviewerID string `json:"reviewerId"`
		}
		if err := json.Unmarshal(current.payload, &payload); err != nil || strings.TrimSpace(payload.ReviewerID) == "" {
			_ = markCanonicalMutation(ctx, db, current.operationType, current.requestID, "failed", "intent reviewer is missing")
			continue
		}
		var version int
		var query string
		switch current.operationType {
		case "role-definition-upsert":
			query = `SELECT version FROM dsh_admin_role_definition_requests WHERE id = $1 AND status = 'pending'`
		case "role-assignment":
			query = `SELECT version FROM dsh_admin_approval_requests WHERE id = $1 AND status = 'pending'`
		case "role-rollback":
			query = `SELECT version FROM dsh_admin_rollback_requests WHERE id = $1 AND status = 'pending'`
		default:
			_ = markCanonicalMutation(ctx, db, current.operationType, current.requestID, "failed", "unsupported mutation operation")
			continue
		}
		if err := db.QueryRowContext(ctx, query, current.requestID).Scan(&version); err != nil {
			continue
		}
		var reviewErr error
		switch current.operationType {
		case "role-definition-upsert":
			_, _, reviewErr = ReviewRoleDefinitionRequest(ctx, db, identityClient, payload.ReviewerID, current.requestID, ReviewDecisionParams{Decision: "approved", ExpectedVersion: version})
		case "role-assignment":
			_, _, reviewErr = ReviewRoleAssignmentApproval(ctx, db, identityClient, payload.ReviewerID, current.requestID, ReviewDecisionParams{Decision: "approved", ExpectedVersion: version})
		case "role-rollback":
			_, reviewErr = ReviewRollbackRequest(ctx, db, identityClient, payload.ReviewerID, current.requestID, ReviewDecisionParams{Decision: "approved", ExpectedVersion: version})
		}
		if reviewErr == nil {
			completed++
		}
	}
	return completed, nil
}

// RunCanonicalMutationWorker continuously retries durable approval intents.
// It deliberately reuses the review functions so maker/checker, optimistic
// workflow versions, Identity idempotency keys, and canonical readback remain
// identical for an HTTP retry and a process-restart retry.
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
			workerCtx, cancel := context.WithTimeout(ctx, interval)
			if _, err := RetryPendingCanonicalMutations(workerCtx, db, identityClient, 25); err != nil {
				// Retry failures remain persisted on the intent row; the next tick
				// or an explicit review request will retry them.
			}
			cancel()
		}
	}
}
