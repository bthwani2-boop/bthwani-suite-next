package wltoutbox

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

// seedOrderFixture creates the minimal store/cart/checkout-intent/order chain
// dsh_wlt_outbox_events' foreign keys require, and registers cleanup.
func seedOrderFixture(t *testing.T, db *sql.DB) (orderID, checkoutIntentID string) {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "wlt-outbox-test-store-" + suffix
	clientID := "wlt-outbox-test-client-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	var cartID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
		VALUES ($1, $2, 'bthwani_delivery', 'active')
		RETURNING id::text`,
		clientID, storeID,
	).Scan(&cartID); err != nil {
		t.Fatalf("failed to insert test cart: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
		VALUES ($1, $2::uuid, $3, 'payment_pending', 'cod', $4)
		RETURNING id::text`,
		clientID, cartID, storeID, "wlt-ps-"+suffix,
	).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status)
		VALUES ($1::uuid, $2, $3, 'pending')
		RETURNING id::text`,
		checkoutIntentID, storeID, clientID,
	).Scan(&orderID); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}
	return orderID, checkoutIntentID
}

func fetchOutboxRow(t *testing.T, db *sql.DB, id string) (status string, attemptCount int, lastError sql.NullString, nextRetryAt time.Time) {
	t.Helper()
	err := db.QueryRow(`
		SELECT status, attempt_count, last_error, next_retry_at
		FROM dsh_wlt_outbox_events WHERE id = $1::uuid`, id,
	).Scan(&status, &attemptCount, &lastError, &nextRetryAt)
	if err != nil {
		t.Fatalf("failed to fetch outbox row %s: %v", id, err)
	}
	return
}

// TestEnqueueIsIdempotentByOrderAndEventTypeDBIntegration proves a duplicate
// PoD-triggered enqueue for the same order never creates a second outbox row,
// so retried HTTP requests or transaction retries can't double-notify WLT.
func TestEnqueueIsIdempotentByOrderAndEventTypeDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	orderID, checkoutIntentID := seedOrderFixture(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID); err != nil {
		t.Fatalf("first enqueue failed: %v", err)
	}
	if err := Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID); err != nil {
		t.Fatalf("second enqueue (duplicate) failed: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 outbox row after duplicate enqueue, got %d", count)
	}
}

// TestClaimBatchLeasesRowsAndMarkSentFinalizesDBIntegration proves the WLT-down
// scenario from the P0 remediation: an event survives as 'pending' until
// claimed, a claim leases it (so a concurrent worker can't double-send), and
// MarkSent finalizes it after a successful notify.
func TestClaimBatchLeasesRowsAndMarkSentFinalizesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	orderID, checkoutIntentID := seedOrderFixture(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	batch, err := ClaimBatch(db, 20, 2*time.Minute)
	if err != nil {
		t.Fatalf("ClaimBatch failed: %v", err)
	}
	var claimed *Event
	for i := range batch {
		if batch[i].OrderID == orderID {
			claimed = &batch[i]
		}
	}
	if claimed == nil {
		t.Fatalf("expected order %s to be claimed in batch, got %d other events", orderID, len(batch))
	}

	// A second claim before the lease expires must not return the same row
	// (this is what prevents a second worker instance from double-sending).
	secondBatch, err := ClaimBatch(db, 20, 2*time.Minute)
	if err != nil {
		t.Fatalf("second ClaimBatch failed: %v", err)
	}
	for _, e := range secondBatch {
		if e.OrderID == orderID {
			t.Fatalf("order %s was claimed twice while its lease was still active", orderID)
		}
	}

	if err := MarkSent(db, claimed.ID); err != nil {
		t.Fatalf("MarkSent failed: %v", err)
	}
	status, _, _, _ := fetchOutboxRow(t, db, claimed.ID)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after MarkSent, got %q", status)
	}
}

// TestMarkFailedSchedulesRetryWithoutLosingTheEventDBIntegration proves that a
// WLT-down failure does not drop the event: it stays queryable, records the
// error, and becomes claimable again once next_retry_at has passed.
func TestMarkFailedSchedulesRetryWithoutLosingTheEventDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	orderID, checkoutIntentID := seedOrderFixture(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EventTypeDeliveryCompleted, orderID, "captain-1", "partner-1", checkoutIntentID); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	batch, err := ClaimBatch(db, 20, 1*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	var claimed *Event
	for i := range batch {
		if batch[i].OrderID == orderID {
			claimed = &batch[i]
		}
	}
	if claimed == nil {
		t.Fatalf("expected order %s to be claimed", orderID)
	}

	simulatedErr := errors.New("simulated WLT unreachable")
	if err := MarkFailed(db, claimed.ID, claimed.AttemptCount, simulatedErr); err != nil {
		t.Fatalf("MarkFailed failed: %v", err)
	}

	status, attemptCount, lastError, nextRetryAt := fetchOutboxRow(t, db, claimed.ID)
	if status != "pending" {
		t.Fatalf("expected event to remain 'pending' after a failed attempt, got %q", status)
	}
	if attemptCount != 1 {
		t.Fatalf("expected attempt_count 1 after first failure, got %d", attemptCount)
	}
	if !lastError.Valid || lastError.String != simulatedErr.Error() {
		t.Fatalf("expected last_error to record the failure, got %+v", lastError)
	}
	if !nextRetryAt.After(time.Now()) {
		t.Fatalf("expected next_retry_at to be scheduled in the future, got %v", nextRetryAt)
	}
}
