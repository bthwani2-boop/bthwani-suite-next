package wlt

import (
	"context"
	"dsh-api/internal/opctx"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func trustedCancellationTestContext() context.Context {
	return opctx.WithOperatorContext(context.Background(), "OperatorContext-a")
}

func TestCancelSessionForOrderUsesExplicitCorrelation(t *testing.T) {
	var gotCorrelation string
	var gotDelegatedOperatorContextID string
	var gotLegacyOperatorContextID string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotCorrelation = r.Header.Get("X-Correlation-ID")
		gotDelegatedOperatorContextID = r.Header.Get("X-Delegated-Operator-Context")
		gotLegacyOperatorContextID = r.Header.Get("X-Operator-Context-ID")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"action":        "none",
			"sessionStatus": "cancelled",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	result, err := client.CancelSessionForOrderWithResult(trustedCancellationTestContext(), "payment-session-1", CancelSessionForOrderInput{
		OrderID:       "order-1",
		ClientID:      "client-1",
		Reason:        "changed_mind",
		CorrelationID: "cancel-command-19",
	})
	if err != nil {
		t.Fatalf("CancelSessionForOrderWithResult failed: %v", err)
	}
	if gotCorrelation != "cancel-command-19" {
		t.Fatalf("X-Correlation-ID=%q want cancel-command-19", gotCorrelation)
	}
	if gotDelegatedOperatorContextID != "OperatorContext-a" {
		t.Fatalf("X-Delegated-Operator-Context=%q want OperatorContext-a", gotDelegatedOperatorContextID)
	}
	if gotLegacyOperatorContextID != "" {
		t.Fatalf("legacy X-Operator-Context-ID must not be emitted, got %q", gotLegacyOperatorContextID)
	}
	if result.Action != "none" || result.SessionStatus != "cancelled" {
		t.Fatalf("unexpected result: %+v", result)
	}
}

func TestCancelSessionForOrderRejectsRefundWithoutReference(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"action": "refund_requested"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	_, err := client.CancelSessionForOrderWithResult(trustedCancellationTestContext(), "payment-session-1", CancelSessionForOrderInput{
		OrderID:  "order-1",
		ClientID: "client-1",
		Reason:   "changed_mind",
	})
	if err == nil || !strings.Contains(err.Error(), "missing refund id") {
		t.Fatalf("expected missing refund id error, got %v", err)
	}
}

func TestCancelSessionForOrderRejectsMismatchedExpiredSession(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"action":         "expired",
			"paymentSession": map[string]any{"id": "different-session"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	_, err := client.CancelSessionForOrderWithResult(trustedCancellationTestContext(), "payment-session-1", CancelSessionForOrderInput{
		OrderID:  "order-1",
		ClientID: "client-1",
		Reason:   "changed_mind",
	})
	if err == nil || !strings.Contains(err.Error(), "requested payment session") {
		t.Fatalf("expected payment session identity error, got %v", err)
	}
}
