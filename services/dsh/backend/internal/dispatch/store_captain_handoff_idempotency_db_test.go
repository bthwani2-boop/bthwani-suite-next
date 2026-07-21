package dispatch

import (
	"testing"
)

func TestStoreCaptainHandoffConfirmationReplaysAfterPickupDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	arrived, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
	)
	if err != nil {
		t.Fatalf("captain arrival failed: %v", err)
	}
	arrivedReplay, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
	)
	if err != nil {
		t.Fatalf("captain arrival replay failed: %v", err)
	}
	if arrivedReplay.Delivery.Status != arrived.Delivery.Status {
		t.Fatalf("arrival replay status=%s want=%s", arrivedReplay.Delivery.Status, arrived.Delivery.Status)
	}

	confirmed, err := ConfirmStoreCaptainHandoffIdempotent(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-actor",
	)
	if err != nil {
		t.Fatalf("partner confirmation failed: %v", err)
	}

	pickedUp, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
	)
	if err != nil {
		t.Fatalf("captain pickup failed: %v", err)
	}
	pickupReplay, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
	)
	if err != nil {
		t.Fatalf("captain pickup replay failed: %v", err)
	}
	if pickupReplay.Delivery.Status != pickedUp.Delivery.Status {
		t.Fatalf("pickup replay status=%s want=%s", pickupReplay.Delivery.Status, pickedUp.Delivery.Status)
	}

	confirmationReplay, err := ConfirmStoreCaptainHandoffIdempotent(
		db,
		fixture.OrderID,
		fixture.StoreID,
		"partner-actor",
	)
	if err != nil {
		t.Fatalf("partner confirmation replay after pickup failed: %v", err)
	}
	if confirmationReplay.ID != confirmed.ID {
		t.Fatalf("confirmation replay returned handoff=%s want=%s", confirmationReplay.ID, confirmed.ID)
	}
	if confirmationReplay.Status != "completed" {
		t.Fatalf("confirmation replay status=%s want=completed", confirmationReplay.Status)
	}
	if confirmationReplay.Version != confirmed.Version+1 {
		t.Fatalf("completed handoff version=%d want=%d", confirmationReplay.Version, confirmed.Version+1)
	}
}

func TestReplacementAssignmentImmediatelySupersedesStoreCaptainHandoffDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	fixture := seedOutboundHandoffFixture(t, db)

	if _, err := UpdateDeliveryStatusGovernedIdempotent(
		db,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedStore,
	); err != nil {
		t.Fatalf("captain arrival failed: %v", err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`
		UPDATE dsh_assignments
		SET status='cancelled', updated_at=NOW()
		WHERE id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`
		UPDATE dsh_deliveries
		SET status='cancelled', updated_at=NOW()
		WHERE assignment_id=$1::uuid`, fixture.AssignmentID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`
		UPDATE dsh_orders
		SET status='driver_assigned', updated_at=NOW()
		WHERE id=$1::uuid`, fixture.OrderID); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(`
		INSERT INTO dsh_assignments (
			order_id, captain_id, assigned_by, status, response_deadline_at
		) VALUES (
			$1::uuid, $2, 'operator-reassignment-test', 'offered', NOW() + interval '90 seconds'
		)`, fixture.OrderID, fixture.CaptainID+"-replacement"); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var handoffStatus string
	if err = db.QueryRow(`
		SELECT status
		FROM dsh_store_captain_handoffs
		WHERE assignment_id=$1::uuid`, fixture.AssignmentID).Scan(&handoffStatus); err != nil {
		t.Fatal(err)
	}
	if handoffStatus != "superseded" {
		t.Fatalf("old handoff status=%s want=superseded", handoffStatus)
	}
}
