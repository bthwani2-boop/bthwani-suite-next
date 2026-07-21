package notifications

import (
	"database/sql"
	"strings"
	"time"
)

type DeliveryAttempt struct {
	ID            string     `json:"id"`
	EventID       string     `json:"eventId"`
	EventType     string     `json:"eventType"`
	EntityType    string     `json:"entityType"`
	EntityID      string     `json:"entityId"`
	AttemptNumber int        `json:"attemptNumber"`
	Outcome       string     `json:"outcome"`
	ErrorMessage  string     `json:"errorMessage"`
	NextRetryAt   *time.Time `json:"nextRetryAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	OutboxStatus  string     `json:"outboxStatus"`
	CorrelationID string     `json:"correlationId"`
}

type DeliveryAuditSummary struct {
	Sent           int `json:"sent"`
	RetryScheduled int `json:"retryScheduled"`
	DeadLetter     int `json:"deadLetter"`
	PendingOutbox  int `json:"pendingOutbox"`
	FailedOutbox   int `json:"failedOutbox"`
}

func validDeliveryOutcome(value string) bool {
	switch value {
	case "", "sent", "retry_scheduled", "dead_letter":
		return true
	default:
		return false
	}
}

func ListDeliveryAttempts(db *sql.DB, outcome string, limit int) ([]DeliveryAttempt, DeliveryAuditSummary, error) {
	outcome = strings.ToLower(strings.TrimSpace(outcome))
	if db == nil || !validDeliveryOutcome(outcome) {
		return nil, DeliveryAuditSummary{}, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	query := `
		SELECT a.id::text,
		       a.event_id::text,
		       o.event_type,
		       o.entity_type,
		       o.entity_id,
		       a.attempt_number,
		       a.outcome,
		       a.error_message,
		       a.next_retry_at,
		       a.created_at,
		       o.status,
		       COALESCE(o.correlation_id, '')
		FROM dsh_notification_delivery_attempts a
		JOIN dsh_operational_outbox_events o ON o.id = a.event_id`
	args := []any{}
	if outcome != "" {
		query += ` WHERE a.outcome = $1`
		args = append(args, outcome)
	}
	query += ` ORDER BY a.created_at DESC, a.id DESC LIMIT $` + itoa(len(args)+1)
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, DeliveryAuditSummary{}, err
	}
	defer rows.Close()
	items := make([]DeliveryAttempt, 0)
	for rows.Next() {
		var item DeliveryAttempt
		if err := rows.Scan(
			&item.ID,
			&item.EventID,
			&item.EventType,
			&item.EntityType,
			&item.EntityID,
			&item.AttemptNumber,
			&item.Outcome,
			&item.ErrorMessage,
			&item.NextRetryAt,
			&item.CreatedAt,
			&item.OutboxStatus,
			&item.CorrelationID,
		); err != nil {
			return nil, DeliveryAuditSummary{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, DeliveryAuditSummary{}, err
	}

	var summary DeliveryAuditSummary
	if err := db.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE outcome = 'sent'),
			COUNT(*) FILTER (WHERE outcome = 'retry_scheduled'),
			COUNT(*) FILTER (WHERE outcome = 'dead_letter')
		FROM dsh_notification_delivery_attempts`).Scan(
		&summary.Sent,
		&summary.RetryScheduled,
		&summary.DeadLetter,
	); err != nil {
		return nil, DeliveryAuditSummary{}, err
	}
	if err := db.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE status = 'pending'),
			COUNT(*) FILTER (WHERE status = 'failed')
		FROM dsh_operational_outbox_events`).Scan(
		&summary.PendingOutbox,
		&summary.FailedOutbox,
	); err != nil {
		return nil, DeliveryAuditSummary{}, err
	}
	return items, summary, nil
}

func itoa(value int) string {
	if value == 0 {
		return "0"
	}
	var digits [20]byte
	position := len(digits)
	for value > 0 {
		position--
		digits[position] = byte('0' + value%10)
		value /= 10
	}
	return string(digits[position:])
}
