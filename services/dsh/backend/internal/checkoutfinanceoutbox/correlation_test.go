package checkoutfinanceoutbox

import (
	"context"
	"dsh-api/internal/opctx"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/wlt"
)

func TestDispatchPreservesPersistedCancellationCorrelation(t *testing.T) {
	const operatorContextID = "OperatorContext-a"
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

	client := wlt.NewClient(server.URL, "test-service-token")
	trustedContext := opctx.WithOperatorContext(context.Background(), operatorContextID)
	result, err := dispatch(trustedContext, client, Event{
		EventType:        EventTypeCancelForOrder,
		CheckoutIntentID: "checkout-intent-1",
		PaymentSessionID: "payment-session-1",
		OrderID:          "order-1",
		ClientID:         "client-1",
		Reason:           "changed_mind",
		CorrelationID:    "cancel-command-19",
	})
	if err != nil {
		t.Fatalf("dispatch failed: %v", err)
	}
	if gotCorrelation != "cancel-command-19" {
		t.Fatalf("X-Correlation-ID=%q want cancel-command-19", gotCorrelation)
	}
	if gotDelegatedOperatorContextID != operatorContextID {
		t.Fatalf("X-Delegated-Operator-Context=%q want %q", gotDelegatedOperatorContextID, operatorContextID)
	}
	if gotLegacyOperatorContextID != "" {
		t.Fatalf("legacy X-Operator-Context-ID must not be emitted, got %q", gotLegacyOperatorContextID)
	}
	if result.Action != "none" || result.SessionStatus != "cancelled" {
		t.Fatalf("unexpected delivery result: %+v", result)
	}
}
