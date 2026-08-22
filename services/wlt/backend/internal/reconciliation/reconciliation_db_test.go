package reconciliation

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

const reconciliationTestOperatorContext = "OperatorContext-reconciliation-tests"

func getTestDB(t *testing.T) *sql.DB {
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
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func reconciliationTestContext() context.Context {
	return shared.WithOperatorContext(context.Background(), reconciliationTestOperatorContext)
}

func insertTestCase(t *testing.T, db *sql.DB) string {
	t.Helper()
	checkoutIntentID := fmt.Sprintf("test-checkout-recon-%d", time.Now().UnixNano())
	sessionID, err := testsupport.SeedCanonicalCheckoutPaymentSession(context.Background(), db, testsupport.CheckoutPaymentSession{
		OperatorContextID: reconciliationTestOperatorContext,
		CheckoutIntentID:  checkoutIntentID,
		ClientID:          "client-test",
		StoreID:           "store-test",
		PaymentMethod:     "wallet",
		Status:            "provider_result_unknown",
		AmountMinorUnits:  1000,
		Currency:          "YER",
		FinancialPurpose:  "order_payment",
	})
	if err != nil {
		t.Fatalf("seed canonical payment session: %v", err)
	}
	var caseID string
	err = db.QueryRow(`
		INSERT INTO wlt_reconciliation_cases (operator_context_id, payment_session_id, operation, trigger_reason)
		VALUES ($1, $2, 'authorize', 'test timeout')
		RETURNING id`, reconciliationTestOperatorContext, sessionID).Scan(&caseID)
	if err != nil {
		t.Fatalf("failed to insert test reconciliation case: %v", err)
	}
	return caseID
}

func TestAssignThenResolveCase_Succeeds(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := reconciliationTestContext()

	caseID := insertTestCase(t, db)

	assigned, err := AssignCaseForOperatorContext(ctx, db, caseID, "operator-alice")
	if err != nil {
		t.Fatalf("assign failed: %v", err)
	}
	if assigned.AssignedToOperatorID != "operator-alice" {
		t.Fatalf("expected assignedToOperatorId 'operator-alice', got %q", assigned.AssignedToOperatorID)
	}
	if assigned.Status != "open" {
		t.Fatalf("expected status to remain 'open' after assign, got %q", assigned.Status)
	}

	resolved, err := ResolveCaseForOperatorContext(ctx, db, caseID, "operator-alice", "confirmed_success", "confirmed with provider dashboard")
	if err != nil {
		t.Fatalf("resolve failed: %v", err)
	}
	if resolved.Status != "resolved" {
		t.Fatalf("expected status 'resolved', got %q", resolved.Status)
	}
	if resolved.ResolvedByOperatorID != "operator-alice" {
		t.Fatalf("expected resolvedByOperatorId 'operator-alice', got %q", resolved.ResolvedByOperatorID)
	}
	if resolved.ResolutionAction != "confirmed_success" {
		t.Fatalf("expected resolutionAction 'confirmed_success', got %q", resolved.ResolutionAction)
	}
}

func TestResolveCase_AlreadyResolved_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := reconciliationTestContext()

	caseID := insertTestCase(t, db)
	if _, err := ResolveCaseForOperatorContext(ctx, db, caseID, "operator-alice", "confirmed_failed", "provider confirmed decline"); err != nil {
		t.Fatalf("first resolve should succeed, got error: %v", err)
	}
	if _, err := ResolveCaseForOperatorContext(ctx, db, caseID, "operator-bob", "confirmed_success", "trying to override"); err != ErrCaseNotOpen {
		t.Fatalf("expected ErrCaseNotOpen on double-resolve, got %v", err)
	}
}

func TestResolveCase_InvalidResolutionAction_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := reconciliationTestContext()

	caseID := insertTestCase(t, db)
	if _, err := ResolveCaseForOperatorContext(ctx, db, caseID, "operator-alice", "not_a_real_action", ""); err == nil {
		t.Fatalf("expected an error for an invalid resolutionAction")
	}
}

func TestListCases_FilterByOpenStatus(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	ctx := reconciliationTestContext()

	caseID := insertTestCase(t, db)
	cases, err := ListCasesForOperatorContext(ctx, db, "open")
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	found := false
	for _, c := range cases {
		if c.ID == caseID {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected newly created open case %q to appear in open-status list", caseID)
	}
}
