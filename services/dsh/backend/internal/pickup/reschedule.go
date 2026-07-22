package pickup

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/orders"
)

// RescheduleWindow reopens a no-show pickup session without exposing or
// reusing its previous OTP. The partner must notify the customer afterwards;
// IssueOtp then replaces this invalidation hash with a newly delivered code.
func (s *Service) RescheduleWindow(
	ctx context.Context,
	orderID string,
	newExpiry time.Time,
	actorID string,
	actorRole string,
	reason string,
	correlationID string,
) (*PickupSession, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	if !newExpiry.After(time.Now().UTC()) {
		return nil, fmt.Errorf("%w: newExpiry must be in the future", ErrInvalid)
	}

	_, invalidationHash, err := generateOtp()
	if err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, _, err := lockPickupOrder(tx, orderID, orders.StatusReadyForPickup); err != nil {
		return nil, err
	}
	current, err := GetForUpdateByOrderID(tx, orderID)
	if err != nil {
		return nil, err
	}
	if current.Status == SessionCancelled {
		return nil, ErrCancelled
	}
	if current.Status != SessionNoShow {
		return nil, fmt.Errorf("%w: only a no-show pickup session can be rescheduled", ErrConflict)
	}

	fromJSON := sessionJSON(current)
	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_pickup_sessions
		SET hashed_otp = $1,
		    expires_at = $2,
		    attempt_count = 0,
		    used_at = NULL,
		    verified_by_actor_id = NULL,
		    verification_method = NULL,
		    status = 'active',
		    customer_notified_at = NULL,
		    customer_arrived_at = NULL,
		    no_show_at = NULL,
		    no_show_reason = NULL,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $3 AND version = $4`,
		invalidationHash,
		newExpiry.UTC(),
		current.ID,
		current.Version,
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return nil, ErrVersionConflict
	}

	updated, err := scanSession(tx.QueryRow(`SELECT `+sessionColumns+` FROM dsh_pickup_sessions WHERE id = $1`, current.ID).Scan)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "reschedule", reason, correlationID, fromJSON, sessionJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "pickup_rescheduled", updated.ID, sessionJSON(updated), correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return Get(s.db, updated.ID)
}
