package refund

import (
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestCreateRefundAtomicConcurrentReplayCreatesOneRowDBIntegration(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 2750, "YER")
	orderID := fmt.Sprintf("atomic-refund-order-%d", time.Now().UnixNano())
	input := CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "governed order cancellation",
	}

	type result struct {
		id      string
		created bool
		err     error
	}
	results := make(chan result, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	for i := 0; i < 2; i++ {
		go func() {
			defer wg.Done()
			refund, created, err := CreateRefundAtomic(db, input)
			id := ""
			if refund != nil {
				id = refund.ID
			}
			results <- result{id: id, created: created, err: err}
		}()
	}
	wg.Wait()
	close(results)

	ids := make(map[string]struct{})
	createdCount := 0
	for current := range results {
		if current.err != nil {
			t.Fatalf("concurrent refund create failed: %v", current.err)
		}
		if current.id == "" {
			t.Fatal("refund id is empty")
		}
		ids[current.id] = struct{}{}
		if current.created {
			createdCount++
		}
	}
	if len(ids) != 1 || createdCount != 1 {
		t.Fatalf("expected one refund identity and one creator, got ids=%d creators=%d", len(ids), createdCount)
	}

	var rowCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_refunds WHERE payment_session_id=$1`, sessionID).Scan(&rowCount); err != nil {
		t.Fatal(err)
	}
	if rowCount != 1 {
		t.Fatalf("expected one refund row, got %d", rowCount)
	}
}

func TestCreateRefundAtomicRejectsClientReferenceMismatchDBIntegration(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 900, "YER")
	_, _, err := CreateRefundAtomic(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          fmt.Sprintf("mismatch-order-%d", time.Now().UnixNano()),
		ClientID:         "different-client",
		Reason:           "invalid ownership",
	})
	if !errors.Is(err, ErrRefundReferenceConflict) {
		t.Fatalf("expected ErrRefundReferenceConflict, got %v", err)
	}
}

func TestCreateRefundAtomicRequiresReasonDBIntegration(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 1200, "YER")
	_, _, err := CreateRefundAtomic(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          fmt.Sprintf("missing-reason-order-%d", time.Now().UnixNano()),
		ClientID:         "client-test",
	})
	if err == nil {
		t.Fatal("expected empty refund reason to be rejected")
	}
}
