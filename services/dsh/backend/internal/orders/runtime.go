package orders

import (
	"errors"
)

const (
	StatusCancelledByClient   OrderStatus = "cancelled_by_client"
	StatusCancelledByStore    OrderStatus = "cancelled_by_store"
	StatusCancelledByOperator OrderStatus = "cancelled_by_operator"
	StatusCancelledNoDriver   OrderStatus = "cancelled_no_driver"
	StatusFailedPayment       OrderStatus = "failed_payment"
	StatusFailedDispatch      OrderStatus = "failed_dispatch"

	maxCancellationReasonNoteLength = 1000
)

var ErrCancellationRequiresReview = errors.New("order cancellation requires operator review")

func cancellationTarget(role, reasonCode string) OrderStatus {
	switch role {
	case "client":
		return StatusCancelledByClient
	case "partner":
		return StatusCancelledByStore
	case "system":
		switch reasonCode {
		case "no_driver":
			return StatusCancelledNoDriver
		case "payment_issue":
			return StatusFailedPayment
		case "operational_failure":
			return StatusFailedDispatch
		}
	}
	return StatusCancelledByOperator
}

func validCancellationReason(role, code string) bool {
	allowed := map[string]map[string]bool{
		"client": {
			"changed_mind": true, "duplicate_order": true, "address_error": true,
			"payment_issue": true, "excessive_delay": true, "other": true,
		},
		"partner": {
			"out_of_stock": true, "store_closed": true, "capacity": true,
			"pricing_issue": true, "cannot_fulfill": true, "other": true,
		},
		"operator": {
			"customer_request": true, "partner_request": true, "no_driver": true,
			"fraud_risk": true, "safety": true, "operational_failure": true, "other": true,
		},
		"system": {
			"no_driver": true, "payment_issue": true, "operational_failure": true,
		},
	}
	return allowed[role][code]
}

func cancellableStatuses(role string) []OrderStatus {
	switch role {
	case "client":
		return []OrderStatus{StatusPending, StatusStoreAccepted}
	case "partner":
		return []OrderStatus{StatusPending, StatusStoreAccepted, StatusPreparing}
	case "operator":
		return []OrderStatus{
			StatusPending,
			StatusStoreAccepted,
			StatusPreparing,
			StatusReadyForPickup,
			StatusDriverAssigned,
			StatusArrivedStore,
			StatusReturnedStore,
		}
	case "system":
		return []OrderStatus{
			StatusPending,
			StatusStoreAccepted,
			StatusPreparing,
			StatusReadyForPickup,
			StatusDriverAssigned,
			StatusArrivedStore,
		}
	default:
		return nil
	}
}
