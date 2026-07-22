package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCancelSessionForOrderUsesExplicitCorrelation(t *testing.T) {
	var gotCorrelation string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotCorrelation = r.Header.Get("X-Correlation-ID")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"action":        "none",
			"sessionStatus": "cancelled",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	result, err := client.CancelSessionForOrderWithResult(context.Background(), "payment-session-1", CancelSessionForOrderInput{
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
	_, err := client.CancelSessionForOrderWithResult(context.Background(), "payment-session-1", CancelSessionForOrderInput{
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
	_, err := client.CancelSessionForOrderWithResult(context.Background(), "payment-session-1", CancelSessionForOrderInput{
		OrderID:  "order-1",
		ClientID: "client-1",
		Reason:   "changed_mind",
	})
	if err == nil || !strings.Contains(err.Error(), "requested payment session") {
		t.Fatalf("expected payment session identity error, got %v", err)
	}
}
