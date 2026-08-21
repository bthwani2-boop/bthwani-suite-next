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
		VALUES ($1, $1, 'Checkout Cancel Test Store', 'published', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })
	return storeID
}

func TestCancelIntentEnqueuesExpireSessionWhenPaymentSessionExistsDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID := seedStore(t, db)
	operatorContextID := uniqueID("checkout-cancel-test-OperatorContext")
	clientID := uniqueID("checkout-cancel-test-client")
	paymentSessionID := uniqueID("ps")

	intent, err := CreateIntent(db, CreateIntentInput{
		ID:                mustNewIntentID(t, db),
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		CartID:            mustNewCartID(t, db),
		StoreID:           storeID,
		PaymentMethod:     MethodWallet,
	})
	if err != nil {
		t.Fatalf("CreateIntent failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intent.ID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, intent.ID)
	})
	if _, err := db.Exec(`UPDATE dsh_checkout_intents SET state='ready' WHERE id=$1::uuid`, intent.ID); err != nil {
		t.Fatalf("failed to make checkout intent handoff-ready: %v", err)
	}

	if _, err := AttachWltPaymentSession(db, intent.ID, operatorContextID, clientID, paymentSessionID); err != nil {
		t.Fatalf("AttachWltPaymentSession failed: %v", err)
	}

	cancelled, err := CancelIntent(db, intent.ID, operatorContextID, clientID)
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
	operatorContextID := uniqueID("checkout-cancel-test-OperatorContext")
	clientID := uniqueID("checkout-cancel-test-client")

	intent, err := CreateIntent(db, CreateIntentInput{
		ID:                mustNewIntentID(t, db),
		OperatorContextID: operatorContextID,
		ClientID:          clientID,
		CartID:            mustNewCartID(t, db),
		StoreID:           storeID,
		PaymentMethod:     MethodCOD,
	})
	if err != nil {
		t.Fatalf("CreateIntent failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE checkout_intent_id = $1::uuid`, intent.ID)
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id = $1::uuid`, intent.ID)
	})

	cancelled, err := CancelIntent(db, intent.ID, operatorContextID, clientID)
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

func TestRefreshAndValidateIntentPersistCanonicalDependencyStateDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID := seedStore(t, db)
	operatorContextID := uniqueID("checkout-validation-OperatorContext")
	clientID := uniqueID("checkout-validation-client")
	cartID := mustNewCartID(t, db)
	addressID := uniqueID("checkout-validation-address")
	if _, err := db.Exec(`INSERT INTO dsh_client_addresses (id,client_id,label,recipient_name,phone_e164,address_line,service_area_code,latitude,longitude,create_idempotency_key) VALUES ($1,$2,'home','Checkout Client','+967770000001','Validation Address','haddah',15.34,44.19,$3)`, addressID, clientID, uniqueID("checkout-validation-address-key")); err != nil {
		t.Fatalf("insert validation address: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO dsh_carts (id,client_id,store_id,fulfillment_mode,state) VALUES ($1::uuid,$2,$3,'bthwani_delivery','active')`, cartID, clientID, storeID); err != nil {
		t.Fatalf("insert validation cart: %v", err)
	}
	intent, err := CreateIntent(db, CreateIntentInput{
		ID: mustNewIntentID(t, db), OperatorContextID: operatorContextID, ClientID: clientID,
		CartID: cartID, StoreID: storeID, FulfillmentMode: ModeBthwaniDelivery, PaymentMethod: MethodCOD,
	})
	if err != nil {
		t.Fatalf("create validation intent: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_intents WHERE id=$1::uuid`, intent.ID)
		_, _ = db.Exec(`DELETE FROM dsh_carts WHERE id=$1::uuid`, cartID)
		_, _ = db.Exec(`DELETE FROM dsh_client_addresses WHERE id=$1`, addressID)
	})

	blocked, err := RefreshIntent(db, RefreshIntentInput{
		IntentID: intent.ID, OperatorContextID: operatorContextID, ClientID: clientID,
		AddressID: addressID, AddressSnapshot: `{"id":"` + addressID + `","serviceAreaCode":"haddah"}`,
		Mode: ModeBthwaniDelivery, Dependencies: IntentDependencyValidation{CartCode: "CART_EMPTY", ServiceabilityCode: "STORE_PAUSED"},
	})
	if err != nil {
		t.Fatalf("refresh blocked intent: %v", err)
	}
	if blocked.State != StateBlocked || blocked.DeliveryAddress != `{"id":"`+addressID+`","serviceAreaCode":"haddah"}` || blocked.Version != 2 || blocked.PreviewHash == "" {
		t.Fatalf("unexpected blocked refresh readback: %+v", blocked)
	}
	if len(blocked.ValidationIssues) != 2 || blocked.ValidationIssues[0].Code != "CART_EMPTY" || blocked.ValidationIssues[1].Code != "STORE_PAUSED" {
		t.Fatalf("blocked dependency issues drifted: %#v", blocked.ValidationIssues)
	}

	ready, err := ValidateIntent(db, intent.ID, operatorContextID, clientID, IntentDependencyValidation{CartReady: true, Serviceable: true})
	if err != nil {
		t.Fatalf("validate ready intent: %v", err)
	}
	if ready.State != StateReady || len(ready.ValidationIssues) != 0 || ready.Version != 3 {
		t.Fatalf("unexpected ready validation readback: %+v", ready)
	}
	unchanged, err := ValidateIntent(db, intent.ID, operatorContextID, clientID, IntentDependencyValidation{CartReady: true, Serviceable: true})
	if err != nil {
		t.Fatalf("repeat ready validation: %v", err)
	}
	if unchanged.Version != ready.Version {
		t.Fatalf("idempotent ready validation changed version: before=%d after=%d", ready.Version, unchanged.Version)
	}

	if _, err := db.Exec(`UPDATE dsh_checkout_intents SET state='confirmed' WHERE id=$1::uuid`, intent.ID); err != nil {
		t.Fatalf("set terminal intent state: %v", err)
	}
	terminal, err := ValidateIntent(db, intent.ID, operatorContextID, clientID, IntentDependencyValidation{})
	if err != nil {
		t.Fatalf("validate terminal intent: %v", err)
	}
	if terminal.State != StateConfirmed || terminal.Version != unchanged.Version {
		t.Fatalf("terminal intent was mutated by validation: %+v", terminal)
	}
}
