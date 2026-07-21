package orders

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

const orderEventBridgeBatchSize = 50

// RunOrderEventBridgeWorker transfers the JRN-011 transactional order event
// outbox into the already-running canonical operational outbox. The order event
// UUID is reused as the downstream outbox UUID, making a crash between insert
// and MarkOrderEventPublished safe to replay without duplicate delivery.
func RunOrderEventBridgeWorker(ctx context.Context, db *sql.DB, interval time.Duration) {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	if err := ProcessOrderEventBridgeOnce(ctx, db); err != nil {
		log.Printf("[order-event-bridge] startup batch failed: %v", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOrderEventBridgeOnce(ctx, db); err != nil {
				log.Printf("[order-event-bridge] batch failed: %v", err)
			}
		}
	}
}

func ProcessOrderEventBridgeOnce(ctx context.Context, db *sql.DB) error {
	events, err := ClaimOrderEvents(db, orderEventBridgeBatchSize)
	if err != nil {
		return fmt.Errorf("claim order event bridge batch: %w", err)
	}
	for _, event := range events {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := publishOrderEventToOperationalOutbox(ctx, db, event); err != nil {
			retryAfter := time.Duration(1<<uint(minOrderBridgeAttempt(event.AttemptCount, 10))) * time.Second
			if markErr := MarkOrderEventRetry(db, event.ID, event.TenantID, err.Error(), retryAfter); markErr != nil {
				log.Printf("[order-event-bridge] failed to persist retry for %s: %v", event.ID, markErr)
			}
			continue
		}
		if err := MarkOrderEventPublished(db, event.ID, event.TenantID); err != nil {
			log.Printf("[order-event-bridge] failed to mark %s published: %v", event.ID, err)
		}
	}
	return nil
}

func publishOrderEventToOperationalOutbox(ctx context.Context, db *sql.DB, event OrderOutboxRecord) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO dsh_operational_outbox_events
			(id, event_type, entity_type, entity_id, payload, correlation_id)
		VALUES ($1::uuid, $2, 'order', $3, $4::jsonb, $5)
		ON CONFLICT (id) DO NOTHING`,
		event.EventID,
		event.EventType,
		event.OrderID,
		string(event.Payload),
		event.CorrelationID,
	)
	if err != nil {
		return fmt.Errorf("publish order event %s to operational outbox: %w", event.EventID, err)
	}
	return nil
}

func minOrderBridgeAttempt(value, maximum int) int {
	if value < 1 {
		return 1
	}
	if value > maximum {
		return maximum
	}
	return value
}
