package pickup

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

func TestOrderCancellationCancelsPickupSessionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)
	otp, _ := issuedSession(t, service, fixture)

	if _, err := db.Exec(`
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='تعذر إكمال الاستلام من المتجر',
		    updated_at=NOW()
		WHERE id=$1::uuid`, fixture.orderID); err != nil {
		t.Fatalf("failed to cancel pickup order: %v", err)
	}

	var (
		status             string
		cancelledAt        sql.NullTime
		cancellationReason sql.NullString
		usedAt             sql.NullTime
		verificationMethod sql.NullString
	)
	if err := db.QueryRow(`
		SELECT status, cancelled_at, cancellation_reason, used_at, verification_method
		FROM dsh_pickup_sessions
		WHERE order_id=$1::uuid`, fixture.orderID).Scan(
		&status,
		&cancelledAt,
		&cancellationReason,
		&usedAt,
		&verificationMethod,
	); err != nil {
		t.Fatalf("failed to read cancelled pickup session: %v", err)
	}
	if status != "cancelled" || !cancelledAt.Valid {
		t.Fatalf("pickup session status=%q cancelledAt=%v", status, cancelledAt.Valid)
	}
	if !cancellationReason.Valid || cancellationReason.String != "تعذر إكمال الاستلام من المتجر" {
		t.Fatalf("unexpected cancellation reason: %+v", cancellationReason)
	}
	if usedAt.Valid || verificationMethod.Valid {
		t.Fatalf("cancelled pickup session retained consumption data: usedAt=%v verificationMethod=%v", usedAt, verificationMethod)
	}

	if _, err := service.VerifyOtp(context.Background(), fixture.orderID, otp, "partner-1", "partner", "cancel-command-19"); !errors.Is(err, ErrCancelled) {
		t.Fatalf("expected ErrCancelled after order cancellation, got %v", err)
	}
}
