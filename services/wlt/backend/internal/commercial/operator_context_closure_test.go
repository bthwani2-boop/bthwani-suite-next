package commercial

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"wlt-api/internal/shared"
)

func TestCommercialMutationsAndReadsFailClosedWithoutOperatorContext(t *testing.T) {
	ctx := context.Background()
	if _, err := AppendLoyaltyEntry(ctx, nil, AppendLoyaltyEntryInput{
		ClientID: "client", Direction: "earn", Points: 1,
		SourceType: "test", SourceID: "test", IdempotencyKey: "test",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("AppendLoyaltyEntry error = %v, want ErrInvalid", err)
	}
	if _, err := AppendLoyaltyEntryGoverned(ctx, nil, AppendLoyaltyEntryInput{
		ClientID: "client", Direction: "earn", Points: 1,
		SourceType: "test", SourceID: "test", IdempotencyKey: "test",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("AppendLoyaltyEntryGoverned error = %v, want ErrInvalid", err)
	}
	if _, err := ActivateSubscriptionLifecycleGoverned(ctx, nil, ActivateSubscriptionLifecycleInput{
		ClientID: "client", ProductReference: "product", PaymentSessionID: "payment", SubscriptionPurchaseID: "purchase",
	}, "idempotency", "correlation"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ActivateSubscriptionLifecycleGoverned error = %v, want ErrInvalid", err)
	}
	if _, err := CreateSubscriptionPaymentSession(ctx, nil, CreateSubscriptionPaymentSessionInput{
		SubscriptionPurchaseID: "purchase", ProductReference: "product", ClientID: "client", PaymentMethod: "card",
	}, "idempotency", "correlation"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("CreateSubscriptionPaymentSession error = %v, want ErrInvalid", err)
	}
	if _, err := GetSummary(ctx, nil); !errors.Is(err, ErrInvalid) {
		t.Fatalf("GetSummary error = %v, want ErrInvalid", err)
	}
}

func commercialTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("open commercial test db: %v", err)
		}
		t.Skipf("skipping commercial DB test: %v", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		if requireDB {
			t.Fatalf("ping commercial test db: %v", err)
		}
		t.Skipf("skipping commercial DB test: %v", err)
	}
	return db
}

func TestLoyaltyIdentityAndIdempotencyAreTenantLocalInDB(t *testing.T) {
	db := commercialTestDB(t)
	defer db.Close()
	clientID := fmt.Sprintf("objective3-client-%d", time.Now().UnixNano())
	idempotencyKey := fmt.Sprintf("objective3-idempotency-%d", time.Now().UnixNano())
	for _, operatorContextID := range []string{"objective3-tenant-a", "objective3-tenant-b"} {
		ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
		entry, err := AppendLoyaltyEntry(ctx, db, AppendLoyaltyEntryInput{
			ClientID: clientID, Direction: "earn", Points: 7,
			SourceType: "objective3", SourceID: clientID,
			IdempotencyKey: idempotencyKey, CorrelationID: operatorContextID,
		})
		if err != nil {
			t.Fatalf("append entry for %s: %v", operatorContextID, err)
		}
		if entry.OperatorContextID != operatorContextID {
			t.Fatalf("entry context=%q, want %q", entry.OperatorContextID, operatorContextID)
		}
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_loyalty_entries WHERE client_id=$1 AND idempotency_key=$2 AND operator_context_id IN ('objective3-tenant-a','objective3-tenant-b')`, clientID, idempotencyKey).Scan(&count); err != nil {
		t.Fatalf("count tenant-local entries: %v", err)
	}
	if count != 2 {
		t.Fatalf("tenant-local entry count=%d, want 2", count)
	}
	rows, err := db.Query(`SELECT operator_context_id, points_balance FROM wlt_loyalty_accounts WHERE client_id=$1 AND operator_context_id IN ('objective3-tenant-a','objective3-tenant-b') ORDER BY operator_context_id`, clientID)
	if err != nil {
		t.Fatalf("read tenant-local accounts: %v", err)
	}
	defer rows.Close()
	seen := 0
	for rows.Next() {
		var operatorContextID string
		var balance int64
		if err := rows.Scan(&operatorContextID, &balance); err != nil {
			t.Fatalf("scan account: %v", err)
		}
		seen++
		if balance != 7 {
			t.Fatalf("account %s balance=%d, want 7", operatorContextID, balance)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("read accounts: %v", err)
	}
	if seen != 2 {
		t.Fatalf("tenant-local account count=%d, want 2", seen)
	}
}
