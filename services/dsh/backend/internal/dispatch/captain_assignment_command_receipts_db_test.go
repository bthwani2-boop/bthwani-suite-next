package dispatch

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

func TestCaptainDeclineCommandReceiptReplaysWithoutASecondTransitionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	assignmentID, captainID, orderID, _, _, operatorContextID := seedArrivedCustomerFixture(t, db, "cod")
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_orders SET status = 'driver_assigned' WHERE id = $1::uuid;
		UPDATE dsh_assignments
		SET status = 'offered', accepted_at = NULL, response_deadline_at = NOW() + interval '1 hour', version = 1
		WHERE id = $2::uuid;
		UPDATE dsh_deliveries SET status = 'driver_assigned' WHERE assignment_id = $2::uuid
	`, orderID, assignmentID); err != nil {
		t.Fatalf("failed to prepare offered Captain assignment: %v", err)
	}

	idempotencyKey := fmt.Sprintf("captain-decline-command-%s", assignmentID)
	correlationID := fmt.Sprintf("captain-decline-correlation-%s", assignmentID)
	first, err := DeclineGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "captain_declined", "الطلب لا يناسب مساري", idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("first Captain decline command failed: %v", err)
	}
	if first.Status != AssignmentDeclined || first.Version != 2 {
		t.Fatalf("first decline readback = %#v, want declined at version 2", first)
	}

	replay, err := DeclineGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "captain_declined", "الطلب لا يناسب مساري", idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("replaying Captain decline command failed: %v", err)
	}
	if replay.Status != first.Status || replay.Version != first.Version {
		t.Fatalf("replay readback = %#v, want the original canonical readback %#v", replay, first)
	}

	var assignmentVersion, receiptCount int
	if err := db.QueryRowContext(ctx, `
		SELECT version FROM dsh_assignments WHERE id = $1::uuid
	`, assignmentID).Scan(&assignmentVersion); err != nil {
		t.Fatalf("failed to read assignment version: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM dsh_captain_assignment_command_receipts
		WHERE operator_context_id = $1 AND actor_id = $2 AND idempotency_key = $3
	`, operatorContextID, captainID, idempotencyKey).Scan(&receiptCount); err != nil {
		t.Fatalf("failed to count Captain assignment receipts: %v", err)
	}
	if assignmentVersion != 2 || receiptCount != 1 {
		t.Fatalf("stored decline = version %d with %d receipts, want version 2 with one receipt", assignmentVersion, receiptCount)
	}

	if _, err := DeclineGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "captain_declined", "سبب مختلف", idempotencyKey, correlationID,
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing decline key for different reason returned %v, want ErrIdempotencyConflict", err)
	}
}
