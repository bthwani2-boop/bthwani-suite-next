package dispatch

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

// seedArrivedCustomerFixture builds a store/cart/checkout-intent/order/
// assignment/delivery chain sitting in the arrived_customer state, ready for
// SubmitPoD, with the checkout intent's payment method controllable so both
// the COD and non-COD outbox-enqueue paths can be exercised.
func seedArrivedCustomerFixture(t *testing.T, db *sql.DB, paymentMethod string) (assignmentID, captainID, orderID, checkoutIntentID, partnerID string) {
	t.Helper()
	ctx := context.Background()
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)
	storeID := "pod-outbox-test-store-" + suffix
	clientID := "pod-outbox-test-client-" + suffix
	captainID = "pod-outbox-test-captain-" + suffix
	partnerID = "pod-outbox-test-partner-" + suffix

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners (id, legal_name_ar, display_name, legal_identity_number, primary_phone)
		VALUES ($1, 'شريك اختبار', 'PoD Outbox Test Partner', $1, '700000000')`,
		partnerID); err != nil {
		t.Fatalf("failed to insert test partner: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'PoD Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		storeID, partnerID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}

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
		VALUES ($1, $2::uuid, $3, 'payment_pending', $4, $5)
		RETURNING id::text`,
		clientID, cartID, storeID, paymentMethod, "wlt-ps-"+suffix,
	).Scan(&checkoutIntentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status)
		VALUES ($1::uuid, $2, $3, 'arrived_customer')
		RETURNING id::text`,
		checkoutIntentID, storeID, clientID,
	).Scan(&orderID); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_assignments (order_id, captain_id, assigned_by, status, response_deadline_at, accepted_at)
		VALUES ($1::uuid, $2, 'operator-test', 'accepted', NOW() + interval '1 hour', NOW())
		RETURNING id::text`,
		orderID, captainID,
	).Scan(&assignmentID); err != nil {
		t.Fatalf("failed to insert test assignment: %v", err)
	}

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_deliveries (assignment_id, order_id, captain_id, status)
		VALUES ($1::uuid, $2::uuid, $3, 'arrived_customer')`,
		assignmentID, orderID, captainID); err != nil {
		t.Fatalf("failed to insert test delivery: %v", err)
	}

	// Cleanup must run child-to-parent: dsh_orders cascades to its
	// assignments/deliveries/items/status-events, but dsh_stores and
	// dsh_partners have no ON DELETE CASCADE from orders/checkout-intents/
	// carts, so deleting the store first would silently fail (leaking rows)
	// unless everything referencing it is gone first.
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_orders WHERE id = $1::uuid`, orderID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, checkoutIntentID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_carts WHERE id = $1::uuid`, cartID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, partnerID)
	})

	return assignmentID, captainID, orderID, checkoutIntentID, partnerID
}

// TestSubmitPoDEnqueuesWltOutboxEventForCodOrderDBIntegration is the
// end-to-end proof for the P0 fix: a captain's proof-of-delivery submission
// for a COD order must durably record a WLT notification, in the same
// transaction as the delivery confirmation, instead of the old fire-and-
// forget goroutine that could silently drop the event if WLT was down.
func TestSubmitPoDEnqueuesWltOutboxEventForCodOrderDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	assignmentID, captainID, orderID, checkoutIntentID, partnerID := seedArrivedCustomerFixture(t, db, "cod")
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID) })

	assignment, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "ref-123"})
	if err != nil {
		t.Fatalf("SubmitPoD failed: %v", err)
	}
	if assignment.OrderID != orderID {
		t.Fatalf("expected assignment order id %s, got %s", orderID, assignment.OrderID)
	}

	var (
		gotCaptainID, gotPartnerID, gotCheckoutIntentID, status string
	)
	err = db.QueryRow(`
		SELECT captain_id, partner_id, checkout_intent_id::text, status
		FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid AND event_type = 'delivery_completed'`,
		orderID,
	).Scan(&gotCaptainID, &gotPartnerID, &gotCheckoutIntentID, &status)
	if err != nil {
		t.Fatalf("expected a wlt outbox row for delivered COD order, query failed: %v", err)
	}
	if gotCaptainID != captainID || gotPartnerID != partnerID || gotCheckoutIntentID != checkoutIntentID {
		t.Fatalf("outbox row identifiers mismatch: got captain=%s partner=%s checkoutIntent=%s, want captain=%s partner=%s checkoutIntent=%s",
			gotCaptainID, gotPartnerID, gotCheckoutIntentID, captainID, partnerID, checkoutIntentID)
	}
	if status != "pending" {
		t.Fatalf("expected outbox row status 'pending' immediately after PoD, got %q", status)
	}
}

// TestSubmitPoDDoesNotEnqueueOutboxForNonCodOrderDBIntegration proves prepaid
// orders (WLT already has the funds via its own payment session) don't get a
// spurious delivery-completed notification.
func TestSubmitPoDDoesNotEnqueueOutboxForNonCodOrderDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	assignmentID, captainID, orderID, _, _ := seedArrivedCustomerFixture(t, db, "wallet")
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID) })

	if _, err := SubmitPoD(db, assignmentID, captainID, PoDInput{Method: "photo", Reference: "ref-456"}); err != nil {
		t.Fatalf("SubmitPoD failed: %v", err)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_wlt_outbox_events WHERE order_id = $1::uuid`, orderID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("expected no outbox row for a non-COD order, found %d", count)
	}
}
