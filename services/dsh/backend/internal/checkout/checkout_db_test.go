package checkout

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

func uniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

func seedStore(t *testing.T, db *sql.DB) string {
	t.Helper()
	ctx := context.Background()
	storeID := uniqueID("checkout-cancel-test-store")
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Checkout Cancel Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })
	return storeID
}

func TestCancelIntentEnqueuesExpireSessionWhenPaymentSessionExistsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID := seedStore(t, db)
	tenantID := uniqueID("checkout-cancel-test-tenant")
	clientID := uniqueID("checkout-cancel-test-client")
	paymentSessionID := uniqueID("ps")

	intent, err := CreateIntent(db, CreateIntentInput{
		ID:            mustNewIntentID(t, db),
		TenantID:      tenantID,
		ClientID:      clientID,
		CartID:        mustNewCartID(t, db),
		StoreID:       storeID,
		PaymentMethod: MethodWallet,
	})
	if err != nil {
		t.Fatalf("CreateIntent failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intent.ID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, intent.ID)
	})

	if _, err := AttachWltPaymentSession(db, intent.ID, tenantID, clientID, paymentSessionID); err != nil {
		t.Fatalf("AttachWltPaymentSession failed: %v", err)
	}

	cancelled, err := CancelIntent(db, intent.ID, tenantID, clientID)
	if err != nil {
		t.Fatalf("CancelIntent failed: %v", err)
	}
	if cancelled.State != StateCancelled {
		t.Fatalf("expected state cancelled, got %s", cancelled.State)
	}

	var count int
	var eventType string
	if err := db.QueryRow(`
		SELECT COUNT(*), COALESCE(MAX(event_type), '')
		FROM dsh_checkout_financial_closure_outbox
		WHERE checkout_intent_id = $1::uuid`, intent.ID,
	).Scan(&count, &eventType); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 outbox event, got %d", count)
	}
	if eventType != "expire_session" {
		t.Fatalf("expected event_type=expire_session, got %q", eventType)
	}
}

func TestCancelIntentEnqueuesNothingWithoutPaymentSessionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID := seedStore(t, db)
	tenantID := uniqueID("checkout-cancel-test-tenant")
	clientID := uniqueID("checkout-cancel-test-client")

	intent, err := CreateIntent(db, CreateIntentInput{
		ID:            mustNewIntentID(t, db),
		TenantID:      tenantID,
		ClientID:      clientID,
		CartID:        mustNewCartID(t, db),
		StoreID:       storeID,
		PaymentMethod: MethodCOD,
	})
	if err != nil {
		t.Fatalf("CreateIntent failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intent.ID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, intent.ID)
	})

	cancelled, err := CancelIntent(db, intent.ID, tenantID, clientID)
	if err != nil {
		t.Fatalf("CancelIntent failed: %v", err)
	}
	if cancelled.State != StateCancelled {
		t.Fatalf("expected state cancelled, got %s", cancelled.State)
	}

	var count int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM dsh_checkout_financial_closure_outbox
		WHERE checkout_intent_id = $1::uuid`, intent.ID,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("expected no outbox event when no payment session was attached, got %d", count)
	}
}

func mustNewIntentID(t *testing.T, db *sql.DB) string {
	t.Helper()
	id, err := NewIntentID(db)
	if err != nil {
		t.Fatalf("NewIntentID failed: %v", err)
	}
	return id
}

func mustNewCartID(t *testing.T, db *sql.DB) string {
	t.Helper()
	var id string
	if err := db.QueryRow(`SELECT gen_random_uuid()::text`).Scan(&id); err != nil {
		t.Fatalf("failed to generate cart id: %v", err)
	}
	return id
}
