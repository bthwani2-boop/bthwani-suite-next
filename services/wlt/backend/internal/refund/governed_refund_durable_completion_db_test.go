package refund

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/provider"
)

func TestGovernedRefundRuntimeDurableCompletionSurfacesOutcomePersistenceFailure(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 1800, "YER")
	orderID := fmt.Sprintf("persistence-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 500, "persistence-failure")

	_, err := db.Exec(`
		CREATE OR REPLACE FUNCTION test_block_refund_outcome()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
			IF OLD.status = 'processing' AND NEW.status IN ('provider_unknown','rejected') THEN
				RAISE EXCEPTION 'simulated outcome persistence failure';
			END IF;
			RETURN NEW;
		END;
		$$;
		DROP TRIGGER IF EXISTS trg_test_block_refund_outcome ON wlt_refunds;
		CREATE TRIGGER trg_test_block_refund_outcome
		BEFORE UPDATE OF status ON wlt_refunds
		FOR EACH ROW
		EXECUTE FUNCTION test_block_refund_outcome();`)
	if err != nil {
		t.Fatalf("install outcome persistence failure trigger: %v", err)
	}
	defer func() {
		_, cleanupErr := db.Exec(`
			DROP TRIGGER IF EXISTS trg_test_block_refund_outcome ON wlt_refunds;
			DROP FUNCTION IF EXISTS test_block_refund_outcome();`)
		if cleanupErr != nil {
			t.Errorf("cleanup outcome persistence failure trigger: %v", cleanupErr)
		}
	}()

	stub := &governedRuntimeProvider{err: errors.New("simulated provider transport timeout")}
	_, err = CompleteGovernedRefundWithProviderDurable(
		context.Background(),
		db,
		stub,
		approved.ID,
		"executor-persistence-failure",
		"corr-persistence-failure",
	)
	if !errors.Is(err, ErrRefundOutcomePersistence) {
		t.Fatalf("expected explicit ErrRefundOutcomePersistence, got %v", err)
	}
	if stub.calls != 1 {
		t.Fatalf("persistence retry must not call the provider again, got %d calls", stub.calls)
	}
	current, readErr := GetGovernedRefund(db, approved.ID)
	if readErr != nil {
		t.Fatalf("read refund after forced persistence failure: %v", readErr)
	}
	if current == nil || current.Status != "processing" {
		t.Fatalf("expected visibly unresolved processing state after forced database failure, got %#v", current)
	}
}

// TestCompleteGovernedRefundWithProvider_CodCollectedSourceBlockedFromRail
// proves the U002-T003 source-aware guard: a refund whose original payment
// session was funded via cod_collected (cash collected in person, no card
// provider ever engaged) must never be routed through CashInRail.Refund --
// there is no provider-side charge to reverse. It must fail closed with
// ErrRefundSourceNotProviderBacked and the provider must never be called.
func TestCompleteGovernedRefundWithProvider_CodCollectedSourceBlockedFromRail(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "cod_collected", 1200, "YER")
	orderID := fmt.Sprintf("cod-source-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 1200, "cod-source")

	stub := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "should-not-be-used-" + approved.ID}}

	_, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-cod-source", "corr-cod-source")
	if !errors.Is(err, ErrRefundSourceNotProviderBacked) {
		t.Fatalf("expected ErrRefundSourceNotProviderBacked, got %v", err)
	}
	if stub.calls != 0 {
		t.Fatalf("provider must never be called for a non-provider-backed source, got %d calls", stub.calls)
	}

	current, readErr := GetGovernedRefund(db, approved.ID)
	if readErr != nil {
		t.Fatalf("read blocked refund: %v", readErr)
	}
	if current.Status != "rejected" {
		t.Fatalf("expected refund status rejected for a blocked non-provider-backed source, got %q", current.Status)
	}

	var ledgerCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions WHERE reference_type='refund' AND reference_id=$1`, approved.ID).Scan(&ledgerCount); err != nil {
		t.Fatalf("count ledger transactions: %v", err)
	}
	if ledgerCount != 0 {
		t.Fatalf("expected no ledger transaction (no implicit internal-wallet credit), got %d", ledgerCount)
	}
}
