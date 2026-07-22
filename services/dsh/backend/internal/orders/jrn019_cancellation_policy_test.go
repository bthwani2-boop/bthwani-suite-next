package orders

import "testing"

func TestSystemCancellationReasonsMapToExplicitTerminalStates(t *testing.T) {
	tests := []struct {
		name       string
		reasonCode string
		want       OrderStatus
	}{
		{name: "no driver", reasonCode: "no_driver", want: StatusCancelledNoDriver},
		{name: "payment failed", reasonCode: "payment_failed", want: StatusFailedPayment},
		{name: "dispatch failed", reasonCode: "dispatch_failed", want: StatusFailedDispatch},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := cancellationTarget("system", test.reasonCode); got != test.want {
				t.Fatalf("cancellationTarget(system, %q)=%q want %q", test.reasonCode, got, test.want)
			}
		})
	}
}

func TestHumanCancellationTargetsRemainRoleSpecific(t *testing.T) {
	if got := cancellationTarget("client", "changed_mind"); got != StatusCancelledByClient {
		t.Fatalf("client target=%q", got)
	}
	if got := cancellationTarget("partner", "out_of_stock"); got != StatusCancelledByStore {
		t.Fatalf("partner target=%q", got)
	}
	if got := cancellationTarget("operator", "operational_failure"); got != StatusCancelledByOperator {
		t.Fatalf("operator target=%q", got)
	}
}
