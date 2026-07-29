package provider

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestPayoutInquiryRequiresCanonicalIdentifiers(t *testing.T) {
	client := NewClient(Config{Mode: ModeSandbox, BaseURL: "http://127.0.0.1"})
	_, err := client.InquirePayout(context.Background(), url.Values{"providerReference": {"provider-1"}})
	if err == nil || !strings.Contains(err.Error(), "payoutRequestId") {
		t.Fatalf("expected required identifiers error, got %v", err)
	}
}

func TestPayoutInquiryUsesProviderReadAndPreservesReference(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != payoutInquiryPath {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if r.URL.Query().Get("operatorContextId") != "tenant-1" || r.URL.Query().Get("payoutRequestId") != "payout-1" {
			t.Fatalf("unexpected query %s", r.URL.RawQuery)
		}
		if strings.TrimSpace(r.Header.Get("X-Correlation-ID")) == "" {
			t.Fatal("payout inquiry omitted correlation id")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"completed","code":"OK"}`))
	}))
	defer server.Close()

	client := NewClient(Config{Mode: ModeSandbox, BaseURL: server.URL})
	inquiry, err := client.InquirePayout(context.Background(), url.Values{
		"providerReference": {"provider-1"},
		"payoutRequestId":  {"payout-1"},
		"operatorContextId":         {"tenant-1"},
	})
	if err != nil {
		t.Fatalf("unexpected inquiry error: %v", err)
	}
	if inquiry.ProviderReference != "provider-1" || inquiry.Status != "completed" || inquiry.ResponseCode != "OK" {
		t.Fatalf("unexpected inquiry %#v", inquiry)
	}
}

func TestProductionPayoutInquiryFailsClosed(t *testing.T) {
	_, err := NewProductionPaymentAdapter().InquirePayout(context.Background(), url.Values{
		"providerReference": {"provider-1"},
		"payoutRequestId":  {"payout-1"},
		"operatorContextId":         {"tenant-1"},
	})
	if err == nil || !strings.Contains(err.Error(), ErrProductionProviderUnavailable.Error()) {
		t.Fatalf("expected production provider block, got %v", err)
	}
}
