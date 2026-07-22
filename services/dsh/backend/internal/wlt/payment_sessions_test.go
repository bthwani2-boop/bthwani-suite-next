package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReadPaymentSessionTimelineForwardsGovernedHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("expected GET, got %s", r.Method)
		}
		if r.URL.EscapedPath() != "/wlt/payment-sessions/payment-session-1/timeline" {
			t.Fatalf("unexpected path %q", r.URL.EscapedPath())
		}
		if r.Header.Get("Authorization") != "Bearer service-token" {
			t.Fatalf("missing service authorization")
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected DSH service caller")
		}
		if r.Header.Get("X-Tenant-ID") != "tenant-main" {
			t.Fatalf("expected tenant-main, got %q", r.Header.Get("X-Tenant-ID"))
		}
		if r.Header.Get("X-Correlation-ID") != "corr-1" {
			t.Fatalf("expected corr-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"paymentTimeline":{"paymentSession":{"id":"payment-session-1"}}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	status, body, err := client.ReadPaymentSessionTimeline(context.Background(), " tenant-main ", "payment-session-1", "corr-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK || !strings.Contains(string(body), "payment-session-1") {
		t.Fatalf("unexpected response status=%d body=%q", status, body)
	}
}

func TestRefreshPaymentSessionProviderStatusBuildsReplaySafeMutation(t *testing.T) {
	var firstIdempotencyKey string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.EscapedPath() != "/wlt/payment-sessions/payment-session-2/refresh-provider-status" {
			t.Fatalf("unexpected path %q", r.URL.EscapedPath())
		}
		if r.Header.Get("X-Tenant-ID") != "tenant-main" {
			t.Fatalf("expected tenant-main")
		}
		if r.Header.Get("X-Correlation-ID") != "payment-session-2" {
			t.Fatalf("empty correlation must fall back to the payment session id, got %q", r.Header.Get("X-Correlation-ID"))
		}
		key := r.Header.Get("Idempotency-Key")
		if key == "" {
			t.Fatal("expected deterministic idempotency key")
		}
		if firstIdempotencyKey == "" {
			firstIdempotencyKey = key
		} else if key != firstIdempotencyKey {
			t.Fatalf("expected stable key %q, got %q", firstIdempotencyKey, key)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"paymentSession":{"id":"payment-session-2","status":"provider_result_unknown"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	for range 2 {
		status, _, err := client.RefreshPaymentSessionProviderStatus(context.Background(), "tenant-main", "payment-session-2", "", "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if status != http.StatusOK {
			t.Fatalf("expected 200, got %d", status)
		}
	}
}

func TestPaymentSessionBoundaryRejectsMissingIdentity(t *testing.T) {
	client := NewClient("https://wlt.internal", "service-token")
	if _, _, err := client.ReadPaymentSessionTimeline(context.Background(), "", "payment-session-1", "corr"); err == nil {
		t.Fatal("expected missing tenant to fail")
	}
	if _, _, err := client.RefreshPaymentSessionProviderStatus(context.Background(), "tenant-main", "", "corr", "idem"); err == nil {
		t.Fatal("expected missing payment session to fail")
	}
}
