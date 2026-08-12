package payment

import (
	"database/sql"
	"fmt"
	"testing"
	"time"
)

// These tests exercise the wlt-908 deferred conservation trigger directly
// against Postgres. The Go-level ValidatePaymentAllocation check in
// financial_purpose_test.go proves the same invariant in the application
// layer; this proves the database does not trust that layer to have run --
// a write that bypasses Go entirely (a manual fixup, a future caller in
// another language) still cannot persist a non-conserving allocation.

func seedPaymentSessionForAllocationTest(t *testing.T, db *sql.DB, amountMinorUnits int64) string {
	t.Helper()
	checkoutIntentID := fmt.Sprintf("test-checkout-alloc-%d", time.Now().UnixNano())
	var sessionID string
	err := db.QueryRow(`
		INSERT INTO wlt_payment_sessions (operator_context_id, checkout_intent_id, client_id, store_id, payment_method, status, amount_minor_units, currency, financial_purpose)
		VALUES ('OperatorContext-test', $1, 'client-test', 'store-test', 'official_wallet', 'reference_created', $2, 'YER', 'order_payment')
		RETURNING id`, checkoutIntentID, amountMinorUnits).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to seed payment session: %v", err)
	}
	return sessionID
}

func TestAllocationConservation_ConservingSetCommits(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	sessionID := seedPaymentSessionForAllocationTest(t, db, 5000)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if _, err := tx.Exec(`
		INSERT INTO wlt_payment_allocation_components (payment_session_id, operator_context_id, component, amount_minor_units, currency)
		VALUES ($1, 'OperatorContext-dev-001', 'goods_subtotal', 4000, 'YER'),
		       ($1, 'OperatorContext-dev-001', 'delivery_fee', 1000, 'YER')`, sessionID); err != nil {
		t.Fatalf("insert allocation: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("expected conserving allocation to commit, got: %v", err)
	}
}

func TestAllocationConservation_NonConservingSetIsRejectedAtCommit(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	sessionID := seedPaymentSessionForAllocationTest(t, db, 5000)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	// Deliberately short by 1 minor unit. The deferred trigger must catch this
	// at COMMIT even though each individual INSERT succeeds.
	if _, err := tx.Exec(`
		INSERT INTO wlt_payment_allocation_components (payment_session_id, operator_context_id, component, amount_minor_units, currency)
		VALUES ($1, 'OperatorContext-dev-001', 'goods_subtotal', 4000, 'YER'),
		       ($1, 'OperatorContext-dev-001', 'delivery_fee', 999, 'YER')`, sessionID); err != nil {
		t.Fatalf("insert should succeed pre-commit: %v", err)
	}
	if err := tx.Commit(); err == nil {
		t.Fatal("expected commit to fail on a non-conserving allocation, got nil error")
	}
}

func TestAllocationConservation_DuplicateComponentRejected(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	sessionID := seedPaymentSessionForAllocationTest(t, db, 1000)

	// The unique index on (payment_session_id, component) is what makes "the
	// delivery fee is represented exactly once" a database guarantee. This
	// first insert alone also conserves the session total, so it must commit
	// cleanly and let the second insert be the one that fails.
	if _, err := db.Exec(`
		INSERT INTO wlt_payment_allocation_components (payment_session_id, operator_context_id, component, amount_minor_units, currency)
		VALUES ($1, 'OperatorContext-dev-001', 'delivery_fee', 1000, 'YER')`, sessionID); err != nil {
		t.Fatalf("first delivery_fee insert should succeed: %v", err)
	}
	_, err := db.Exec(`
		INSERT INTO wlt_payment_allocation_components (payment_session_id, operator_context_id, component, amount_minor_units, currency)
		VALUES ($1, 'OperatorContext-dev-001', 'delivery_fee', 1000, 'YER')`, sessionID)
	if err == nil {
		t.Fatal("expected a duplicate-component uniqueness violation, got nil")
	}
}

func TestAllocationConservation_MismatchedCurrencyRejected(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	sessionID := seedPaymentSessionForAllocationTest(t, db, 2000)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if _, err := tx.Exec(`
		INSERT INTO wlt_payment_allocation_components (payment_session_id, operator_context_id, component, amount_minor_units, currency)
		VALUES ($1, 'OperatorContext-dev-001', 'goods_subtotal', 2000, 'USD')`, sessionID); err != nil {
		t.Fatalf("insert should succeed pre-commit: %v", err)
	}
	if err := tx.Commit(); err == nil {
		t.Fatal("expected commit to fail on a currency mismatch, got nil error")
	}
}
