package refund

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestGovernedRefundRuntimeDurableCompletionSurfacesOutcomePersistenceFailure(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 1800, "YER")
	orderID := fmt.Sprintf("jrn035-persistence-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 500, "persistence-failure")

	_, err := db.Exec(`
		CREATE OR REPLACE FUNCTION jrn035_test_block_refund_outcome()
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
		DROP TRIGGER IF EXISTS trg_jrn035_test_block_refund_outcome ON wlt_refunds;
		CREATE TRIGGER trg_jrn035_test_block_refund_outcome
		BEFORE UPDATE OF status ON wlt_refunds
		FOR EACH ROW
		EXECUTE FUNCTION jrn035_test_block_refund_outcome();`)
	if err != nil {
		t.Fatalf("install outcome persistence failure trigger: %v", err)
	}
	defer func() {
		_, cleanupErr := db.Exec(`
			DROP TRIGGER IF EXISTS trg_jrn035_test_block_refund_outcome ON wlt_refunds;
			DROP FUNCTION IF EXISTS jrn035_test_block_refund_outcome();`)
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
