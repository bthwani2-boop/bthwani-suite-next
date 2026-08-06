package reconciliation

// Note: these tests exercise the per-row operator_context_id scoping guards
// inside a single WLT deployment (WHERE operator_context_id=$1 filters and
// RequireOperatorContextScope checks). They do not exercise or assert
// network-level multi-tenant isolation -- the DSH service bridge binds every
// request to one fixed deployment-owned context (see
// internal/shared/serviceauth.go). See governance decision Q1/T4.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
)

func reconciliationTestDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := strings.TrimSpace(os.Getenv("WLT_TEST_DATABASE_URL"))
	if databaseURL == "" {
		databaseURL = strings.TrimSpace(os.Getenv("DATABASE_URL"))
	}
	if databaseURL == "" {
		t.Skip("WLT test database is not configured")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open WLT test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		t.Fatalf("ping WLT test database: %v", err)
	}
	return db
}

func seedOperatorContextReconciliationCase(t *testing.T, db *sql.DB, operatorContextID, suffix string) string {
	t.Helper()
	checkoutIntentID := "reconciliation-checkout-" + suffix
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		OperatorContextID:         operatorContextID,
		ClientID:         "client-" + suffix,
		StoreID:          "store-" + suffix,
		PaymentMethod:    "wallet",
		AmountMinorUnits: 1000,
		Currency:         "YER",
		CartSnapshotHash: "snapshot-" + suffix,
		IdempotencyKey:   "session-idempotency-" + suffix,
		CorrelationID:    "session-correlation-" + suffix,
	})
	if err != nil {
		t.Fatalf("create payment session for %s: %v", operatorContextID, err)
	}
	var caseID string
	if err := db.QueryRow(`INSERT INTO wlt_reconciliation_cases
		(operator_context_id,payment_session_id,operation,trigger_reason,status)
		VALUES ($1,$2,'capture','provider_result_unknown','open')
		RETURNING id`, operatorContextID, session.ID).Scan(&caseID); err != nil {
		t.Fatalf("create reconciliation case for %s: %v", operatorContextID, err)
	}
	return caseID
}

func TestPaymentReconciliationIsOperatorContextLocal(t *testing.T) {
	db := reconciliationTestDB(t)
	defer db.Close()

	suffix := fmt.Sprint(time.Now().UnixNano())
	OperatorContextA := "OperatorContext-reconciliation-a-" + suffix
	OperatorContextB := "OperatorContext-reconciliation-b-" + suffix
	caseA := seedOperatorContextReconciliationCase(t, db, OperatorContextA, "a-"+suffix)
	caseB := seedOperatorContextReconciliationCase(t, db, OperatorContextB, "b-"+suffix)

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_reconciliation_cases WHERE operator_context_id IN ($1,$2)`, OperatorContextA, OperatorContextB)
		_, _ = db.Exec(`DELETE FROM wlt_payment_sessions WHERE operator_context_id IN ($1,$2)`, OperatorContextA, OperatorContextB)
	})

	ctxA := shared.WithOperatorContext(context.Background(), OperatorContextA)
	cases, err := ListCasesForOperatorContext(ctxA, db, "open")
	if err != nil {
		t.Fatalf("list OperatorContext A cases: %v", err)
	}
	seenA := false
	for _, item := range cases {
		if item.ID == caseB {
			t.Fatalf("OperatorContext A list leaked OperatorContext B reconciliation case")
		}
		if item.ID == caseA {
			seenA = true
		}
	}
	if !seenA {
		t.Fatalf("OperatorContext A case was not returned")
	}

	foreign, err := GetCaseForOperatorContext(ctxA, db, caseB)
	if err != nil {
		t.Fatalf("cross-OperatorContext get should be indistinguishable from not found: %v", err)
	}
	if foreign != nil {
		t.Fatalf("OperatorContext A read OperatorContext B reconciliation case: %+v", foreign)
	}

	assigned, err := AssignCaseForOperatorContext(ctxA, db, caseB, "operator-a")
	if err != nil {
		t.Fatalf("cross-OperatorContext assign should be indistinguishable from not found: %v", err)
	}
	if assigned != nil {
		t.Fatalf("OperatorContext A assigned OperatorContext B reconciliation case: %+v", assigned)
	}

	assigned, err = AssignCaseForOperatorContext(ctxA, db, caseA, "operator-a")
	if err != nil {
		t.Fatalf("assign OperatorContext A case: %v", err)
	}
	if assigned == nil || assigned.AssignedToOperatorID != "operator-a" {
		t.Fatalf("OperatorContext A assignment was not persisted: %+v", assigned)
	}
}
