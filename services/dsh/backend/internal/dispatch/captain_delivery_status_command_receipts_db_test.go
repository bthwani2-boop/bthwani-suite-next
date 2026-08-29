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
	if first.Version != 2 || first.Delivery.Status != DeliveryArrivedStore {
		t.Fatalf("arrival result=%+v want version=2 status=%s", first, DeliveryArrivedStore)
	}

	if _, err = ConfirmStoreCaptainHandoffIdempotentForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.OrderID,
		fixture.StoreID,
		"partner-actor",
	); err != nil {
		t.Fatalf("partner confirmation failed: %v", err)
	}

	pickup, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
		2,
		"captain-status-pickup-key",
		"captain-status-pickup-correlation",
	)
	if err != nil {
		t.Fatalf("pickup command failed: %v", err)
	}
	pickupReplay, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryPickedUp,
		2,
		"captain-status-pickup-key",
		"captain-status-pickup-correlation",
	)
	if err != nil {
		t.Fatalf("pickup replay failed: %v", err)
	}
	if pickupReplay.ID != pickup.ID || pickupReplay.Version != pickup.Version || pickupReplay.Delivery.Status != pickup.Delivery.Status {
		t.Fatalf("pickup replay changed canonical readback: first=%+v replay=%+v", pickup, pickupReplay)
	}
	if pickup.Version != 3 || pickup.Delivery.Status != DeliveryPickedUp {
		t.Fatalf("pickup result=%+v want version=3 status=%s", pickup, DeliveryPickedUp)
	}

	arrivedCustomer, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedCustomer,
		3,
		"captain-status-customer-key",
		"captain-status-customer-correlation",
	)
	if err != nil {
		t.Fatalf("customer arrival command failed: %v", err)
	}
	arrivedCustomerReplay, err := UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		fixture.OperatorContextID,
		fixture.AssignmentID,
		fixture.CaptainID,
		DeliveryArrivedCustomer,
		3,
		"captain-status-customer-key",
		"captain-status-customer-correlation",
	)
	if err != nil {
		t.Fatalf("customer arrival replay failed: %v", err)
	}
	if arrivedCustomerReplay.ID != arrivedCustomer.ID || arrivedCustomerReplay.Version != arrivedCustomer.Version || arrivedCustomerReplay.Delivery.Status != arrivedCustomer.Delivery.Status {
		t.Fatalf("customer arrival replay changed canonical readback: first=%+v replay=%+v", arrivedCustomer, arrivedCustomerReplay)
	}
	if arrivedCustomer.Version != 4 || arrivedCustomer.Delivery.Status != DeliveryArrivedCustomer {
		t.Fatalf("customer arrival result=%+v want version=4 status=%s", arrivedCustomer, DeliveryArrivedCustomer)
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
	if receiptCount != 3 {
		t.Fatalf("status receipt count=%d want=3", receiptCount)
	}

	var finalVersion int
	var finalStatus string
	if err = db.QueryRow(`
		SELECT a.version, d.status
		FROM dsh_assignments a
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		WHERE a.id = $1::uuid`, fixture.AssignmentID).Scan(&finalVersion, &finalStatus); err != nil {
		t.Fatalf("read final delivery state: %v", err)
	}
	if finalVersion != 4 || finalStatus != string(DeliveryArrivedCustomer) {
		t.Fatalf("final delivery state version=%d status=%q", finalVersion, finalStatus)
	}
}
