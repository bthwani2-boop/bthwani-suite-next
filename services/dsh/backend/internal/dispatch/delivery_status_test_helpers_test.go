package dispatch

import "database/sql"

// These adapters keep legacy DB fixtures readable without exposing a
// non-durable delivery-status entry point in the application build. Every test
// call still executes the canonical receipt-backed command.
func testDeliveryStatusCommand(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
	expectedVersion int,
	commandName string,
) (*Assignment, error) {
	switch status {
	case DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer:
	default:
		return UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
			db,
			operatorContextID,
			assignmentID,
			captainID,
			status,
			1,
			"test-captain-status-invalid",
			"test-captain-status-invalid-correlation",
		)
	}
	key := "test-captain-status:" + commandName + ":" + assignmentID
	correlationID := "test-captain-status-correlation:" + commandName + ":" + assignmentID
	return UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
		db,
		operatorContextID,
		assignmentID,
		captainID,
		status,
		expectedVersion,
		key,
		correlationID,
	)
}

func testDeliveryStatusCommandCurrent(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
	commandName string,
) (*Assignment, error) {
	current, err := GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	return testDeliveryStatusCommand(db, operatorContextID, assignmentID, captainID, status, current.Version, commandName)
}
