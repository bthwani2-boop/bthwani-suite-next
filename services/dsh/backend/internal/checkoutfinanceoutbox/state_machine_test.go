package checkoutfinanceoutbox

import (
	"errors"
	"strings"
	"testing"
	"time"

	"dsh-api/internal/wlt"
)

func TestSupportedEventTypesRejectParallelWorkerBranch(t *testing.T) {
	for _, eventType := range []string{EventTypeExpireSession, EventTypeCancelForOrder, EventTypeReleaseCodReservation} {
		if !supportedEventType(eventType) {
			t.Fatalf("event type %q must be supported", eventType)
		}
	}
	if supportedEventType("unknown_event") {
		t.Fatal("unknown event type must be rejected at enqueue")
	}
}

func TestBlankOperatorContextFailsClosed(t *testing.T) {
	for _, value := range []string{"", " ", "\t"} {
		if validOperatorContextID(value) {
			t.Fatalf("blank OperatorContext %q must be invalid", value)
		}
	}
	if !validOperatorContextID("OperatorContext-a") {
		t.Fatal("non-empty OperatorContext must remain deliverable")
	}
}

func TestPaymentSessionReadbackMapsTerminalClosureStates(t *testing.T) {
	tests := []struct {
		name   string
		status string
		action string
	}{
		{name: "expired", status: "expired", action: "expired"},
		{name: "captured", status: "captured", action: "none"},
		{name: "failed", status: "failed", action: "none"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result, err := resultForPaymentSession(Event{EventType: EventTypeExpireSession}, &wlt.PaymentSession{
				ID: "payment-session-1", Status: test.status,
			})
			if err != nil {
				t.Fatalf("resultForPaymentSession failed: %v", err)
			}
			if result.Action != test.action || result.PaymentSessionID != "payment-session-1" {
				t.Fatalf("unexpected result: %+v", result)
			}
		})
	}
}

func TestUnknownPaymentSessionReadbackCannotBecomeSuccess(t *testing.T) {
	_, err := resultForPaymentSession(Event{EventType: EventTypeExpireSession}, &wlt.PaymentSession{
		ID: "payment-session-1", Status: "provider_result_unknown",
	})
	if !errors.Is(err, wlt.ErrPaymentSessionOutcomeUnknown) {
		t.Fatalf("expected provider-result unknown error, got %v", err)
	}
}

func TestRetryBackoffIsBoundedExponential(t *testing.T) {
	if got := backoff(1); got != 2*time.Second {
		t.Fatalf("first retry backoff=%s, want 2s", got)
	}
	if got := backoff(10); got != 1024*time.Second {
		t.Fatalf("tenth retry backoff=%s, want 1024s", got)
	}
	if got := backoff(100); got > 30*time.Minute {
		t.Fatalf("retry backoff=%s exceeds 30m", got)
	}
}

func TestRecoveryRequiresReason(t *testing.T) {
	if err := RetryFailed(nil, "id", " "); err == nil || !strings.Contains(err.Error(), "reason") {
		t.Fatalf("expected retry reason validation, got %v", err)
	}
	if err := RequeueForReconciliation(nil, "id", " "); err == nil || !strings.Contains(err.Error(), "reason") {
		t.Fatalf("expected reconciliation reason validation, got %v", err)
	}
}
