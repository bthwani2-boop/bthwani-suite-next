package checkoutfinanceoutbox

import (
	"strings"
	"testing"
)

func TestFinancialProjectionUsesWLTReferenceForNoAction(t *testing.T) {
	status, reference, err := financialProjection(DeliveryResult{
		Action:           "none",
		SessionStatus:    "already_refunded",
		PaymentSessionID: "payment-session-19",
	})
	if err != nil {
		t.Fatalf("financialProjection failed: %v", err)
	}
	if status != "no_action" {
		t.Fatalf("status=%q want no_action", status)
	}
	if reference != "payment-session-19" {
		t.Fatalf("reference=%q want payment-session-19", reference)
	}
}

func TestFinancialProjectionRejectsMissingWLTReference(t *testing.T) {
	_, _, err := financialProjection(DeliveryResult{Action: "refund_requested"})
	if err == nil || !strings.Contains(err.Error(), "missing its WLT reference") {
		t.Fatalf("expected missing WLT reference error, got %v", err)
	}
}
