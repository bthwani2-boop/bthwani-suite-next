package pickup

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type PartnerStage string

const (
	PartnerStageNotReady        PartnerStage = "not_ready"
	PartnerStageReady           PartnerStage = "ready"
	PartnerStageNotified        PartnerStage = "notified"
	PartnerStageCustomerArrived PartnerStage = "customer_arrived"
	PartnerStageVerified        PartnerStage = "verified"
	PartnerStageNoShow          PartnerStage = "no_show"
	PartnerStageCancelled       PartnerStage = "cancelled"
)

func isPickupCancellationOrderStatus(status string) bool {
	return strings.HasPrefix(status, "cancelled_") || status == "failed_payment" || status == "failed_dispatch"
}

// ResolvePartnerStage returns the resumable partner/client pickup stage from
// the sovereign order and pickup row. Audit lookup is retained only as a legacy
// read fallback for sessions created before the durable lifecycle columns.
func ResolvePartnerStage(db *sql.DB, orderID, orderStatus string, session *PickupSession) (PartnerStage, error) {
	if isPickupCancellationOrderStatus(orderStatus) {
		return PartnerStageCancelled, nil
	}
	if session == nil {
		if orderStatus == "ready_for_pickup" {
			return PartnerStageReady, nil
		}
		return PartnerStageNotReady, nil
	}

	switch session.Status {
	case SessionCancelled:
		return PartnerStageCancelled, nil
	case SessionVerified, SessionConsumed:
		return PartnerStageVerified, nil
	case SessionNoShow:
		return PartnerStageNoShow, nil
	case SessionActive:
		if !session.ExpiresAt.After(time.Now().UTC()) {
			return PartnerStageReady, nil
		}
	default:
		return PartnerStageReady, nil
	}

	if session.CustomerArrivedAt != nil {
		return PartnerStageCustomerArrived, nil
	}
	if session.CustomerNotifiedAt != nil {
		return PartnerStageNotified, nil
	}
	if session.RescheduledAt != nil {
		return PartnerStageReady, nil
	}

	var action string
	err := db.QueryRow(`
		SELECT action
		FROM dsh_pickup_audit_events
		WHERE entity_id IN ($1, $2)
		  AND action IN ('issue_otp', 'notify_customer', 'customer_arrived', 'reschedule')
		ORDER BY created_at DESC
		LIMIT 1`,
		session.ID, orderID,
	).Scan(&action)
	if errors.Is(err, sql.ErrNoRows) {
		return PartnerStageReady, nil
	}
	if err != nil {
		return "", err
	}

	switch action {
	case "customer_arrived":
		return PartnerStageCustomerArrived, nil
	case "notify_customer":
		return PartnerStageNotified, nil
	default:
		return PartnerStageReady, nil
	}
}
