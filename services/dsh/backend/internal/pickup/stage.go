package pickup

import (
	"database/sql"
	"errors"
)

type Stage string

const (
	StageNotReady        Stage = "not_ready"
	StageReady           Stage = "ready"
	StageNotified        Stage = "notified"
	StageCustomerArrived Stage = "customer_arrived"
	StageVerified        Stage = "verified"
	StageNoShow          Stage = "no_show"
)

// ResolveStage derives one durable pickup stage without duplicating workflow
// state in another mutable column. Order status owns readiness, the session
// owns OTP consumption, and the atomic audit stream owns notification/arrival.
func ResolveStage(db *sql.DB, orderID string, session *PickupSession) (Stage, error) {
	var orderStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_orders WHERE id = $1::uuid`, orderID).Scan(&orderStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return StageNotReady, ErrNotFound
		}
		return StageNotReady, err
	}

	if session != nil && session.UsedAt != nil {
		if session.VerificationMethod != nil && *session.VerificationMethod == "no_show" {
			return StageNoShow, nil
		}
		return StageVerified, nil
	}
	if orderStatus != "ready_for_pickup" {
		return StageNotReady, nil
	}
	if session == nil {
		return StageReady, nil
	}

	var latestAction string
	err := db.QueryRow(`
		SELECT action
		FROM dsh_pickup_audit_events
		WHERE entity_id IN ($1, $2)
		ORDER BY created_at DESC
		LIMIT 1`, orderID, session.ID).Scan(&latestAction)
	if errors.Is(err, sql.ErrNoRows) {
		return StageNotified, nil
	}
	if err != nil {
		return StageNotified, err
	}
	switch latestAction {
	case "customer_arrived":
		return StageCustomerArrived, nil
	case "notify_customer", "issue_otp", "extend_window":
		return StageNotified, nil
	default:
		return StageNotified, nil
	}
}
