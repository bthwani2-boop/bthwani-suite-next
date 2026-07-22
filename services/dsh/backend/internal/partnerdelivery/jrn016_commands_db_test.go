package partnerdelivery

import (
	"context"
	"errors"
	"testing"
)

func TestPartnerDeliveryCommandReplayDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db)
	actorID := "partner-command-test"
	commandID := "assign-command-1"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_delivery_command_receipts WHERE actor_id = $1`, actorID)
	})

	first, err := svc.AssignCourierCommand(
		ctx, fixture.orderID, fixture.courierID, actorID, "partner", "corr-command-1", commandID,
	)
	if err != nil {
		t.Fatalf("first command failed: %v", err)
	}
	second, err := svc.AssignCourierCommand(
		ctx, fixture.orderID, fixture.courierID, actorID, "partner", "corr-command-2", commandID,
	)
	if err != nil {
		t.Fatalf("replayed command failed: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected replayed task %s, got %s", first.ID, second.ID)
	}

	var anotherCourierID string
	if err := db.QueryRow(`
		INSERT INTO dsh_store_team_members (store_id, name, role, status)
		VALUES ($1, 'Second Courier', 'courier', 'active')
		RETURNING id`, fixture.storeID).Scan(&anotherCourierID); err != nil {
		t.Fatalf("failed to create second courier: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_store_team_members WHERE id = $1`, anotherCourierID) })

	_, err = svc.AssignCourierCommand(
		ctx, fixture.orderID, anotherCourierID, actorID, "partner", "corr-command-3", commandID,
	)
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected ErrIdempotencyConflict, got %v", err)
	}
}

func TestPartnerDeliveryExceptionEvidenceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db)
	actorID := "operator-exception-test"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_delivery_command_receipts WHERE actor_id = $1`, actorID)
	})

	task, err := svc.AssignCourierCommand(
		ctx, fixture.orderID, fixture.courierID, actorID, "operator", "corr-exception-assign", "assign-before-exception",
	)
	if err != nil {
		t.Fatalf("assignment failed: %v", err)
	}

	reason := "تعذر الوصول إلى العميل بعد محاولتين موثقتين"
	evidence := []string{"support-case:case-101", "media:ref-202"}
	exceptionTask, err := svc.RaiseExceptionCommand(
		ctx, task.ID, task.Version, reason, evidence,
		actorID, "operator", "corr-exception", "raise-exception-1",
	)
	if err != nil {
		t.Fatalf("exception command failed: %v", err)
	}
	if exceptionTask.Status != StatusException {
		t.Fatalf("expected exception status, got %s", exceptionTask.Status)
	}
	if exceptionTask.ExceptionReason == nil || *exceptionTask.ExceptionReason != reason {
		t.Fatalf("exception reason was not persisted: %v", exceptionTask.ExceptionReason)
	}
	if len(exceptionTask.ExceptionEvidenceReferences) != 2 {
		t.Fatalf("expected two evidence references, got %v", exceptionTask.ExceptionEvidenceReferences)
	}
	if exceptionTask.ExceptionReportedAt == nil {
		t.Fatal("expected exception_reported_at to be persisted")
	}
}
