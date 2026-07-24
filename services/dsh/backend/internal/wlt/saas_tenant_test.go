package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureActiveSaaS(t *testing.T, tenantID string) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", tenantID)
}

func TestActiveSaaSClientPropagatesTrustedTenantToCodHandoff(t *testing.T) {
	configureActiveSaaS(t, "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-main" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	err := client.NotifyDeliveryCollection(context.Background(), NotifyDeliveryCollectionInput{
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

func TestActiveSaaSClientPropagatesTenantInPaymentBodyAndHeader(t *testing.T) {
	configureActiveSaaS(t, "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-main" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		var input CreatePaymentSessionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if input.TenantID != "tenant-main" {
			t.Fatalf("expected tenant-main in payment body, got %q", input.TenantID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{ID: "ps-1", TenantID: "tenant-main"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	if _, err := client.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{
		CheckoutIntentID: "checkout-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
	}); err != nil {
		t.Fatalf("unexpected payment handoff error: %v", err)
	}
}

func TestActiveSaaSClientRejectsTenantOverride(t *testing.T) {
	configureActiveSaaS(t, "tenant-main")
	client := NewClient("https://wlt.internal", "service-token")

	_, err := client.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{
		TenantID:         "tenant-other",
		CheckoutIntentID: "checkout-1",
	})
	if err == nil || !strings.Contains(err.Error(), "does not match active SaaS runtime tenant") {
		t.Fatalf("expected tenant override rejection, got %v", err)
	}
}

func TestActiveSaaSClientFailsClosedWithoutRuntimeTenant(t *testing.T) {
	configureActiveSaaS(t, "")
	client := NewClient("https://wlt.internal", "service-token")
	if client.Configured() {
		t.Fatal("expected active SaaS client without tenant to be unconfigured")
	}
}
