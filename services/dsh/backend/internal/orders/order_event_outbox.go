package orders

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type OrderOutboxRecord struct {
	ID            string
	TenantID      string
	OrderID       string
	EventID       string
	EventType     string
	CorrelationID string
	CausationID   string
	Payload       json.RawMessage
	AttemptCount  int
}

// ClaimOrderEvents atomically leases retryable events. The caller must publish
// the returned payloads and finish each record through MarkOrderEventPublished
// or MarkOrderEventRetry. SKIP LOCKED allows multiple workers without duplicate
// ownership and the status transition is in the same transaction as the claim.
func ClaimOrderEvents(db *sql.DB, limit int) ([]OrderOutboxRecord, error) {
	if limit <= 0 || limit > 200 { limit = 50 }
	tx, err := db.Begin()
	if err != nil { return nil, err }
	defer tx.Rollback()

	rows, err := tx.Query(`
		WITH candidates AS (
			SELECT id
			FROM dsh_order_event_outbox
			WHERE status IN ('pending','retry') AND next_attempt_at <= NOW()
			ORDER BY created_at, id
			FOR UPDATE SKIP LOCKED
			LIMIT $1
		)
		UPDATE dsh_order_event_outbox o
		SET status='processing', attempt_count=o.attempt_count+1, updated_at=NOW()
		FROM candidates c
		WHERE o.id=c.id
		RETURNING o.id::text,o.tenant_id,o.order_id::text,o.event_id::text,o.event_type,
		          o.correlation_id,o.causation_id,o.payload,o.attempt_count`, limit)
	if err != nil { return nil, err }
	defer rows.Close()
	result := make([]OrderOutboxRecord, 0)
	for rows.Next() {
		var record OrderOutboxRecord
		var payload []byte
		if err = rows.Scan(&record.ID,&record.TenantID,&record.OrderID,&record.EventID,&record.EventType,&record.CorrelationID,&record.CausationID,&payload,&record.AttemptCount); err != nil { return nil, err }
		record.Payload = json.RawMessage(payload)
		result = append(result, record)
	}
	if err = rows.Err(); err != nil { return nil, err }
	if err = tx.Commit(); err != nil { return nil, err }
	return result, nil
}

func MarkOrderEventPublished(db *sql.DB, outboxID, tenantID string) error {
	if strings.TrimSpace(outboxID) == "" || strings.TrimSpace(tenantID) == "" { return ErrInvalid }
	result, err := db.Exec(`
		UPDATE dsh_order_event_outbox
		SET status='published', published_at=NOW(), last_error='', updated_at=NOW()
		WHERE id=$1::uuid AND tenant_id=$2 AND status='processing'`, outboxID, tenantID)
	if err != nil { return err }
	affected, err := result.RowsAffected()
	if err != nil { return err }
	if affected != 1 { return ErrConflict }
	return nil
}

func MarkOrderEventRetry(db *sql.DB, outboxID, tenantID, failure string, retryAfter time.Duration) error {
	outboxID = strings.TrimSpace(outboxID)
	tenantID = strings.TrimSpace(tenantID)
	failure = strings.TrimSpace(failure)
	if outboxID == "" || tenantID == "" || failure == "" { return ErrInvalid }
	if retryAfter < time.Minute { retryAfter = time.Minute }
	if retryAfter > 24*time.Hour { retryAfter = 24*time.Hour }
	result, err := db.Exec(`
		UPDATE dsh_order_event_outbox
		SET status=CASE WHEN attempt_count >= 12 THEN 'dead_letter' ELSE 'retry' END,
		    next_attempt_at=CASE WHEN attempt_count >= 12 THEN next_attempt_at ELSE NOW()+$3::interval END,
		    last_error=LEFT($4,1000), updated_at=NOW()
		WHERE id=$1::uuid AND tenant_id=$2 AND status='processing'`,
		outboxID, tenantID, retryAfter.String(), failure)
	if err != nil { return err }
	affected, err := result.RowsAffected()
	if err != nil { return err }
	if affected != 1 { return ErrConflict }
	return nil
}

func GetOrderOutboxRecord(db *sql.DB, tenantID, eventID string) (*OrderOutboxRecord, error) {
	var record OrderOutboxRecord
	var payload []byte
	err := db.QueryRow(`
		SELECT id::text,tenant_id,order_id::text,event_id::text,event_type,correlation_id,causation_id,payload,attempt_count
		FROM dsh_order_event_outbox WHERE tenant_id=$1 AND event_id=$2::uuid`, tenantID, eventID,
	).Scan(&record.ID,&record.TenantID,&record.OrderID,&record.EventID,&record.EventType,&record.CorrelationID,&record.CausationID,&payload,&record.AttemptCount)
	if errors.Is(err, sql.ErrNoRows) { return nil, ErrNotFound }
	if err != nil { return nil, err }
	record.Payload = json.RawMessage(payload)
	return &record, nil
}
