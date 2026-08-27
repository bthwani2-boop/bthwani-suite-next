package checkoutfinanceoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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
	operatorContextID := uniqueID("OperatorContext-checkout-finance-outbox")
	storeID = uniqueID("checkout-finance-outbox-store")
	clientID = uniqueID("checkout-finance-outbox-client")

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Checkout Finance Outbox Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents (operator_context_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id, subtotal_minor_units, delivery_fee_minor_units, discount_minor_units, total_minor_units, currency, pricing_snapshot_hash)
		VALUES ($1, $2, gen_random_uuid(), $3, 'confirming', 'cod', $4,
		        1000, 0, 0, 1000, 'YER', repeat('e', 64))
		RETURNING id::text`,
		operatorContextID, clientID, storeID, paymentSessionID,
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

	var gotExpirePath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			gotExpirePath = r.URL.Path
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"paymentSession":{"id":"` + paymentSessionID + `","status":"expired","reference":"` + paymentSessionID + `","createdAt":"2026-08-26T00:00:00Z","updatedAt":"2026-08-26T00:00:00Z"}}`))
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	expectedPath := "/wlt/payment-sessions/" + paymentSessionID + "/expire"
	if gotExpirePath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotExpirePath)
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
		VALUES ($1, $1, 'Checkout Finance Outbox Order Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert order store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if err := db.QueryRow(`
		INSERT INTO dsh_orders (operator_context_id, checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
		SELECT operator_context_id, $1::uuid, $2, $3, 'cancelled_by_operator', $4
		FROM dsh_checkout_intents
		WHERE id = $1::uuid
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"action":"refund_requested","refund":{"id":"refund-outbox-test"}}`))
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	expectedPath := "/wlt/order-cancellations"
	if gotPath != expectedPath {
		t.Fatalf("expected path %q, got %q", expectedPath, gotPath)
	}
	if gotBody["paymentSessionId"] != paymentSessionID {
		t.Fatalf("expected paymentSessionId=%q, got %v", paymentSessionID, gotBody["paymentSessionId"])
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
	var projectedStatus, projectedReference string
	if err := db.QueryRow(`
		SELECT financial_closure_status, COALESCE(financial_closure_reference, '')
		FROM dsh_orders WHERE id=$1::uuid`, orderID,
	).Scan(&projectedStatus, &projectedReference); err != nil {
		t.Fatal(err)
	}
	if projectedStatus != "refund_requested" || projectedReference != "refund-outbox-test" {
		t.Fatalf("unexpected financial projection: status=%q reference=%q", projectedStatus, projectedReference)
	}
}

// TestProcessOnceDispatchesCodReservationReleaseDBIntegration proves that a
// dispatch-state transition can durably release the WLT COD reservation even
// when the original request is no longer in the handler call stack.
func TestProcessOnceDispatchesCodReservationReleaseDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	storeID, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	var orderID string
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID)
	})

	if err := db.QueryRow(`
		INSERT INTO dsh_orders (operator_context_id, checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
		SELECT operator_context_id, $1::uuid, $2, $3, 'cancelled_by_operator', $4
		FROM dsh_checkout_intents
		WHERE id = $1::uuid
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
	if err := EnqueueCodReservationReleaseForOrderTx(tx, orderID, "assignment_declined", "cod-release-test-correlation"); err != nil {
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"codReservation":{"id":"cod-release-test","orderId":"` + orderID + `","status":"released","amountMinorUnits":1000,"currency":"YER","captainId":"captain-test"}}`))
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	if expected := "/wlt/cod-reservations/release"; gotPath != expected {
		t.Fatalf("expected path %q, got %q", expected, gotPath)
	}
	if gotBody["orderId"] != orderID || gotBody["reason"] != "assignment_declined" {
		t.Fatalf("unexpected release request body: %#v", gotBody)
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intentID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, _, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful COD release, got %q", status)
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
	if status != "unknown" {
		t.Fatalf("expected event to enter 'unknown' before canonical readback after a failed delivery, got %q", status)
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

func TestClaimBatchFencesDuplicateWorkersAndExpiredLeasesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id=$1::uuid`, intentID)
	})

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{EventType: EventTypeExpireSession, CheckoutIntentID: intentID, PaymentSessionID: paymentSessionID, ClientID: clientID}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	first, err := ClaimBatch(db, 1, time.Minute)
	if err != nil || len(first) != 1 {
		t.Fatalf("first claim=%+v err=%v", first, err)
	}
	second, err := ClaimBatch(db, 1, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if len(second) != 0 {
		t.Fatalf("duplicate worker claimed active lease: %+v", second)
	}
	if _, err := db.Exec(`UPDATE dsh_checkout_financial_closure_outbox SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1::uuid`, first[0].ID); err != nil {
		t.Fatal(err)
	}
	reclaimed, err := ClaimBatch(db, 1, time.Minute)
	if err != nil || len(reclaimed) != 1 {
		t.Fatalf("expired lease reclaim=%+v err=%v", reclaimed, err)
	}
	if reclaimed[0].LeaseToken == first[0].LeaseToken {
		t.Fatal("expired lease reclaim must issue a new fencing token")
	}

	if err := MarkSentWithResult(db, first[0].ID, first[0].LeaseToken, DeliveryResult{Action: "expired", PaymentSessionID: paymentSessionID}); err != nil {
		t.Fatal(err)
	}
	status, _, _ := fetchOutboxRow(t, db, first[0].ID)
	if status != "processing" {
		t.Fatalf("stale worker changed reclaimed row to %q", status)
	}
	if err := MarkSentWithResult(db, reclaimed[0].ID, reclaimed[0].LeaseToken, DeliveryResult{Action: "expired", PaymentSessionID: paymentSessionID}); err != nil {
		t.Fatal(err)
	}
	status, _, _ = fetchOutboxRow(t, db, first[0].ID)
	if status != "sent" {
		t.Fatalf("current lease owner did not close row, got %q", status)
	}
}

