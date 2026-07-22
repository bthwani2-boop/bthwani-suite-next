package pickup

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestRescheduleNoShowInvalidatesPreviousCodeDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	ctx := context.Background()

	oldCode, issued := issuedSession(t, service, fixture)
	noShow, err := service.NoShow(
		ctx,
		fixture.orderID,
		"partner-1",
		"partner",
		"customer did not arrive within the agreed window",
		"test-no-show",
	)
	if err != nil {
		t.Fatalf("NoShow failed: %v", err)
	}
	if noShow.Status != SessionNoShow {
		t.Fatalf("status=%s, want %s", noShow.Status, SessionNoShow)
	}

	newExpiry := time.Now().UTC().Add(3 * time.Hour)
	rescheduled, err := service.RescheduleWindow(
		ctx,
		fixture.orderID,
		newExpiry,
		"operator-1",
		"operator",
		"customer requested another collection window",
		"test-reschedule",
	)
	if err != nil {
		t.Fatalf("RescheduleWindow failed: %v", err)
	}
	if rescheduled.Status != SessionActive {
		t.Fatalf("status=%s, want %s", rescheduled.Status, SessionActive)
	}
	if rescheduled.Version <= issued.Version {
		t.Fatalf("version=%d, issued version=%d", rescheduled.Version, issued.Version)
	}
	if rescheduled.NoShowAt != nil || rescheduled.NoShowReason != nil {
		t.Fatalf("no-show projection was not cleared: at=%v reason=%v", rescheduled.NoShowAt, rescheduled.NoShowReason)
	}
	if rescheduled.RescheduledAt == nil {
		t.Fatal("expected rescheduledAt to be projected from the audit event")
	}
	if rescheduled.AttemptCount != 0 || rescheduled.UsedAt != nil || rescheduled.VerificationMethod != nil {
		t.Fatalf("rescheduled session was not reset: attempts=%d usedAt=%v method=%v", rescheduled.AttemptCount, rescheduled.UsedAt, rescheduled.VerificationMethod)
	}
	if !rescheduled.ExpiresAt.Equal(newExpiry) {
		t.Fatalf("expiresAt=%s, want %s", rescheduled.ExpiresAt, newExpiry)
	}

	if _, err := service.VerifyOtp(ctx, fixture.orderID, oldCode, "partner-1", "partner", "old-code"); !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("old code must be invalid after reschedule, got %v", err)
	}

	freshCode, freshSession, err := service.IssueOtp(
		ctx,
		fixture.orderID,
		fixture.clientID,
		"partner-1",
		"partner",
		"fresh-code",
	)
	if err != nil {
		t.Fatalf("IssueOtp after reschedule failed: %v", err)
	}
	if freshCode == oldCode {
		t.Fatal("fresh pickup code unexpectedly reused the previous code")
	}
	if freshSession.Version <= rescheduled.Version {
		t.Fatalf("fresh session version=%d, rescheduled version=%d", freshSession.Version, rescheduled.Version)
	}
	verified, err := service.VerifyOtp(ctx, fixture.orderID, freshCode, "partner-1", "partner", "verify-fresh")
	if err != nil {
		t.Fatalf("VerifyOtp with fresh code failed: %v", err)
	}
	if verified.Status != SessionVerified || verified.UsedAt == nil {
		t.Fatalf("verified session status=%s usedAt=%v", verified.Status, verified.UsedAt)
	}
}

func TestRescheduleRejectsActiveSessionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	_, _ = issuedSession(t, service, fixture)

	_, err := service.RescheduleWindow(
		context.Background(),
		fixture.orderID,
		time.Now().UTC().Add(time.Hour),
		"operator-1",
		"operator",
		"invalid early reschedule",
		"test-invalid-reschedule",
	)
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict for active session, got %v", err)
	}
}
