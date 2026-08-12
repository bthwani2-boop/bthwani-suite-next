package payment

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

// TestExpireSession_AlreadyCaptured_NotExpirable verifies that calling
// ExpireSession on a session that is already captured returns
// ErrNotExpirable and does not overwrite the captured status -- previously
// the unconditional UPDATE would have silently flipped it to 'expired',
// losing the true captured state.
func TestExpireSession_AlreadyCaptured_NotExpirable(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-expire-captured-%d", time.Now().UnixNano())
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "captured", "card-cap-001", 1000, true)

	_, err := ExpireSession(db, sessionID)
	if !errors.Is(err, ErrNotExpirable) {
		t.Fatalf("expected ErrNotExpirable expiring an already-captured session, got %v", err)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "captured" {
		t.Errorf("expected status to remain 'captured', got %q", status)
	}
}

// TestExpireSession_Expirable_Succeeds verifies the happy path still works:
// a session in an expirable state is flipped to expired.
func TestExpireSession_Expirable_Succeeds(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-expire-ok-%d", time.Now().UnixNano())
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "reference_created", "", 1000, false)

	s, err := ExpireSession(db, sessionID)
	if err != nil {
		t.Fatalf("expected expire to succeed, got error: %v", err)
	}
	if s.Status != "expired" {
		t.Errorf("expected status 'expired', got %q", s.Status)
	}
}
