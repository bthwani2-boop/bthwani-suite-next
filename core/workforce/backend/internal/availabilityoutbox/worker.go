package availabilityoutbox

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
)

const (
	batchSize              = 20
	claimLease             = 2 * time.Minute
	notifyTimeout          = 12 * time.Second
	maxDeliveryAttempts    = 15
	maxReadbackAttempts    = 5
	terminalManualRetry    = "manual_retry_required"
	terminalReconciliation = "reconciliation_required"
)

type event struct {
	ID                         string
	NoticeID                   string
	OperatorContextID          string
	CanonicalOperatorContextID string
	ActorOperatorContextID     string
	ActorType                  string
	ActorID                    string
	NoticeType                 string
	StartsAt                   time.Time
	EndsAt                     time.Time
	LifecycleState             string
	Status                     string
	Reason                     string
	SourceUpdatedAt            time.Time
	SourceVersion              int64
	CanonicalSourceVersion     int64
	IdempotencyKey             string
	AttemptCount               int
	ReadbackAttemptCount       int
	FailureDisposition         string
	TerminalDisposition        string
	ReconciliationEligible     bool
	LeaseToken                 string
	NeedsReconciliation        bool
}

func leaseInterval(lease time.Duration) (string, error) {
	if lease <= 0 {
		return "", fmt.Errorf("availability outbox lease must be positive")
	}
	return fmt.Sprintf("%.6f seconds", lease.Seconds()), nil
}

func claimBatch(ctx context.Context, db *sql.DB, limit int) ([]event, error) {
	return claimBatchWithLease(ctx, db, limit, claimLease)
}

