package orders

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

type DecidePartnerOrderInput struct {
	OrderID         string
	StoreID         string
	ActorID         string
	Decision        string // "accept" or "reject"
	ReasonCode      string
	ReasonNote      string
	ExpectedVersion int
	IdempotencyKey  string
}

func partnerDecisionFingerprint(input DecidePartnerOrderInput) string {
	hash := sha256.Sum256([]byte(strings.Join([]string{
		input.OrderID,
		input.StoreID,
		input.Decision,
		input.ReasonCode,
		input.ReasonNote,
	}, "|")))
	return hex.EncodeToString(hash[:])
}

// DecidePartnerOrder replaces the legacy AcceptOrder and RejectOrder endpoints.
// It enforces idempotency, OCC (versioning), and unified decision tracking.
func DecidePartnerOrder(db *sql.DB, input DecidePartnerOrderInput) (*Order, error) {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Decision = strings.TrimSpace(input.Decision)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.ReasonCode = strings.TrimSpace(input.ReasonCode)
	input.ReasonNote = strings.TrimSpace(input.ReasonNote)

	if db == nil || input.OrderID == "" || input.StoreID == "" || input.ActorID == "" || input.IdempotencyKey == "" {
		return nil, ErrInvalid
	}
	if input.Decision != "accept" && input.Decision != "reject" {
		return nil, fmt.Errorf("%w: decision must be 'accept' or 'reject'", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	fingerprint := partnerDecisionFingerprint(input)
	lockIdentity := input.StoreID + "|partner-order-decision|" + input.IdempotencyKey
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockIdentity); err != nil {
		return nil, err
	}

	// 1. Idempotency Check
	var existingOrderID, existingDecision, existingFingerprint string
	err = tx.QueryRow(`
		SELECT order_id::text, decision, request_fingerprint
		FROM dsh_partner_order_decisions
		WHERE store_id = $1 AND idempotency_key = $2
	`, input.StoreID, input.IdempotencyKey).Scan(&existingOrderID, &existingDecision, &existingFingerprint)
	if err == nil {
		// Found idempotent record
		if existingOrderID != input.OrderID || existingDecision != input.Decision || existingFingerprint != fingerprint {
			return nil, fmt.Errorf("%w: idempotent key used with different order decision input", ErrConflict)
		}
		// Return current order state
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return GetOrder(db, input.OrderID)
	} else if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	// 2. Fetch Order and Verify Version/State
	var currentStatus OrderStatus
	var currentVersion int
	var actualStoreID string
	var deadlineAt *time.Time
	err = tx.QueryRow(`
		SELECT status, version, store_id, partner_deadline_at
		FROM dsh_orders
		WHERE id = $1::uuid
		FOR UPDATE
	`, input.OrderID).Scan(&currentStatus, &currentVersion, &actualStoreID, &deadlineAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if actualStoreID != input.StoreID {
		return nil, ErrNotFound
	}
	if currentStatus != StatusPending {
		return nil, fmt.Errorf("%w: order is not pending (current status: %s)", ErrConflict, currentStatus)
	}
	if currentVersion != input.ExpectedVersion {
		return nil, fmt.Errorf("%w: expected version %d, got %d", ErrConflict, input.ExpectedVersion, currentVersion)
	}
	if deadlineAt != nil && time.Now().After(*deadlineAt) {
		return nil, fmt.Errorf("%w: order deadline has expired", ErrConflict)
	}

	// 3. Record Decision
	_, err = tx.Exec(`
		INSERT INTO dsh_partner_order_decisions
		(order_id, store_id, actor_id, decision, reason_code, reason_note, idempotency_key, request_fingerprint)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
	`, input.OrderID, input.StoreID, input.ActorID, input.Decision, input.ReasonCode, input.ReasonNote, input.IdempotencyKey, fingerprint)
	if err != nil {
		return nil, err
	}

	// 4. Apply State Transition
	if input.Decision == "accept" {
		// Use internal preparation logic to set SLA
		var preparationMinutes, warningMinutes int
		if err := tx.QueryRow(`
			SELECT COALESCE(default_preparation_minutes, $2),
				   COALESCE(warning_before_minutes, $3)
			FROM (SELECT $1::text AS store_id) requested
			LEFT JOIN dsh_store_order_preparation_policies policy USING (store_id)`,
			input.StoreID, DefaultPreparationMinutes, DefaultWarningMinutes,
		).Scan(&preparationMinutes, &warningMinutes); err != nil {
			return nil, err
		}

		_, err = tx.Exec(`
			UPDATE dsh_orders
			SET status = $2,
			    version = version + 1,
				accepted_at = NOW(),
				estimated_ready_at = NOW() + make_interval(mins => $3),
				estimated_preparation_minutes = $3,
				preparation_warning_minutes = $4,
				preparation_delay_reason = NULL,
				updated_at = NOW()
			WHERE id = $1::uuid
		`, input.OrderID, string(StatusStoreAccepted), preparationMinutes, warningMinutes)
		if err != nil {
			return nil, err
		}

		if _, err := tx.Exec(`
			INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)
			VALUES($1::uuid, 'partner', $2, $3, $4)`,
			input.OrderID, string(StatusPending), string(StatusStoreAccepted),
			fmt.Sprintf("accepted with preparation estimate %d minutes", preparationMinutes),
		); err != nil {
			return nil, err
		}

	} else {
		// Reject Decision -> governed cancellation
		_, err = tx.Exec(`
			UPDATE dsh_orders
			SET status = $2,
			    version = version + 1,
				rejection_reason = $3,
				updated_at = NOW()
			WHERE id = $1::uuid
		`, input.OrderID, string(StatusCancelled), input.ReasonCode)
		if err != nil {
			return nil, err
		}

		if _, err := tx.Exec(`
			INSERT INTO dsh_order_status_events(order_id, actor_role, from_status, to_status, note)
			VALUES($1::uuid, 'partner', $2, $3, $4)`,
			input.OrderID, string(StatusPending), string(StatusCancelled), input.ReasonNote,
		); err != nil {
			return nil, err
		}

		// Enqueue WLT cancellation/refund outbox event
		if _, err := tx.Exec(`
			INSERT INTO dsh_operational_outbox_events (event_type, entity_type, entity_id, payload, correlation_id)
			VALUES ('order.cancelled', 'order', $1, $2::jsonb, $3)
		`, input.OrderID, fmt.Sprintf(`{"orderId":%q, "reasonCode":%q}`, input.OrderID, input.ReasonCode), "reject-"+input.IdempotencyKey); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrder(db, input.OrderID)
}

// SweepExpiredPendingOrders is the idempotent Timeout Worker job
func SweepExpiredPendingOrders(db *sql.DB) (int, error) {
	// Find up to 100 expired pending orders
	rows, err := db.Query(`
		SELECT id::text
		FROM dsh_orders
		WHERE status = 'pending' AND partner_deadline_at < NOW()
		LIMIT 100
		FOR UPDATE SKIP LOCKED
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var expiredIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
		expiredIDs = append(expiredIDs, id)
	}
	rows.Close()

	count := 0
	for _, id := range expiredIDs {
		// Perform a governed cancellation for each
		_, err := CancelOrderSync(db, CreateCancellationCaseInput{
			OrderID:       id,
			ActorID:       "system",
			ActorRole:     "system",
			ReasonCode:    "partner_timeout",
			ReasonNote:    "Partner did not accept the order within the deadline",
			CorrelationID: "timeout:" + id,
		})
		if err == nil {
			count++
		}
	}

	return count, nil
}
