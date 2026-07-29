package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientPropagatesTrustedTenantToCodHandoff(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-a" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := WithOperatorContext(context.Background(), "tenant-a")
	err := client.NotifyDeliveryCollection(ctx, NotifyDeliveryCollectionInput{
		OrderID:          "order-1",
		CollectorType:    "captain",
		CollectorID:      "captain-1",
		PartnerID:        "partner-1",
		CheckoutIntentID: "checkout-1",
	})
	if err != nil {
		t.Fatalf("unexpected COD handoff error: %v", err)
	}
}

func TestClientPropagatesTenantInPaymentBodyAndHeader(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-b" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		var input CreatePaymentSessionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if input.OperatorContextID != "tenant-b" {
			t.Fatalf("expected tenant-b in payment body, got %q", input.OperatorContextID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{ID: "ps-1", OperatorContextID: "tenant-b"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := WithOperatorContext(context.Background(), "tenant-b")
	if _, err := client.CreatePaymentSession(ctx, CreatePaymentSessionInput{
		CheckoutIntentID: "checkout-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
	}); err != nil {
		t.Fatalf("unexpected payment handoff error: %v", err)
	}
}

func TestClientRejectsTenantOverride(t *testing.T) {
	client := NewClient("https://wlt.internal", "service-token")
	ctx := WithOperatorContext(context.Background(), "tenant-a")

	_, err := client.CreatePaymentSession(ctx, CreatePaymentSessionInput{
		OperatorContextID:         "tenant-b",
		CheckoutIntentID: "checkout-1",
	})
	if err == nil || !strings.Contains(err.Error(), "does not match trusted request context") {
		t.Fatalf("expected tenant override rejection, got %v", err)
	}
}

func TestClientFailsClosedWithoutTrustedTenantInEveryMode(t *testing.T) {
	for _, mode := range []string{"", "deferred", "active"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("BTHWANI_SAAS_MODE", mode)
			t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "legacy-default")
			client := NewClient("https://wlt.internal", "service-token")
			if !client.Configured() {
				t.Fatal("transport configuration must not depend on a process-wide tenant")
			}
			_, err := client.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{
				CheckoutIntentID: "checkout-1",
			})
			if err == nil || !strings.Contains(err.Error(), "trusted tenant context is required") {
				t.Fatalf("expected missing trusted tenant rejection, got %v", err)
			}
		})
	}
}

func TestClientIgnoresProcessWideDefaultWhenTrustedTenantExists(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "legacy-default")
	client := NewClient("https://wlt.internal", "service-token")
	operatorContextID, err := client.resolveTrustedTenant(WithOperatorContext(context.Background(), "tenant-canonical"), "")
	if err != nil || operatorContextID != "tenant-canonical" {
		t.Fatalf("trusted tenant=%q err=%v", operatorContextID, err)
	}
}