func TestUnknownOutcomeRequiresReadbackBeforeRetryDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id=$1::uuid`, intentID)
	})

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{EventType: EventTypeExpireSession, CheckoutIntentID: intentID, PaymentSessionID: paymentSessionID, ClientID: clientID}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var expireCalls, readbackCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			expireCalls++
			if expireCalls == 1 {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			return
		}
		readbackCalls++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		status := "reference_created"
		if readbackCalls > 1 {
			status = "expired"
		}
		_, _ = w.Write([]byte(`{"paymentSession":{"id":"` + paymentSessionID + `","status":"` + status + `"}}`))
	}))
	defer server.Close()
	client := wlt.NewClient(server.URL, "test-service-token")

	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatal(err)
	}
	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id=$1::uuid`, intentID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, _, _ := fetchOutboxRow(t, db, id)
	if status != "unknown" {
		t.Fatalf("unknown mutation outcome entered %q", status)
	}
	if _, err := db.Exec(`UPDATE dsh_checkout_financial_closure_outbox SET next_retry_at=NOW() WHERE id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatal(err)
	}
	status, _, _ = fetchOutboxRow(t, db, id)
	if status != "pending" || expireCalls != 1 {
		t.Fatalf("readback-absent path blindly delivered: status=%q expireCalls=%d", status, expireCalls)
	}
	if _, err := db.Exec(`UPDATE dsh_checkout_financial_closure_outbox SET next_retry_at=NOW() WHERE id=$1::uuid`, id); err != nil {
		t.Fatal(err)
	}
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatal(err)
	}
	status, _, _ = fetchOutboxRow(t, db, id)
	if status != "sent" || expireCalls != 2 || readbackCalls != 2 {
		t.Fatalf("safe retry did not complete: status=%q expireCalls=%d readbackCalls=%d", status, expireCalls, readbackCalls)
	}
}

func TestManualRetryResetsDeliveryBudgetDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	paymentSessionID := uniqueID("ps")
	_, clientID, intentID := seedCheckoutIntentFixture(t, db, paymentSessionID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id=$1::uuid`, intentID)
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

	claimed, err := ClaimBatch(db, 1, time.Minute)
	if err != nil || len(claimed) != 1 {
		t.Fatalf("claim=%+v err=%v", claimed, err)
	}
	event := claimed[0]
	event.AttemptCount = MaxDeliveryAttempts - 1
	if _, err := db.Exec(`UPDATE dsh_checkout_financial_closure_outbox SET attempt_count=$2 WHERE id=$1::uuid`, event.ID, event.AttemptCount); err != nil {
		t.Fatal(err)
	}
	if err := MarkDeliveryFailure(db, event, errors.New("WLT unavailable")); err != nil {
		t.Fatal(err)
	}
	if err := RetryFailed(db, event.ID, "operator restarted after provider outage"); err != nil {
		t.Fatal(err)
	}

	var status, disposition, diagnostic string
	var attempts, readbacks int
	if err := db.QueryRow(`
		SELECT status, attempt_count, readback_attempt_count, failure_disposition, diagnostic_code
		FROM dsh_checkout_financial_closure_outbox WHERE id=$1::uuid`, event.ID,
	).Scan(&status, &attempts, &readbacks, &disposition, &diagnostic); err != nil {
		t.Fatal(err)
	}
	if status != "pending" || attempts != 0 || readbacks != 0 || disposition != "retry_scheduled" || diagnostic != "manual_retry_requested" {
		t.Fatalf("manual retry did not start a fresh delivery budget: status=%q attempts=%d readbacks=%d disposition=%q diagnostic=%q", status, attempts, readbacks, disposition, diagnostic)
	}
}
