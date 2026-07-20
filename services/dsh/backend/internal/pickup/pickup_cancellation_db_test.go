package pickup

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestCancelledPickupCannotBeVerifiedOrExtendedDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	ctx := context.Background()

	plain, issued := issuedSession(t, service, fixture)
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='pickup cancelled by operations',
		    cancelled_at=NOW()
		WHERE id=$1::uuid`, fixture.orderID); err != nil {
		t.Fatalf("cancel pickup order: %v", err)
	}

	cancelled, err := Get(db, issued.ID)
	if err != nil {
		t.Fatalf("reload cancelled pickup: %v", err)
	}
	if cancelled.Status != SessionCancelled {
		t.Fatalf("expected status cancelled, got %q", cancelled.Status)
	}
	if cancelled.CancelledAt == nil || cancelled.CancellationReason == nil {
		t.Fatalf("expected cancellation timestamp and reason, got %+v", cancelled)
	}
	if cancelled.UsedAt != nil || cancelled.VerificationMethod != nil {
		t.Fatalf("cancelled pickup must not look consumed: usedAt=%v method=%v", cancelled.UsedAt, cancelled.VerificationMethod)
	}

	if _, err := service.VerifyOtp(ctx, fixture.orderID, plain, "partner-1", "partner", "cancelled-verify"); !errors.Is(err, ErrCancelled) {
		t.Fatalf("expected ErrCancelled from VerifyOtp, got %v", err)
	}
	if _, err := service.ExtendWindow(ctx, fixture.orderID, time.Now().Add(time.Hour), "operator-1", "operator", "manual extension", "cancelled-extend"); !errors.Is(err, ErrCancelled) {
		t.Fatalf("expected ErrCancelled from ExtendWindow, got %v", err)
	}
}
