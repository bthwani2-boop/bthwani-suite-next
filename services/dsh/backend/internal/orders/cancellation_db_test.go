package orders

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestClientEarlyCancellationCreatesOneGovernedRecordDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPending))
	correlationID := fmt.Sprintf("client-cancel-%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	input := CancellationInput{
		OrderID:       order.ID,
		ActorID:       order.ClientID,
		ActorRole:     "client",
		ReasonCode:    "changed_mind",
		CorrelationID: correlationID,
	}
	first, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("first CancelOrder failed: %v", err)
	}
	second, err := CancelOrder(db, input)
	if err != nil {
		t.Fatalf("idempotent CancelOrder replay failed: %v", err)
	}
	if first.Status != StatusCancelledByClient || second.Status != StatusCancelledByClient {
		t.Fatalf("expected client cancellation status, got first=%s second=%s", first.Status, second.Status)
	}

	var cancellationCount, outboxCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_checkout_financial_closure_outbox WHERE order_id=$1::uuid AND event_type='cancel_for_order'`, order.ID).Scan(&outboxCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 1 || outboxCount != 1 {
		t.Fatalf("expected one cancellation and one outbox event, got cancellations=%d outbox=%d", cancellationCount, outboxCount)
	}

	projection, err := GetCancellation(db, order.ID)
	if err != nil {
		t.Fatalf("GetCancellation failed: %v", err)
	}
	if projection.ActorRole != "client" || projection.ReasonCode != "changed_mind" {
		t.Fatalf("unexpected cancellation projection: %+v", projection)
	}
	if projection.FinancialClosureStatus != "pending" {
		t.Fatalf("expected pending financial closure, got %q", projection.FinancialClosureStatus)
	}
}

func TestClientLateCancellationRequiresOperatorReviewDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusPreparing))
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	_, err := CancelOrder(db, CancellationInput{
		OrderID:       order.ID,
		ActorID:       order.ClientID,
		ActorRole:     "client",
		ReasonCode:    "excessive_delay",
		CorrelationID: fmt.Sprintf("late-client-cancel-%d", time.Now().UnixNano()),
	})
	if !errors.Is(err, ErrCancellationRequiresReview) {
		t.Fatalf("expected ErrCancellationRequiresReview, got %v", err)
	}

	current, err := GetOrder(db, order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if current.Status != StatusPreparing {
		t.Fatalf("late client cancellation mutated order: %s", current.Status)
	}
	var cancellationCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_order_cancellations WHERE order_id=$1::uuid`, order.ID).Scan(&cancellationCount); err != nil {
		t.Fatal(err)
	}
	if cancellationCount != 0 {
		t.Fatalf("expected no cancellation record for review-required decision, got %d", cancellationCount)
	}
}

func TestOperatorCancellationStopsDependentDispatchWorkDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusReadyForPickup))
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	var assignmentID string
	if err := db.QueryRow(`
		INSERT INTO dsh_assignments(order_id,captain_id,assigned_by,status,response_deadline_at,accepted_at)
		VALUES($1::uuid,$2,$3,'accepted',NOW()+INTERVAL '90 seconds',NOW())
		RETURNING id::text`, order.ID, "captain-cancellation-test", "operator-cancellation-test").Scan(&assignmentID); err != nil {
		t.Fatalf("insert assignment: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_deliveries(assignment_id,order_id,captain_id,status)
		VALUES($1::uuid,$2::uuid,$3,'driver_assigned')`, assignmentID, order.ID, "captain-cancellation-test"); err != nil {
		t.Fatalf("insert delivery: %v", err)
	}

	cancelled, err := CancelOrder(db, CancellationInput{
		OrderID:       order.ID,
		ActorID:       "operator-cancellation-test",
		ActorRole:     "operator",
		ReasonCode:    "operational_failure",
		ReasonNote:    "dispatch dependency test",
		CorrelationID: fmt.Sprintf("operator-cancel-%d", time.Now().UnixNano()),
	})
	if err != nil {
		t.Fatalf("CancelOrder failed: %v", err)
	}
	if cancelled.Status != StatusCancelledByOperator {
		t.Fatalf("expected operator cancellation, got %s", cancelled.Status)
	}

	var assignmentStatus, deliveryStatus string
	if err := db.QueryRow(`SELECT status FROM dsh_assignments WHERE id=$1::uuid`, assignmentID).Scan(&assignmentStatus); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT status FROM dsh_deliveries WHERE assignment_id=$1::uuid`, assignmentID).Scan(&deliveryStatus); err != nil {
		t.Fatal(err)
	}
	if assignmentStatus != "cancelled" || deliveryStatus != "cancelled" {
		t.Fatalf("dependent work remained actionable: assignment=%s delivery=%s", assignmentStatus, deliveryStatus)
	}
}

func TestPartnerCannotCancelAfterReadyForPickupDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	order, paymentSessionID := seedOrderFixture(t, db, string(StatusReadyForPickup))
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_checkout_financial_closure_outbox WHERE payment_session_id=$1`, paymentSessionID)
	})

	_, err := CancelOrder(db, CancellationInput{
		OrderID:       order.ID,
		ActorID:       "partner-cancellation-test",
		ActorRole:     "partner",
		ReasonCode:    "cannot_fulfill",
		CorrelationID: fmt.Sprintf("partner-late-cancel-%d", time.Now().UnixNano()),
	})
	if !errors.Is(err, ErrConflict) {
		t.Fatalf("expected conflict for late partner cancellation, got %v", err)
	}
}
