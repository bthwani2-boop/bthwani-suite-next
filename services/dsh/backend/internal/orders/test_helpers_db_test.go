package orders

import (
	"context"
	"database/sql"
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

// seedOrderFixture creates a OperatorContext-scoped store, checkout intent, and order
// row with a WLT payment session reference already attached, mirroring the
// governed CreateOrder path used by wallet/COD orders.
func seedOrderFixture(t *testing.T, db *sql.DB, status string) (order *Order, paymentSessionID string) {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	operatorContextID := "OperatorContext-order-outbox-" + suffix
	storeID := "order-outbox-test-store-" + suffix
	clientID := "order-outbox-test-client-" + suffix
	paymentSessionID = "order-outbox-test-ps-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Order Outbox Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	var intentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (
			operator_context_id, client_id, cart_id, store_id, state, fulfillment_mode,
			payment_method, wlt_payment_session_id, subtotal_minor_units, delivery_fee_minor_units, discount_minor_units, total_minor_units, currency, pricing_snapshot_hash
		)
		VALUES ($1, $2, gen_random_uuid(), $3, 'confirmed', 'bthwani_delivery', 'wallet', $4,
		        1000, 0, 0, 1000, 'YER', repeat('b', 64))
		RETURNING id::text`,
		operatorContextID, clientID, storeID, paymentSessionID,
	).Scan(&intentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	var o Order
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (
			operator_context_id, checkout_intent_id, store_id, fulfillment_mode,
			client_id, status, wlt_payment_ref_id
		)
		VALUES ($1, $2::uuid, $3, 'bthwani_delivery', $4, $5, $6)
		RETURNING id::text, checkout_intent_id::text, store_id, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		operatorContextID, intentID, storeID, clientID, status, paymentSessionID,
	).Scan(
		&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.ClientID,
		&o.Status, &o.RejectionReason, &o.WltPaymentRefID,
		&o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}
	o.FulfillmentMode = "bthwani_delivery"
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_orders WHERE id = $1::uuid`, o.ID) })
	return &o, paymentSessionID
}

func fetchFinancialClosureOutboxRow(t *testing.T, db *sql.DB, paymentSessionID string) (eventType string, orderID sql.NullString, reason string, found bool) {
	t.Helper()
	err := db.QueryRow(`
		SELECT event_type, order_id::text, reason
		FROM dsh_checkout_financial_closure_outbox
		WHERE payment_session_id = $1`, paymentSessionID,
	).Scan(&eventType, &orderID, &reason)
	if err == sql.ErrNoRows {
		return "", sql.NullString{}, "", false
	}
	if err != nil {
		t.Fatalf("failed to query financial closure outbox: %v", err)
	}
	return eventType, orderID, reason, true
}

