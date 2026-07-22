package orders

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type OrderTruthDiagnostics struct {
	TenantID                       string     `json:"tenantId"`
	GeneratedAt                    time.Time  `json:"generatedAt"`
	OrdersCreatedLastFiveMinutes   int64      `json:"ordersCreatedLastFiveMinutes"`
	OrdersCreatedLastHour          int64      `json:"ordersCreatedLastHour"`
	IncompleteCreateAttempts       int64      `json:"incompleteCreateAttempts"`
	PendingOutboxEvents            int64      `json:"pendingOutboxEvents"`
	RetryingOutboxEvents           int64      `json:"retryingOutboxEvents"`
	DeadLetterOutboxEvents         int64      `json:"deadLetterOutboxEvents"`
	OldestUnpublishedEventAt       *time.Time `json:"oldestUnpublishedEventAt,omitempty"`
	UnknownPaymentProjections      int64      `json:"unknownPaymentProjections"`
	StalePaymentProjections        int64      `json:"stalePaymentProjections"`
	IdempotencyConflictsLastHour   int64      `json:"idempotencyConflictsLastHour"`
	SnapshotProtectionFailuresHour int64      `json:"snapshotProtectionFailuresLastHour"`
	Health                         string     `json:"health"`
	Alerts                         []string   `json:"alerts"`
}

// LoadOrderTruthDiagnostics returns tenant-scoped operational facts only. It
// intentionally excludes client identity, address snapshots and payment data.
func LoadOrderTruthDiagnostics(db *sql.DB, tenantID string) (*OrderTruthDiagnostics, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return nil, ErrInvalid
	}

	result := &OrderTruthDiagnostics{
		TenantID:    tenantID,
		GeneratedAt: time.Now().UTC(),
		Health:      "healthy",
		Alerts:      []string{},
	}
	var oldest sql.NullTime
	err := db.QueryRow(`
		SELECT
		  COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '5 minutes'),
		  COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '1 hour'),
		  (SELECT COUNT(*) FROM dsh_order_create_idempotency i
		    WHERE i.tenant_id=$1 AND i.order_id IS NULL AND i.created_at < NOW()-INTERVAL '2 minutes'),
		  (SELECT COUNT(*) FROM dsh_order_event_outbox x WHERE x.tenant_id=$1 AND x.status='pending'),
		  (SELECT COUNT(*) FROM dsh_order_event_outbox x WHERE x.tenant_id=$1 AND x.status='retry'),
		  (SELECT COUNT(*) FROM dsh_order_event_outbox x WHERE x.tenant_id=$1 AND x.status='dead_letter'),
		  (SELECT MIN(x.created_at) FROM dsh_order_event_outbox x
		    WHERE x.tenant_id=$1 AND x.status IN ('pending','processing','retry')),
		  COUNT(*) FILTER (WHERE o.payment_status_projection='unknown'),
		  COUNT(*) FILTER (WHERE o.payment_projection_reconciled_at IS NULL
		    OR o.payment_projection_reconciled_at < NOW()-INTERVAL '2 minutes'),
		  (SELECT COUNT(*) FROM dsh_order_truth_audit a
		    WHERE a.tenant_id=$1 AND a.event_type='order.idempotency_conflict'
		      AND a.created_at >= NOW()-INTERVAL '1 hour'),
		  (SELECT COUNT(*) FROM dsh_order_truth_audit a
		    WHERE a.tenant_id=$1 AND a.event_type='order.snapshot_write_blocked'
		      AND a.created_at >= NOW()-INTERVAL '1 hour')
		FROM dsh_orders o
		WHERE o.tenant_id=$1`, tenantID,
	).Scan(
		&result.OrdersCreatedLastFiveMinutes,
		&result.OrdersCreatedLastHour,
		&result.IncompleteCreateAttempts,
		&result.PendingOutboxEvents,
		&result.RetryingOutboxEvents,
		&result.DeadLetterOutboxEvents,
		&oldest,
		&result.UnknownPaymentProjections,
		&result.StalePaymentProjections,
		&result.IdempotencyConflictsLastHour,
		&result.SnapshotProtectionFailuresHour,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return result, nil
	}
	if err != nil {
		return nil, err
	}
	if oldest.Valid {
		result.OldestUnpublishedEventAt = &oldest.Time
	}

	if result.IncompleteCreateAttempts > 0 {
		result.Health = "degraded"
		result.Alerts = append(result.Alerts, "ORDER_CREATE_ATTEMPT_STUCK")
	}
	if result.RetryingOutboxEvents > 0 {
		result.Health = "degraded"
		result.Alerts = append(result.Alerts, "ORDER_EVENT_OUTBOX_RETRYING")
	}
	if result.DeadLetterOutboxEvents > 0 {
		result.Health = "critical"
		result.Alerts = append(result.Alerts, "ORDER_EVENT_OUTBOX_DEAD_LETTER")
	}
	if result.SnapshotProtectionFailuresHour > 0 {
		result.Health = "critical"
		result.Alerts = append(result.Alerts, "ORDER_SNAPSHOT_TAMPER_ATTEMPT")
	}
	if result.StalePaymentProjections > 0 {
		if result.Health == "healthy" {
			result.Health = "degraded"
		}
		result.Alerts = append(result.Alerts, "ORDER_PAYMENT_PROJECTION_STALE")
	}
	return result, nil
}
