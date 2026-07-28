package checkoutfinanceoutbox

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/wlt"
)

func TestDispatchPreservesPersistedCancellationCorrelation(t *testing.T) {
	const tenantID = "tenant-a"
	var gotCorrelation string
	var gotTenantID string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotCorrelation = r.Header.Get("X-Correlation-ID")
		gotTenantID = r.Header.Get("X-Tenant-ID")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"action":        "none",
			"sessionStatus": "cancelled",
		})
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	trustedContext := wlt.WithTenantContext(context.Background(), tenantID)
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
	if gotTenantID != tenantID {
		t.Fatalf("X-Tenant-ID=%q want %q", gotTenantID, tenantID)
	}
	if result.Action != "none" || result.SessionStatus != "cancelled" {
		t.Fatalf("unexpected delivery result: %+v", result)
	}
}
