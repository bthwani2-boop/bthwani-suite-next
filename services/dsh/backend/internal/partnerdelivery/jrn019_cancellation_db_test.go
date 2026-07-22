package partnerdelivery

import (
	"context"
	"testing"
)

func TestOrderCancellationCancelsPartnerDeliveryTaskDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedFixture(t, db, "ready_for_pickup")
	service := NewService(db)

	task, err := service.AssignCourier(
		context.Background(),
		fixture.orderID,
		fixture.courierID,
		"operator-1",
		"operator",
		"cancel-command-19",
	)
	if err != nil {
		t.Fatalf("AssignCourier failed: %v", err)
	}

	if _, err := db.Exec(`
		UPDATE dsh_orders
		SET status='cancelled_by_operator',
		    cancellation_reason_code='operational_failure',
		    cancellation_note='تعذر استمرار توصيل المتجر',
		    updated_at=NOW()
		WHERE id=$1::uuid`, fixture.orderID); err != nil {
		t.Fatalf("failed to cancel partner-delivery order: %v", err)
	}

	var (
		status  string
		version int
	)
	if err := db.QueryRow(`
		SELECT status, version
		FROM dsh_partner_delivery_tasks
		WHERE id=$1`, task.ID).Scan(&status, &version); err != nil {
		t.Fatalf("failed to read cancelled partner-delivery task: %v", err)
	}
	if status != string(StatusCancelled) {
		t.Fatalf("task status=%q want %q", status, StatusCancelled)
	}
	if version != task.Version+1 {
		t.Fatalf("task version=%d want %d", version, task.Version+1)
	}
}
