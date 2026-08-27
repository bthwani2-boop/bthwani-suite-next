package provider

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestFinancialRailFailsClosedWithoutRegistry proves the nil-registry bypass
// is dead: any capability exercised without the wlt_financial_providers
// registry authority is refused, in every mode, before any HTTP traffic can
// leave the process (root #5 regression fence).
func TestFinancialRailFailsClosedWithoutRegistry(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://127.0.0.1:1")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	var outboundCalls int
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		outboundCalls++
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", upstream.URL)

	router, err := NewFinancialRailRouter(nil, "sandbox")
	if err != nil {
		t.Fatalf("mock router construction: %v", err)
	}

	meta := RequestMeta{IdempotencyKey: "rail-fail-closed-test"}
	capabilities := []struct {
		name string
		call func() error
	}{
		{"authorize", func() error { _, err := router.Authorize(context.Background(), map[string]any{}, meta); return err }},
		{"capture", func() error { _, err := router.Capture(context.Background(), map[string]any{}, meta); return err }},
		{"refund", func() error { _, err := router.Refund(context.Background(), map[string]any{}, meta); return err }},
		{"status", func() error { _, err := router.Status(context.Background(), meta); return err }},
	}
	for _, capability := range capabilities {
		if err := capability.call(); !errors.Is(err, ErrRailRegistryRequired) {
			t.Fatalf("capability %s must fail closed with ErrRailRegistryRequired, got %v", capability.name, err)
		}
	}
	if outboundCalls != 0 {
		t.Fatalf("no outbound HTTP traffic may leave a registry-less rail, got %d calls", outboundCalls)
	}
}
