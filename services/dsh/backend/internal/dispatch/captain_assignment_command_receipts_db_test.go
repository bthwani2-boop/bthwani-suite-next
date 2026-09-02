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
	if _, err := db.ExecContext(ctx, `UPDATE dsh_orders SET status = 'driver_assigned' WHERE id = $1::uuid`, orderID); err != nil {
		t.Fatalf("failed to prepare offered Captain assignment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status = 'offered', accepted_at = NULL, response_deadline_at = NOW() + interval '1 hour', version = 1
		WHERE id = $1::uuid
	`, assignmentID); err != nil {
		t.Fatalf("failed to prepare offered Captain assignment row: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_deliveries SET status = 'driver_assigned' WHERE assignment_id = $1::uuid`, assignmentID); err != nil {
		t.Fatalf("failed to prepare Captain delivery row: %v", err)
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
	var storedCorrelationID string
	if err := db.QueryRowContext(ctx, `
		SELECT correlation_id
		FROM dsh_checkout_financial_closure_outbox
		WHERE order_id = $1::uuid AND event_type = 'release_cod_reservation'
	`, orderID).Scan(&storedCorrelationID); err != nil {
		t.Fatalf("failed to read COD release correlation: %v", err)
	}
	if storedCorrelationID != correlationID {
		t.Fatalf("stored COD release correlation = %q, want %q", storedCorrelationID, correlationID)
	}

	if _, err := DeclineGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "captain_declined", "سبب مختلف", idempotencyKey, correlationID,
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing decline key for different reason returned %v, want ErrIdempotencyConflict", err)
	}
}

func TestCaptainAcceptCommandReceiptReplaysWithoutASecondTransitionDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	assignmentID, captainID, orderID, _, _, operatorContextID := seedArrivedCustomerFixture(t, db, "wallet")

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_dispatch_profiles
			(operator_context_id, captain_id, accreditation_status, availability_status,
			 max_active_assignments, priority_score, updated_by, version)
		VALUES ($1, $2, 'approved', 'available', 1, 0, $2, 1)
	`, operatorContextID, captainID); err != nil {
		t.Fatalf("failed to seed Captain dispatch profile: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			operator_context_id, captain_id, wlt_decision_id, wlt_reason_code, wlt_policy_version,
			eligible, ineligibility_reason, snapshot_reference, checked_at, evaluated_at, expires_at
		) VALUES ($1, $2, $3, 'WLT_WALLET_ACTIVE', 'wallet-status@1', true, '', $3, now(), now(), now()+interval '5 minutes')
	`, operatorContextID, captainID, "captain-accept-decision-"+assignmentID); err != nil {
		t.Fatalf("failed to seed Captain financial eligibility: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_captain_financial_eligibility WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_captain_dispatch_profiles WHERE operator_context_id=$1 AND captain_id=$2`, operatorContextID, captainID)
	})

	if _, err := db.ExecContext(ctx, `UPDATE dsh_orders SET status='driver_assigned' WHERE id=$1::uuid`, orderID); err != nil {
		t.Fatalf("failed to prepare offered Captain assignment: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='offered', accepted_at=NULL, response_deadline_at=NOW()+interval '1 hour', version=1
		WHERE id=$1::uuid
	`, assignmentID); err != nil {
		t.Fatalf("failed to prepare offered Captain assignment row: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_deliveries SET status='driver_assigned' WHERE assignment_id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("failed to prepare Captain delivery row: %v", err)
	}

	idempotencyKey := fmt.Sprintf("captain-accept-command-%s", assignmentID)
	correlationID := fmt.Sprintf("captain-accept-correlation-%s", assignmentID)
	first, err := AcceptGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("first Captain accept command failed: %v", err)
	}
	if first.Status != AssignmentAccepted || first.Version != 2 {
		t.Fatalf("first accept readback = %#v, want accepted at version 2", first)
	}

	replay, err := AcceptGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, idempotencyKey, correlationID,
	)
	if err != nil {
		t.Fatalf("replaying Captain accept command failed: %v", err)
	}
	if replay.Status != first.Status || replay.Version != first.Version {
		t.Fatalf("replay readback = %#v, want the original canonical readback %#v", replay, first)
	}

	var assignmentVersion, receiptCount int
	if err := db.QueryRowContext(ctx, `SELECT version FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&assignmentVersion); err != nil {
		t.Fatalf("failed to read assignment version: %v", err)
	}
	if err := db.QueryRowContext(ctx, `
		SELECT count(*) FROM dsh_captain_assignment_command_receipts
		WHERE operator_context_id=$1 AND actor_id=$2 AND idempotency_key=$3
	`, operatorContextID, captainID, idempotencyKey).Scan(&receiptCount); err != nil {
		t.Fatalf("failed to count Captain assignment receipts: %v", err)
	}
	if assignmentVersion != 2 || receiptCount != 1 {
		t.Fatalf("stored accept = version %d with %d receipts, want version 2 with one receipt", assignmentVersion, receiptCount)
	}

	if _, err := DeclineGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "captain_declined", "سبب مختلف", idempotencyKey, correlationID,
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("reusing accept key for a different command returned %v, want ErrIdempotencyConflict", err)
	}
}

func TestCaptainAcceptCommandExpiresOverdueOfferBeforeMutationDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	assignmentID, captainID, orderID, _, _, operatorContextID := seedArrivedCustomerFixture(t, db, "wallet")
	if _, err := db.ExecContext(ctx, `UPDATE dsh_orders SET status='driver_assigned' WHERE id=$1::uuid`, orderID); err != nil {
		t.Fatalf("failed to prepare offered order: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
		UPDATE dsh_assignments
		SET status='offered', accepted_at=NULL, response_deadline_at=NOW()-interval '1 minute', version=1
		WHERE id=$1::uuid
	`, assignmentID); err != nil {
		t.Fatalf("failed to prepare expired offer: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE dsh_deliveries SET status='driver_assigned' WHERE assignment_id=$1::uuid`, assignmentID); err != nil {
		t.Fatalf("failed to prepare delivery: %v", err)
	}

	if _, err := AcceptGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "expired-captain-accept-"+assignmentID, "expired-captain-accept-correlation-"+assignmentID,
	); !errors.Is(err, ErrOfferExpired) {
		t.Fatalf("expected expired offer rejection, got %v", err)
	}

	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&status); err != nil {
		t.Fatalf("read expired assignment: %v", err)
	}
	if status != string(AssignmentCancelled) {
		t.Fatalf("expired offer status=%q, want cancelled", status)
	}

	if _, err := AcceptGovernedAssignmentForOperatorContext(
		db, operatorContextID, assignmentID, captainID, "expired-captain-accept-retry-"+assignmentID, "expired-captain-accept-retry-correlation-"+assignmentID,
	); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected already-actioned offer conflict, got %v", err)
	}
}
