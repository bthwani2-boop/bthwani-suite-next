package promotionfunding

import "testing"

func TestCompletedTransitionMatches(t *testing.T) {
	t.Parallel()
	orderID := "order-1"

	tests := []struct {
		name    string
		current Reservation
		target  string
		input   TransitionInput
		want    bool
	}{
		{
			name: "commit retry matches original order",
			current: Reservation{Status: "committed", OrderID: &orderID},
			target: "committed", input: TransitionInput{OrderID: "order-1"}, want: true,
		},
		{
			name: "commit retry rejects different order",
			current: Reservation{Status: "committed", OrderID: &orderID},
			target: "committed", input: TransitionInput{OrderID: "order-2"}, want: false,
		},
		{
			name: "release retry matches original reason",
			current: Reservation{Status: "released", ReleaseReason: "checkout_expired"},
			target: "released", input: TransitionInput{Reason: "checkout_expired"}, want: true,
		},
		{
			name: "release retry rejects changed reason",
			current: Reservation{Status: "released", ReleaseReason: "checkout_expired"},
			target: "released", input: TransitionInput{Reason: "operator_cancelled"}, want: false,
		},
		{
			name: "reverse retry matches order and reason",
			current: Reservation{Status: "reversed", OrderID: &orderID, ReversalReason: "refund_completed"},
			target: "reversed", input: TransitionInput{OrderID: "order-1", Reason: "refund_completed"}, want: true,
		},
		{
			name: "reverse retry rejects changed reason",
			current: Reservation{Status: "reversed", OrderID: &orderID, ReversalReason: "refund_completed"},
			target: "reversed", input: TransitionInput{OrderID: "order-1", Reason: "manual_override"}, want: false,
		},
	}

	for _, testCase := range tests {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			if got := completedTransitionMatches(&testCase.current, testCase.target, testCase.input); got != testCase.want {
				t.Fatalf("completedTransitionMatches()=%v, want %v", got, testCase.want)
			}
		})
	}
}
