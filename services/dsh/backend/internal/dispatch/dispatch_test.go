package dispatch

import (
	"errors"
	"fmt"
	"testing"

	"dsh-api/internal/orders"
)

func TestMapOrderErrorTranslatesNotFound(t *testing.T) {
	if got := mapOrderError(orders.ErrNotFound); got != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", got)
	}
}

func TestMapOrderErrorTranslatesConflict(t *testing.T) {
	if got := mapOrderError(orders.ErrConflict); got != ErrConflict {
		t.Fatalf("expected ErrConflict, got %v", got)
	}
}

func TestMapOrderErrorTranslatesWrappedErrors(t *testing.T) {
	wrapped := fmt.Errorf("transition failed: %w", orders.ErrConflict)
	if got := mapOrderError(wrapped); got != ErrConflict {
		t.Fatalf("expected %%w-wrapped ErrConflict to map to ErrConflict, got %v", got)
	}
}

func TestMapOrderErrorPassesThroughUnknownErrors(t *testing.T) {
	other := errors.New("some other failure")
	if got := mapOrderError(other); got != other {
		t.Fatalf("expected unrelated error to pass through unchanged, got %v", got)
	}
}

func TestCreateAssignmentRejectsMissingFields(t *testing.T) {
	cases := []CreateAssignmentInput{
		{CaptainID: "cap-1", ActorID: "actor-1"},
		{OrderID: "order-1", ActorID: "actor-1"},
		{OrderID: "order-1", CaptainID: "cap-1"},
	}
	for _, input := range cases {
		_, err := CreateAssignment(nil, input)
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestListCaptainAssignmentsRequiresCaptainID(t *testing.T) {
	_, err := ListCaptainAssignments(nil, "", 10)
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for empty captainID, got %v", err)
	}
}

func TestGetClientTrackingRequiresOrderAndClientID(t *testing.T) {
	cases := [][2]string{{"", "client-1"}, {"order-1", ""}}
	for _, c := range cases {
		_, err := GetClientTracking(nil, c[0], c[1])
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for orderID=%q clientID=%q, got %v", c[0], c[1], err)
		}
	}
}

func TestSubmitPoDRequiresMethodAndReference(t *testing.T) {
	cases := []PoDInput{
		{Reference: "ref-1"},
		{Method: "photo"},
	}
	for _, input := range cases {
		_, err := SubmitPoD(nil, "assignment-1", "captain-1", input)
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestUpdateDeliveryStatusRejectsUnsupportedStatus(t *testing.T) {
	_, err := UpdateDeliveryStatus(nil, "assignment-1", "captain-1", DeliveryStatus("bogus_status"))
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for unsupported delivery status, got %v", err)
	}
}