func claimBatchWithLease(ctx context.Context, db *sql.DB, limit int, lease time.Duration) ([]event, error) {
	if limit <= 0 {
		return []event{}, nil
	}
	leaseValue, err := leaseInterval(lease)
	if err != nil {
		return nil, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	rows, err := tx.QueryContext(ctx, `
		SELECT outbox.id::text, outbox.notice_id::text,
		       COALESCE(outbox.operator_context_id, ''),
		       COALESCE(notice.operator_context_id, ''),
		       outbox.actor_type, outbox.actor_id, outbox.notice_type,
		       outbox.starts_at, outbox.ends_at, outbox.lifecycle_state, outbox.status, outbox.reason,
		       outbox.source_updated_at, outbox.source_version,
		       outbox.idempotency_key, outbox.attempt_count,
		       outbox.readback_attempt_count, outbox.failure_disposition,
		       outbox.terminal_disposition, outbox.reconciliation_eligible,
		       COALESCE(notice.source_version, 0),
		       COALESCE(person.operator_context_id, '')
		FROM workforce_dsh_availability_outbox outbox
		LEFT JOIN workforce_provider_availability_notices notice
		  ON notice.id = outbox.notice_id
		LEFT JOIN workforce_people person
		  ON person.actor_id = outbox.actor_id
		WHERE (
		  (outbox.lifecycle_state IN ('pending', 'unknown') AND outbox.next_retry_at <= NOW())
		  OR (outbox.lifecycle_state = 'processing'
		      AND (outbox.lease_expires_at IS NULL OR outbox.lease_expires_at <= NOW()))
		)
		ORDER BY outbox.created_at, outbox.id
		LIMIT $1
		FOR UPDATE OF outbox SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim Workforce availability outbox batch: %w", err)
	}

	items := make([]event, 0, limit)
	for rows.Next() {
		var item event
		var wasProcessing bool
		if err := rows.Scan(
			&item.ID, &item.NoticeID, &item.OperatorContextID,
			&item.CanonicalOperatorContextID, &item.ActorType, &item.ActorID,
			&item.NoticeType, &item.StartsAt, &item.EndsAt, &item.LifecycleState, &item.Status,
			&item.Reason, &item.SourceUpdatedAt, &item.SourceVersion,
			&item.IdempotencyKey, &item.AttemptCount, &item.ReadbackAttemptCount,
			&item.FailureDisposition, &item.TerminalDisposition,
			&item.ReconciliationEligible, &item.CanonicalSourceVersion,
			&item.ActorOperatorContextID,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan Workforce availability outbox event: %w", err)
		}
		wasProcessing = item.LifecycleState == "processing"
		item.NeedsReconciliation = wasProcessing || item.LifecycleState == "unknown"
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	for index := range items {
		items[index].LeaseToken = uuid.NewString()
		if _, err := tx.ExecContext(ctx, `
			UPDATE workforce_dsh_availability_outbox
			SET lifecycle_state='processing', lease_token=$2::uuid,
			    lease_expires_at=NOW()+$3::interval, last_attempt_at=NOW(), updated_at=NOW()
			WHERE id=$1::uuid AND lifecycle_state=$4`,
			items[index].ID, items[index].LeaseToken, leaseValue, items[index].LifecycleState); err != nil {
			return nil, fmt.Errorf("fence Workforce availability event %s: %w", items[index].ID, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func markLeaseTransition(tx *sql.Tx, id, leaseToken, query string, args ...any) (bool, error) {
	args = append([]any{id, leaseToken}, args...)
	result, err := tx.Exec(query, args...)
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	return count == 1, err
}

func markSent(ctx context.Context, db *sql.DB, item event, result dshclient.AvailabilityProjectionResult) error {
	if strings.TrimSpace(result.IdempotencyKey) == "" {
		return fmt.Errorf("successful availability acknowledgement has no remote reference")
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	updated, err := markLeaseTransition(tx, item.ID, item.LeaseToken, `
		UPDATE workforce_dsh_availability_outbox
		SET lifecycle_state='sent', last_error='', failure_disposition='none',
		    terminal_disposition='delivered', reconciliation_eligible=false,
		    remote_ack_reference=$4, remote_acknowledged_at=NOW(), completed_at=NOW(),
		    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
		  AND source_version=$3 AND lease_expires_at > NOW()`,
		item.SourceVersion, result.IdempotencyKey)
	if err != nil {
		return err
	}
	if !updated {
		log.Printf("[workforce-availability-outbox] ignored stale acknowledgement event=%s version=%d", item.ID, item.SourceVersion)
		return nil
	}
	return tx.Commit()
}

func markDeliveryFailure(ctx context.Context, db *sql.DB, item event, cause error) error {
	nextAttempt := item.AttemptCount + 1
	message := errorText(cause)
	terminal := nextAttempt >= maxDeliveryAttempts
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var query string
	var args []any
	if terminal {
		query = `
			UPDATE workforce_dsh_availability_outbox
			SET lifecycle_state='failed', attempt_count=$3, last_error=$4,
			    failure_disposition=$5, terminal_disposition=$6,
			    diagnostic_code='max_attempts_exhausted', reconciliation_eligible=false,
			    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
			  AND source_version=$7 AND lease_expires_at > NOW()`
		args = []any{terminalManualRetry, terminalManualRetry, item.SourceVersion}
	} else {
		query = `
			UPDATE workforce_dsh_availability_outbox
			SET lifecycle_state='pending', attempt_count=$3, last_error=$4,
			    failure_disposition='retry_scheduled', terminal_disposition='none',
			    diagnostic_code='delivery_failed', reconciliation_eligible=false,
			    next_retry_at=NOW()+($5::text || ' seconds')::interval,
			    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
			  AND source_version=$6 AND lease_expires_at > NOW()`
		args = []any{backoffSeconds(nextAttempt), item.SourceVersion}
	}
	updated, err := markLeaseTransition(tx, item.ID, item.LeaseToken, query, append([]any{nextAttempt, message}, args...)...)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	return tx.Commit()
}

func markUnknown(ctx context.Context, db *sql.DB, item event, cause error, readback bool) error {
	nextAttempt := item.AttemptCount
	if !readback && item.LifecycleState != "unknown" {
		nextAttempt++
	}
	nextReadback := item.ReadbackAttemptCount
	if readback {
		nextReadback++
	}
	message := errorText(cause)
	terminal := unknownIsTerminal(nextAttempt, nextReadback, readback)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var query string
	var args []any
	if terminal {
		query = `
			UPDATE workforce_dsh_availability_outbox
			SET lifecycle_state='failed', attempt_count=$3, readback_attempt_count=$4,
			    last_error=$5, failure_disposition=$6, terminal_disposition=$7,
			    diagnostic_code=$8, reconciliation_eligible=true,
			    last_readback_at=CASE WHEN $9 THEN NOW() ELSE last_readback_at END,
			    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
			  AND source_version=$10 AND lease_expires_at > NOW()`
		args = []any{nextAttempt, nextReadback, message, terminalReconciliation, terminalReconciliation,
			unknownDiagnostic(readback), readback, item.SourceVersion}
	} else {
		query = `
			UPDATE workforce_dsh_availability_outbox
			SET lifecycle_state='unknown', attempt_count=$3, readback_attempt_count=$4,
			    last_error=$5, failure_disposition='reconciliation_required',
			    terminal_disposition='none', diagnostic_code=$6,
			    reconciliation_eligible=true, last_readback_at=CASE WHEN $7 THEN NOW() ELSE last_readback_at END,
			    next_retry_at=NOW()+($8::text || ' seconds')::interval,
			    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
			  AND source_version=$9 AND lease_expires_at > NOW()`
		args = []any{nextAttempt, nextReadback, message, diagnosticCode(readback), readback, backoffSeconds(nextReadback + 2), item.SourceVersion}
	}
	updated, err := markLeaseTransition(tx, item.ID, item.LeaseToken, query, args...)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	return tx.Commit()
}

func markPermanentFailure(ctx context.Context, db *sql.DB, item event, cause error, disposition, diagnostic string, reconciliation bool) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	updated, err := markLeaseTransition(tx, item.ID, item.LeaseToken, `
		UPDATE workforce_dsh_availability_outbox
		SET lifecycle_state='failed', last_error=$3, failure_disposition=$4,
		    terminal_disposition=$5, diagnostic_code=$6, reconciliation_eligible=$7,
		    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lease_token=$2::uuid AND lifecycle_state='processing'
		  AND source_version=$8 AND lease_expires_at > NOW()`,
		errorText(cause), disposition, disposition, diagnostic, reconciliation, item.SourceVersion)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	return tx.Commit()
}

func markInvalidOperatorContext(ctx context.Context, db *sql.DB, item event, cause error) error {
	return markPermanentFailure(ctx, db, item, cause, "invalid_operator_context", "invalid_operator_context", true)
}

func markStaleRemoteSource(ctx context.Context, db *sql.DB, item event, cause error) error {
	return markPermanentFailure(ctx, db, item, cause, terminalReconciliation, "remote_source_version_ahead", true)
}

func requeueFromCanonicalSource(ctx context.Context, db *sql.DB, item event) (bool, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback() //nolint:errcheck
	result, err := tx.ExecContext(ctx, `
		UPDATE workforce_dsh_availability_outbox outbox
		SET operator_context_id=notice.operator_context_id,
		    actor_type=person.workforce_kind, actor_id=notice.actor_id,
		    notice_type=notice.notice_type, starts_at=notice.starts_at, ends_at=notice.ends_at,
		    status=CASE WHEN notice.status='cancelled' THEN 'cancelled' ELSE 'active' END,
		    reason=concat_ws(':', notice.reason_code, notice.note),
		    source_updated_at=notice.updated_at, source_version=notice.source_version,
		    idempotency_key='workforce-availability-v1:' || notice.operator_context_id || ':' || notice.id || ':' || notice.source_version,
		    lifecycle_state='pending', attempt_count=0, readback_attempt_count=0,
		    next_retry_at=NOW(), last_error='', failure_disposition='retry_scheduled',
		    terminal_disposition='none', reconciliation_eligible=false,
		    lease_token=NULL, lease_expires_at=NULL, remote_ack_reference=NULL,
		    remote_acknowledged_at=NULL, completed_at=NULL, updated_at=NOW()
		FROM workforce_provider_availability_notices notice
		JOIN workforce_people person ON person.actor_id=notice.actor_id
		WHERE outbox.id=$1::uuid AND outbox.lease_token=$2::uuid
		  AND outbox.lifecycle_state='processing'
		  AND notice.source_version > outbox.source_version
		  AND notice.operator_context_id=person.operator_context_id`, item.ID, item.LeaseToken)
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	if err != nil || count != 1 {
		return false, err
	}
	if err := tx.Commit(); err != nil {
		return false, err
	}
	return true, nil
}

// RetryFailed is an explicit recovery transition for a definitive remote or
// transport failure. Unknown outcomes are deliberately excluded: those must
// be reconciled first so recovery cannot issue a second non-idempotent action.
func RetryFailed(db *sql.DB, id, reason string) error {
	return retryFailed(db, id, "", reason)
}

func RetryFailedForOperatorContext(db *sql.DB, id, operatorContextID, reason string) error {
	return retryFailed(db, id, strings.TrimSpace(operatorContextID), reason)
}

func retryFailed(db *sql.DB, id, operatorContextID, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return fmt.Errorf("manual retry reason is required")
	}
	result, err := db.Exec(`
		UPDATE workforce_dsh_availability_outbox
		SET lifecycle_state='pending', attempt_count=0, readback_attempt_count=0,
		    last_readback_at=NULL, next_retry_at=NOW(), last_error=$2,
		    failure_disposition='retry_scheduled', terminal_disposition='none',
		    diagnostic_code='manual_retry_requested', reconciliation_eligible=false,
		    completed_at=NULL, remote_ack_reference=NULL, remote_acknowledged_at=NULL,
		    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lifecycle_state='failed'
		  AND failure_disposition NOT IN ('reconciliation_required','invalid_operator_context')
		  AND ($3='' OR btrim(operator_context_id)=$3)`, id, reason, operatorContextID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return fmt.Errorf("availability event is not eligible for manual retry")
	}
	return nil
}

// RequeueForReconciliation is the explicit recovery transition for a
// terminal unknown result or an OperatorContext/source drift. It schedules a
// readback and never posts directly, preserving the remote outcome boundary.
func RequeueForReconciliation(db *sql.DB, id, reason string) error {
	return requeueForReconciliation(db, id, "", reason)
}

func RequeueForReconciliationForOperatorContext(db *sql.DB, id, operatorContextID, reason string) error {
	return requeueForReconciliation(db, id, strings.TrimSpace(operatorContextID), reason)
}

func requeueForReconciliation(db *sql.DB, id, operatorContextID, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return fmt.Errorf("reconciliation reason is required")
	}
	result, err := db.Exec(`
		UPDATE workforce_dsh_availability_outbox
		SET lifecycle_state='unknown', next_retry_at=NOW(), readback_attempt_count=0,
		    failure_disposition='reconciliation_required', terminal_disposition='none',
		    diagnostic_code='manual_reconciliation_requested', reconciliation_eligible=true,
		    last_error=$2, lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lifecycle_state='failed'
		  AND failure_disposition IN ('reconciliation_required','invalid_operator_context')
		  AND ($3='' OR btrim(operator_context_id)=$3)`, id, reason, operatorContextID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return fmt.Errorf("availability event is not eligible for reconciliation")
	}
	return nil
}

func errorText(cause error) string {
	if cause == nil {
		return "availability projection transition failed without an error"
	}
	return cause.Error()
}

func diagnosticCode(readback bool) string {
	if readback {
		return "remote_readback_unavailable"
	}
	return "remote_outcome_unknown"
}

func unknownDiagnostic(readback bool) string {
	if readback {
		return "reconciliation_exhausted"
	}
	return "delivery_attempt_budget_exhausted"
}

func unknownIsTerminal(attemptCount, readbackAttemptCount int, readback bool) bool {
	if readback {
		return readbackAttemptCount >= maxReadbackAttempts
	}
	return attemptCount >= maxDeliveryAttempts
}

func backoffSeconds(attempt int) int {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	seconds := 1 << attempt
	if seconds > 1800 {
		return 1800
	}
	return seconds
}

func ProcessOnce(ctx context.Context, db *sql.DB, client *dshclient.Client) error {
	items, err := claimBatch(ctx, db, batchSize)
	if err != nil {
		return err
	}
	for _, item := range items {
		if item.CanonicalSourceVersion > item.SourceVersion {
			refreshed, refreshErr := requeueFromCanonicalSource(ctx, db, item)
			if refreshErr != nil {
				log.Printf("[workforce-availability-outbox] source refresh failed event=%s: %v", item.ID, refreshErr)
			} else if refreshed {
				continue
			}
		}
		if strings.TrimSpace(item.OperatorContextID) == "" ||
			strings.TrimSpace(item.CanonicalOperatorContextID) == "" ||
			item.OperatorContextID != item.CanonicalOperatorContextID ||
			item.OperatorContextID != item.ActorOperatorContextID {
			cause := fmt.Errorf("availability event %s has missing or stale OperatorContext authority", item.ID)
			if markErr := markInvalidOperatorContext(ctx, db, item, cause); markErr != nil {
				log.Printf("[workforce-availability-outbox] failed to record invalid OperatorContext event=%s: %v", item.ID, markErr)
			}
			continue
		}
		if item.CanonicalSourceVersion < item.SourceVersion {
			cause := fmt.Errorf("availability event %s is ahead of the canonical Workforce source", item.ID)
			if markErr := markStaleRemoteSource(ctx, db, item, cause); markErr != nil {
				log.Printf("[workforce-availability-outbox] failed to record source-version drift event=%s: %v", item.ID, markErr)
			}
			continue
		}

		if client == nil || !client.AvailabilityProjectionConfigured() {
			if markErr := markDeliveryFailure(ctx, db, item, dshclient.ErrUnavailable); markErr != nil {
				log.Printf("[workforce-availability-outbox] failed to record unavailable DSH event=%s: %v", item.ID, markErr)
			}
			continue
		}

		callCtx, cancel := context.WithTimeout(auth.WithOperatorContext(ctx, item.OperatorContextID), notifyTimeout)
		var result dshclient.AvailabilityProjectionResult
		var deliverErr error
		if item.NeedsReconciliation || item.LifecycleState == "unknown" {
			result, found, reconcileErr := client.ReconcileAvailabilityProjection(callCtx, item.OperatorContextID, item.IdempotencyKey)
			if reconcileErr != nil {
				cancel()
				if markErr := markUnknown(ctx, db, item, reconcileErr, true); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to record readback failure event=%s: %v", item.ID, markErr)
				}
				continue
			}
			if found {
				if result.NoticeID != item.NoticeID || result.SourceVersion != item.SourceVersion {
					cancel()
					if markErr := markUnknown(ctx, db, item, fmt.Errorf("remote readback identity/version mismatch"), true); markErr != nil {
						log.Printf("[workforce-availability-outbox] failed to record readback mismatch event=%s: %v", item.ID, markErr)
					}
					continue
				}
				cancel()
				if markErr := markSent(ctx, db, item, result); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to acknowledge reconciled event=%s: %v", item.ID, markErr)
				}
				continue
			}
			// A missing deterministic key proves the prior attempt is not present;
			// the same lease can safely issue the idempotent POST now.
			item.LifecycleState = "pending"
			item.NeedsReconciliation = false
		}
		result, deliverErr = client.SyncAvailabilityProjectionWithResult(callCtx, dshclient.AvailabilityProjectionInput{
			OperatorContextID: item.OperatorContextID,
			NoticeID:          item.NoticeID,
			ActorType:         item.ActorType,
			ActorID:           item.ActorID,
			NoticeType:        item.NoticeType,
			StartsAt:          item.StartsAt,
			EndsAt:            item.EndsAt,
			Status:            item.Status,
			Reason:            item.Reason,
			SourceVersion:     item.SourceVersion,
			SourceUpdatedAt:   item.SourceUpdatedAt,
			IdempotencyKey:    item.IdempotencyKey,
		})
		cancel()

		if deliverErr != nil {
			switch {
			case errors.Is(deliverErr, dshclient.ErrAvailabilityStale):
				if markErr := markStaleRemoteSource(ctx, db, item, deliverErr); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to record stale remote source event=%s: %v", item.ID, markErr)
				}
			case errors.Is(deliverErr, dshclient.ErrAvailabilityRejected):
				if markErr := markPermanentFailure(ctx, db, item, deliverErr, "remote_rejected", "remote_rejected", false); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to record remote rejection event=%s: %v", item.ID, markErr)
				}
			case errors.Is(deliverErr, dshclient.ErrAvailabilityMalformed),
				errors.Is(deliverErr, dshclient.ErrAvailabilityOutcomeUnknown),
				errors.Is(deliverErr, dshclient.ErrUnavailable):
				if markErr := markUnknown(ctx, db, item, deliverErr, false); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to record unknown outcome event=%s: %v", item.ID, markErr)
				}
			default:
				if markErr := markDeliveryFailure(ctx, db, item, deliverErr); markErr != nil {
					log.Printf("[workforce-availability-outbox] failed to record delivery failure event=%s: %v", item.ID, markErr)
				}
			}
			continue
		}
		if err := markSent(ctx, db, item, result); err != nil {
			log.Printf("[workforce-availability-outbox] failed to acknowledge event=%s: %v", item.ID, err)
		}
	}
	return nil
}

func RunWorker(ctx context.Context, db *sql.DB, client *dshclient.Client, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, client); err != nil {
				log.Printf("[workforce-availability-outbox] %v", err)
			}
		}
	}
}
