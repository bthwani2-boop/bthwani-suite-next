package partnerdelivery

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestPartnerDeliveryCommandReplayDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db, mockWFServer(t))
	actorID := "partner-command-test"
	commandID := "assign-command-1"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_delivery_command_receipts WHERE actor_id = $1`, actorID)
	})

	first, err := svc.AssignCourierCommand(
		ctx, fixture.operatorContextID, fixture.orderID, fixture.courierID, actorID, "partner", "corr-command-1", commandID,
	)
	if err != nil {
		t.Fatalf("first command failed: %v", err)
	}
	second, err := svc.AssignCourierCommand(
		ctx, fixture.operatorContextID, fixture.orderID, fixture.courierID, actorID, "partner", "corr-command-2", commandID,
	)
	if err != nil {
		t.Fatalf("replayed command failed: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected replayed task %s, got %s", first.ID, second.ID)
	}

	anotherCourierID := "courier-2"

	_, err = svc.AssignCourierCommand(
		ctx, fixture.operatorContextID, fixture.orderID, anotherCourierID, actorID, "partner", "corr-command-3", commandID,
	)
	if !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected ErrIdempotencyConflict, got %v", err)
	}
}

func TestPartnerDeliveryCommandContextIsolationDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	owner := seedFixture(t, db, "ready_for_pickup")
	other := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db, mockWFServer(t))
	actorID := "partner-command-context-isolation-test"
	commandID := "assign-command-context-isolation"

	owned, err := svc.AssignCourierCommand(
		ctx, owner.operatorContextID, owner.orderID, owner.courierID, actorID, "partner", "corr-context-owner", commandID,
	)
	if err != nil {
		t.Fatalf("owner command failed: %v", err)
	}

	if _, err := svc.AssignCourierCommand(
		ctx, other.operatorContextID, owner.orderID, owner.courierID, actorID, "partner", "corr-context-cross", "assign-command-context-cross",
	); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-context order command to be hidden, got %v", err)
	}

	if _, err := GetForOperatorContext(db, other.operatorContextID, owned.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-context task read to be hidden, got %v", err)
	}

	var receipts int
	if err := db.QueryRow(`
		SELECT count(*)
		FROM dsh_partner_delivery_command_receipts
		WHERE operator_context_id = $1 AND actor_id = $2 AND command_id = $3`,
		other.operatorContextID, actorID, "assign-command-context-cross").Scan(&receipts); err != nil {
		t.Fatalf("count cross-context receipts: %v", err)
	}
	if receipts != 0 {
		t.Fatalf("expected no cross-context command receipt, got %d", receipts)
	}
}

func TestPartnerDeliverySLAAlertContextIsolationDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	owner := seedFixture(t, db, "ready_for_pickup")
	other := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db, mockWFServer(t))
	actorID := "partner-sla-context-isolation-test"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_delivery_command_receipts WHERE actor_id = $1`, actorID)
	})

	task, err := svc.AssignCourierCommand(
		ctx, owner.operatorContextID, owner.orderID, owner.courierID, actorID, "partner", "corr-sla-assign", "assign-sla-context",
	)
	if err != nil {
		t.Fatalf("assignment failed: %v", err)
	}
	if _, err := db.Exec(`UPDATE dsh_partner_delivery_tasks SET assigned_at = NOW() - INTERVAL '20 minutes' WHERE id = $1`, task.ID); err != nil {
		t.Fatalf("age task for SLA: %v", err)
	}

	result, err := RefreshDeliverySLAAlerts(context.Background(), db, owner.operatorContextID, "corr-sla-refresh", time.Now().UTC())
	if err != nil {
		t.Fatalf("refresh owner SLA alerts failed: %v", err)
	}
	if result.Opened != 1 || result.Active != 1 {
		t.Fatalf("expected one owner alert, got %+v", result)
	}

	ownerAlerts, err := ListDeliverySLAAlerts(db, owner.operatorContextID, "", 100)
	if err != nil {
		t.Fatalf("list owner SLA alerts failed: %v", err)
	}
	if len(ownerAlerts) != 1 || ownerAlerts[0].OperatorContextID != owner.operatorContextID {
		t.Fatalf("expected one owner-scoped alert, got %+v", ownerAlerts)
	}
	otherAlerts, err := ListDeliverySLAAlerts(db, other.operatorContextID, "", 100)
	if err != nil {
		t.Fatalf("list other SLA alerts failed: %v", err)
	}
	if len(otherAlerts) != 0 {
		t.Fatalf("expected no cross-context SLA alerts, got %+v", otherAlerts)
	}

	if _, err := AcknowledgeDeliverySLAAlert(db, AcknowledgeDeliverySLAAlertInput{
		OperatorContextID: other.operatorContextID,
		AlertID:           ownerAlerts[0].ID,
		ActorID:           actorID,
		ExpectedVersion:   ownerAlerts[0].Version,
	}); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected cross-context SLA acknowledge to be hidden, got %v", err)
	}
	acknowledged, err := AcknowledgeDeliverySLAAlert(db, AcknowledgeDeliverySLAAlertInput{
		OperatorContextID: owner.operatorContextID,
		AlertID:           ownerAlerts[0].ID,
		ActorID:           actorID,
		ExpectedVersion:   ownerAlerts[0].Version,
	})
	if err != nil {
		t.Fatalf("owner SLA acknowledge failed: %v", err)
	}
	if acknowledged.OperatorContextID != owner.operatorContextID || acknowledged.Status != SLAAlertAcknowledged {
		t.Fatalf("owner acknowledge returned wrong alert: %+v", acknowledged)
	}
}

func TestPartnerDeliveryExceptionEvidenceDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	ctx := context.Background()
	svc := NewService(db, mockWFServer(t))
	actorID := "operator-exception-test"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_partner_delivery_command_receipts WHERE actor_id = $1`, actorID)
	})

	task, err := svc.AssignCourierCommand(
		ctx, fixture.operatorContextID, fixture.orderID, fixture.courierID, actorID, "operator", "corr-exception-assign", "assign-before-exception",
	)
	if err != nil {
		t.Fatalf("assignment failed: %v", err)
	}

	reason := "تعذر الوصول إلى العميل بعد محاولتين موثقتين"
	evidence := []string{"support-case:case-101", "media:ref-202"}
	exceptionTask, err := svc.RaiseExceptionCommand(
		ctx, fixture.operatorContextID, task.ID, task.Version, reason, evidence,
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
