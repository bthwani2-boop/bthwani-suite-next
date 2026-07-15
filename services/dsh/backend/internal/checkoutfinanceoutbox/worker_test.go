package checkoutfinanceoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"dsh-api/internal/wlt"
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

func uniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

// seedCheckoutIntentFixture creates the minimal store/checkout-intent chain
// the outbox's foreign key on checkout_intent_id requires, and registers
// cleanup.
func seedCheckoutIntentFixture(t *testing.T, db *sql.DB, paymentSessionID string) (storeID, clientID, intentID string) {
	t.Helper()
	ctx := context.Background()
	storeID = uniqueID("checkout-finance-outbox-store")
	clientID = uniqueID("checkout-finance-outbox-client")

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Checkout Finance Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
		VALUES ($1, gen_random_uuid(), $2, 'payment_pending', 'cod', $3)
		RETURNING id::text`,
		clientID, storeID, paymentSessionID,
	).Scan(&intentID); err != nil {
		t.Fatalf("failed to insert test checkout intent: %v", err)
	}
	return storeID, clientID, intentID
}

func fetchOutboxRow(t *testing.T, db *sql.DB, id string) (status string, attemptCount int, lastError sql.NullString) {
	t.Helper()
	err := db.QueryRow(`
		SELECT status, attempt_count, last_error
		FROM dsh_checkout_financial_closure_outbox WHERE id = $1::uuid`, id,
	).Scan(&status, &attemptCount, &lastError)
	if err != nil {
		t.Fatalf("failed to fetch outbox row %s: %v", id, err)
	}
	return
}

// TestProcessOnceDispatchesExpireSessionDBIntegration proves an enqueued
// expire_session event is claimed, routed to ExpireSession against a fake WLT
// server, and marked 'sent' — the path checkout.CancelIntent relies on to
// close out a dangling WLT payment session.
func TestProcessOnceDispatchesExpireSessionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID)
	})

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{
		EventType:        EventTypeExpireSession,
		CheckoutIntentID: intentID,
		PaymentSessionID: paymentSessionID,
		ClientID:         clientID,
	}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	expectedPath := "/wlt/payment-sessions/" + paymentSessionID + "/expire"
	if gotPath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotPath)
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, attemptCount, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful delivery, got %q", status)
	}
	if attemptCount != 0 {
		t.Fatalf("expected attempt_count to remain 0 after a first-try success, got %d", attemptCount)
	}
}

// TestProcessOnceDispatchesCancelForOrderDBIntegration proves an enqueued
// cancel_for_order event is claimed, routed to CancelSessionForOrder with the
// right body, and marked 'sent'.
func TestProcessOnceDispatchesCancelForOrderDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	var orderID string
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID)
	})

	// dsh_orders.checkout_intent_id is a unique FK; insert a real order row so
	// the outbox's order_id FK (ON DELETE CASCADE) is satisfiable.
	storeID := uniqueID("checkout-finance-outbox-order-store")
	if _, err := db.Exec(`
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Checkout Finance Outbox Order Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert order store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if err := db.QueryRow(`
		INSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, $3, 'cancelled', $4)
		RETURNING id::text`,
		intentID, storeID, clientID, paymentSessionID,
	).Scan(&orderID); err != nil {
		t.Fatalf("failed to insert test order: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_orders WHERE id = $1::uuid`, orderID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{
		EventType:        EventTypeCancelForOrder,
		CheckoutIntentID: intentID,
		PaymentSessionID: paymentSessionID,
		OrderID:          &orderID,
		ClientID:         clientID,
		Reason:           "store rejected order",
	}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var gotPath string
	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	expectedPath := "/wlt/payment-sessions/" + paymentSessionID + "/cancel-for-order"
	if gotPath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotPath)
	}
	if gotBody["orderId"] != orderID {
		t.Fatalf("expected orderId=%q, got %v", orderID, gotBody["orderId"])
	}
	if gotBody["clientId"] != clientID {
		t.Fatalf("expected clientId=%q, got %v", clientID, gotBody["clientId"])
	}
	if gotBody["reason"] != "store rejected order" {
		t.Fatalf("expected reason='store rejected order', got %v", gotBody["reason"])
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, _, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful delivery, got %q", status)
	}
}

// TestProcessOnceMarksFailedWithoutMarkingSentDBIntegration proves a WLT-down
// scenario does not silently drop the event and does not falsely mark it sent.
func TestProcessOnceMarksFailedWithoutMarkingSentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID)
	})

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{
		EventType:        EventTypeExpireSession,
		CheckoutIntentID: intentID,
		PaymentSessionID: paymentSessionID,
		ClientID:         clientID,
	}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce returned an error (it should log per-event failures, not fail the batch): %v", err)
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, attemptCount, lastError := fetchOutboxRow(t, db, id)
	if status != "pending" {
		t.Fatalf("expected event to remain 'pending' (never marked sent) after a failed delivery, got %q", status)
	}
	if attemptCount != 1 {
		t.Fatalf("expected attempt_count 1 after first failure, got %d", attemptCount)
	}
	if !lastError.Valid || lastError.String == "" {
		t.Fatalf("expected last_error to record the failure, got %+v", lastError)
	}
}

// TestEnqueueDeduplicatesOnPaymentSessionAndEventTypeDBIntegration proves the
// UNIQUE (payment_session_id, event_type) constraint makes re-entrant enqueue
// calls (e.g. a retried handler) a no-op rather than a duplicate row.
func TestEnqueueDeduplicatesOnPaymentSessionAndEventTypeDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID)
	})

	for i := 0; i < 2; i++ {
		tx, err := db.Begin()
		if err != nil {
			t.Fatal(err)
		}
		if err := Enqueue(tx, EnqueueInput{
			EventType:        EventTypeExpireSession,
			CheckoutIntentID: intentID,
			PaymentSessionID: paymentSessionID,
			ClientID:         clientID,
		}); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatal(err)
		}
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 row after duplicate enqueue calls, got %d", count)
	}
}
