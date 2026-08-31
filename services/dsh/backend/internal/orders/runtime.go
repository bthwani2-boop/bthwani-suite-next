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
