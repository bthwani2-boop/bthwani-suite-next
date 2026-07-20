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

// TestCreateOrderStoresRealPriceSnapshotDBIntegration proves order items are
// created with the real catalog-derived unit price, not a hardcoded 0.
func TestCreateOrderStoresRealPriceSnapshotDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "order-price-test-store-" + suffix
	clientID := "order-price-test-client-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Order Price Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
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

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_cart_items (cart_id, product_id, product_name, price_reference, unit_price, quantity)
		VALUES ($1::uuid, 'priced-product', 'Priced Product', '42.00 YER', 42.00, 2)`,
		cartID); err != nil {
		t.Fatalf("failed to insert priced cart item: %v", err)
	}

	var intentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
		VALUES ($1, $2::uuid, $3, 'payment_pending', 'cod', $4)
		RETURNING id::text`,
		clientID, cartID, storeID, "wlt-ps-"+suffix,
	).Scan(&intentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	order, err := CreateOrder(db, CreateOrderInput{CheckoutIntentID: intentID, ClientID: clientID})
	if err != nil {
		t.Fatalf("CreateOrder failed: %v", err)
	}
	if len(order.Items) != 1 {
		t.Fatalf("expected 1 order item, got %d", len(order.Items))
	}
	if order.Items[0].UnitPrice != 42.00 {
		t.Fatalf("expected order item unitPrice=42.00 from cart snapshot, got %v", order.Items[0].UnitPrice)
	}

	var storedUnitPrice float64
	if err := db.QueryRowContext(ctx, `SELECT unit_price FROM dsh_order_items WHERE order_id = $1::uuid`, order.ID).
		Scan(&storedUnitPrice); err != nil {
		t.Fatalf("failed to read stored order item price: %v", err)
	}
	if storedUnitPrice != 42.00 {
		t.Fatalf("expected dsh_order_items.unit_price=42.00, got %v", storedUnitPrice)
	}
}

// seedOrderFixture creates a store, checkout intent, and order row with a WLT
// payment session reference already attached, mirroring what CreateOrder
// would have produced for a wallet/cod order.
func seedOrderFixture(t *testing.T, db *sql.DB, status string) (order *Order, paymentSessionID string) {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "order-outbox-test-store-" + suffix
	clientID := "order-outbox-test-client-" + suffix
	paymentSessionID = "order-outbox-test-ps-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Order Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	var intentID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
		VALUES ($1, gen_random_uuid(), $2, 'confirmed', 'wallet', $3)
		RETURNING id::text`,
		clientID, storeID, paymentSessionID,
	).Scan(&intentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	var o Order
	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, $3, $4, $5)
		RETURNING id::text, checkout_intent_id::text, store_id, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		intentID, storeID, clientID, status, paymentSessionID,
	).Scan(
		&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.ClientID,
		&o.Status, &o.RejectionReason, &o.WltPaymentRefID,
		&o.CreatedAt, &o.UpdatedAt,
	); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}
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

// TestRejectOrderEnqueuesCancelForOrderWhenPaymentRefExistsDBIntegration
// proves the legacy partner-reject entry point delegates to the governed store
// cancellation state and enqueues the same durable WLT closure event.
func TestRejectOrderEnqueuesCancelForOrderWhenPaymentRefExistsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPending))
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id = $1`, paymentSessionID)
	})

	rejected, err := RejectOrder(db, order.ID, "partner-1", "out of stock")
	if err != nil {
		t.Fatalf("RejectOrder failed: %v", err)
	}
	if rejected.Status != StatusCancelledByStore {
		t.Fatalf("expected status %s, got %s", StatusCancelledByStore, rejected.Status)
	}

	eventType, orderID, reason, found := fetchFinancialClosureOutboxRow(t, db, paymentSessionID)
	if !found {
		t.Fatalf("expected a cancel_for_order outbox event, found none")
	}
	if eventType != "cancel_for_order" {
		t.Fatalf("expected event_type=cancel_for_order, got %q", eventType)
	}
	if !orderID.Valid || orderID.String != order.ID {
		t.Fatalf("expected order_id=%q, got %+v", order.ID, orderID)
	}
	if reason != "other: out of stock" {
		t.Fatalf("expected governed reason, got %q", reason)
	}
}

// TestCancelOrderByOperatorEnqueuesCancelForOrderDBIntegration proves the
// compatibility operator entry point delegates to the governed explicit state.
func TestCancelOrderByOperatorEnqueuesCancelForOrderDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPending))
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id = $1`, paymentSessionID)
	})

	cancelled, err := CancelOrderByOperator(db, order.ID, "operator-1", "store unresponsive")
	if err != nil {
		t.Fatalf("CancelOrderByOperator failed: %v", err)
	}
	if cancelled.Status != StatusCancelledByOperator {
		t.Fatalf("expected status %s, got %s", StatusCancelledByOperator, cancelled.Status)
	}

	eventType, orderID, reason, found := fetchFinancialClosureOutboxRow(t, db, paymentSessionID)
	if !found {
		t.Fatalf("expected a cancel_for_order outbox event, found none")
	}
	if eventType != "cancel_for_order" {
		t.Fatalf("expected event_type=cancel_for_order, got %q", eventType)
	}
	if !orderID.Valid || orderID.String != order.ID {
		t.Fatalf("expected order_id=%q, got %+v", order.ID, orderID)
	}
	if reason != "other: store unresponsive" {
		t.Fatalf("expected governed reason, got %q", reason)
	}
}

// TestAcceptOrderEnqueuesNothingDBIntegration proves a non-cancelling
// transition does not write a financial closure event.
func TestAcceptOrderEnqueuesNothingDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPending))

	if _, err := AcceptOrder(db, order.ID, "partner-1"); err != nil {
		t.Fatalf("AcceptOrder failed: %v", err)
	}

	_, _, _, found := fetchFinancialClosureOutboxRow(t, db, paymentSessionID)
	if found {
		t.Fatalf("expected no outbox event for a non-cancelling transition")
	}
}
