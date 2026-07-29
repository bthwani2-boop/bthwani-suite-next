package cod

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func insertLegacyCodRecord(t *testing.T, db *sql.DB) string {
	t.Helper()
	orderID := fmt.Sprintf("test-order-%d", time.Now().UnixNano())
	var id string
	err := db.QueryRow(`
		INSERT INTO wlt_cod_records
			(tenant_id, order_id, captain_id, collector_type, collector_id,
			 partner_id, amount_minor_units, currency)
		VALUES ('legacy-unscoped', $1, 'captain-test', 'captain',
			'captain-test', 'partner-test', 1000, 'YER')
		RETURNING id`, orderID).Scan(&id)
	if err != nil {
		t.Fatalf("failed to insert deferred legacy COD record: %v", err)
	}
	return id
}

func TestLegacyCodRemitBeforeCollectConflicts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	id := insertLegacyCodRecord(t, db)
	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict remitting an uncollected record, got %v", err)
	}
}

func TestLegacyCodCollectTwiceConflicts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	id := insertLegacyCodRecord(t, db)
	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("first collect should succeed: %v", err)
	}
	if _, err := MarkCodCollected(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate collect, got %v", err)
	}
}

func TestLegacyCodRemitTwiceConflicts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	id := insertLegacyCodRecord(t, db)
	if _, err := MarkCodCollected(db, id); err != nil {
		t.Fatalf("collect should succeed: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != nil {
		t.Fatalf("first remit should succeed: %v", err)
	}
	if _, err := MarkCodRemitted(db, id); err != ErrCodStateConflict {
		t.Fatalf("expected ErrCodStateConflict on duplicate remit, got %v", err)
	}
}

func TestCreateCodRecordUsesTenantLocalWltSessionAndCollectorIdentity(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	operatorContextID := fmt.Sprintf("tenant-cod-test-%d", time.Now().UnixNano())
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	checkoutIntentID := fmt.Sprintf("checkout-cod-%d", time.Now().UnixNano())
	orderID := fmt.Sprintf("order-cod-%d", time.Now().UnixNano())
	if _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		OperatorContextID:         operatorContextID,
		ClientID:         "client-cod-test",
		StoreID:          "store-cod-test",
		PaymentMethod:    "cod",
		AmountMinorUnits: 432100,
		Currency:         "YER",
		CartSnapshotHash: "cod-custody-test-snapshot",
		IdempotencyKey:   "cod-session-" + checkoutIntentID,
		CorrelationID:    "cod-session-" + checkoutIntentID,
	}); err != nil {
		t.Fatalf("create governed COD payment session: %v", err)
	}
	input := CreateCodRecordInput{
		OrderID: orderID, CollectorType: "store_courier",
		CollectorID: "courier-cod-test", PartnerID: "partner-cod-test",
		CheckoutIntentID: checkoutIntentID,
	}
	first, err := CreateCodRecordForTenant(ctx, db, input)
	if err != nil {
		t.Fatalf("create COD custody: %v", err)
	}
	second, err := CreateCodRecordForTenant(ctx, db, input)
	if err != nil {
		t.Fatalf("replay COD custody: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected idempotent replay, got %s and %s", first.ID, second.ID)
	}
	if first.AmountMinorUnits != 432100 || first.Currency != "YER" {
		t.Fatalf("WLT session truth not used: %+v", first)
	}
	if first.CollectorType != "store_courier" || first.CollectorID != "courier-cod-test" || first.CaptainID != "" {
		t.Fatalf("collector identity mismatch: %+v", first)
	}
}

func TestCreateCodRecordRejectsNonCodTenantSession(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	operatorContextID := fmt.Sprintf("tenant-wallet-test-%d", time.Now().UnixNano())
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	checkoutIntentID := fmt.Sprintf("checkout-wallet-%d", time.Now().UnixNano())
	if _, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		OperatorContextID:         operatorContextID,
		ClientID:         "client-wallet-test",
		StoreID:          "store-wallet-test",
		PaymentMethod:    "wallet",
		AmountMinorUnits: 1000,
		Currency:         "YER",
		CartSnapshotHash: "wallet-custody-test-snapshot",
		IdempotencyKey:   "wallet-session-" + checkoutIntentID,
		CorrelationID:    "wallet-session-" + checkoutIntentID,
	}); err != nil {
		t.Fatalf("create governed wallet payment session: %v", err)
	}
	_, err := CreateCodRecordForTenant(ctx, db, CreateCodRecordInput{
		OrderID: fmt.Sprintf("order-wallet-%d", time.Now().UnixNano()),
		CollectorType: "captain", CollectorID: "captain-wallet-test",
		PartnerID: "partner-wallet-test", CheckoutIntentID: checkoutIntentID,
	})
	if err == nil {
		t.Fatal("expected non-COD payment session to be rejected")
	}
}
