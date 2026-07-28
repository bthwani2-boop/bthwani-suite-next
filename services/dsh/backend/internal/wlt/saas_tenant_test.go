package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureActiveSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	// A configured default must not become an active-SaaS ownership fallback.
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "legacy-default")
}

func TestActiveSaaSClientPropagatesTrustedTenantToCodHandoff(t *testing.T) {
	configureActiveSaaS(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-a" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := WithTenantContext(context.Background(), "tenant-a")
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

func TestActiveSaaSClientPropagatesTenantInPaymentBodyAndHeader(t *testing.T) {
	configureActiveSaaS(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-b" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		var input CreatePaymentSessionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if input.TenantID != "tenant-b" {
			t.Fatalf("expected tenant-b in payment body, got %q", input.TenantID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{ID: "ps-1", TenantID: "tenant-b"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := WithTenantContext(context.Background(), "tenant-b")
	if _, err := client.CreatePaymentSession(ctx, CreatePaymentSessionInput{
		CheckoutIntentID: "checkout-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
	}); err != nil {
		t.Fatalf("unexpected payment handoff error: %v", err)
	}
}

func TestActiveSaaSClientRejectsTenantOverride(t *testing.T) {
	configureActiveSaaS(t)
	client := NewClient("https://wlt.internal", "service-token")
	ctx := WithTenantContext(context.Background(), "tenant-a")

	_, err := client.CreatePaymentSession(ctx, CreatePaymentSessionInput{
		TenantID:         "tenant-b",
		CheckoutIntentID: "checkout-1",
	})
	if err == nil || !strings.Contains(err.Error(), "does not match trusted request context") {
		t.Fatalf("expected tenant override rejection, got %v", err)
	}
}

func TestActiveSaaSClientFailsClosedWithoutTrustedTenant(t *testing.T) {
	configureActiveSaaS(t)
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
}

func TestDeferredClientKeepsExplicitCompatibilityTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "local-dsh")
	client := NewClient("https://wlt.internal", "service-token")
	tenantID, err := client.resolveTrustedTenant(context.Background(), "")
	if err != nil || tenantID != "local-dsh" {
		t.Fatalf("deferred compatibility tenant=%q err=%v", tenantID, err)
	}
}
