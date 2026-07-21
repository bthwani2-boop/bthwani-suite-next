package orders

import (
	"context"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/wlt"
)

func TestJRN011PaymentProjectionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOrderTruthDBFixture(t, db)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	created, replay, err := CreateOrderTruth(db, CreateOrderTruthInput{
		CheckoutIntentID: fixture.CheckoutID,
		ClientID:         fixture.ClientID,
		TenantID:         fixture.TenantID,
		IdempotencyKey:   "jrn011-projection-" + suffix,
		CorrelationID:    "jrn011-projection-trace-" + suffix,
	})
	if err != nil || replay {
		t.Fatalf("create projection fixture order: replay=%v err=%v", replay, err)
	}

	work := paymentProjectionWork{
		OrderID:      created.ID,
		TenantID:     fixture.TenantID,
		SessionID:    created.WltPaymentRefID,
		AttemptCount: 1,
	}
	// PostgreSQL timestamptz stores microsecond precision. Use the same precision
	// in the source fact so the assertion verifies semantic equality rather than
	// failing on nanoseconds discarded by the database driver.
	capturedAt := time.Now().UTC().Add(2 * time.Minute).Truncate(time.Microsecond)
	if err := applyPaymentProjection(context.Background(), db, work, &wlt.PaymentSessionDetail{
		ID:        created.WltPaymentRefID,
		Method:    "cod",
		Status:    "captured",
		UpdatedAt: capturedAt,
	}); err != nil {
		t.Fatalf("apply captured WLT projection: %v", err)
	}

	var projection string
	var version int
	var sourceUpdatedAt time.Time
	if err := db.QueryRow(`
		SELECT payment_status_projection, version, payment_projection_source_updated_at
		FROM dsh_orders
		WHERE id=$1::uuid AND tenant_id=$2`, created.ID, fixture.TenantID,
	).Scan(&projection, &version, &sourceUpdatedAt); err != nil {
		t.Fatalf("read captured projection: %v", err)
	}
	if projection != "confirmed" || version <= created.Version || !sourceUpdatedAt.Equal(capturedAt) {
		t.Fatalf("captured projection was not applied: projection=%s version=%d source=%s expectedSource=%s", projection, version, sourceUpdatedAt, capturedAt)
	}

	var projectionEventCount int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_order_status_events
		WHERE tenant_id=$1 AND order_id=$2::uuid
		  AND event_type='order.payment_projection_updated'`, fixture.TenantID, created.ID,
	).Scan(&projectionEventCount); err != nil {
		t.Fatalf("count captured projection events: %v", err)
	}
	if projectionEventCount != 1 {
		t.Fatalf("expected one captured projection event, got %d", projectionEventCount)
	}

	// An older WLT response can arrive after a timeout and retry. It must not
	// regress the newer captured fact or increment the order version/event log.
	staleRefundedAt := capturedAt.Add(-time.Minute)
	if err := applyPaymentProjection(context.Background(), db, work, &wlt.PaymentSessionDetail{
		ID:        created.WltPaymentRefID,
		Method:    "cod",
		Status:    "refunded",
		UpdatedAt: staleRefundedAt,
	}); err != nil {
		t.Fatalf("apply stale refunded WLT projection: %v", err)
	}

	var projectionAfterStale string
	var versionAfterStale int
	var sourceAfterStale time.Time
	if err := db.QueryRow(`
		SELECT payment_status_projection, version, payment_projection_source_updated_at
		FROM dsh_orders
		WHERE id=$1::uuid AND tenant_id=$2`, created.ID, fixture.TenantID,
	).Scan(&projectionAfterStale, &versionAfterStale, &sourceAfterStale); err != nil {
		t.Fatalf("read projection after stale source: %v", err)
	}
	if projectionAfterStale != projection || versionAfterStale != version || !sourceAfterStale.Equal(capturedAt) {
		t.Fatalf(
			"stale WLT source regressed truth: projection=%s version=%d source=%s",
			projectionAfterStale,
			versionAfterStale,
			sourceAfterStale,
		)
	}
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_order_status_events
		WHERE tenant_id=$1 AND order_id=$2::uuid
		  AND event_type='order.payment_projection_updated'`, fixture.TenantID, created.ID,
	).Scan(&projectionEventCount); err != nil {
		t.Fatalf("recount projection events: %v", err)
	}
	if projectionEventCount != 1 {
		t.Fatalf("stale WLT source produced event noise: %d", projectionEventCount)
	}
}
