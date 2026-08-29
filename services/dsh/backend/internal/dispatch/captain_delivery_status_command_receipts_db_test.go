package dispatch

import (
	"errors"
	"testing"
)

func TestCaptainDeliveryStatusCommandReplayAndCollisionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	first, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
		1,
		"captain-status-replay-key",
		"captain-status-replay-correlation",
	)
	if err != nil {
		t.Fatalf("first status command failed: %v", err)
	}

	replay, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
		1,
		"captain-status-replay-key",
		"captain-status-replay-correlation",
	)
	if err != nil {
		t.Fatalf("status replay failed: %v", err)
	}
	if replay.ID != first.ID || replay.Version != first.Version || replay.Delivery.Status != first.Delivery.Status {
		t.Fatalf("status replay changed canonical readback: first=%+v replay=%+v", first, replay)
	}

	if _, err = UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
		1,
		"captain-status-replay-key",
		"captain-status-replay-correlation",
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("status command collision error=%v want ErrIdempotencyConflict", err)
	}

	var receiptCount int
	if err = db.QueryRow(`
		SELECT COUNT(*)
		FROM dsh_captain_delivery_status_command_receipts
		WHERE operator_context_id=$1 AND assignment_id=$2::uuid`,
		fixture.OperatorContextID, fixture.AssignmentID,
	).Scan(&receiptCount); err != nil {
		t.Fatalf("count status receipts: %v", err)
	}
	if receiptCount != 1 {
		t.Fatalf("status receipt count=%d want=1", receiptCount)
	}
}
