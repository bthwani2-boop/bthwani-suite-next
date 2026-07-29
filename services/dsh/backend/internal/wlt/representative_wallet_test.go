package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func representativeWalletTestContext() context.Context {
	return WithOperatorContext(context.Background(), "OperatorContext-main")
}

func TestFinanceReadWalletAllowsEveryRepresentativeActorType(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Operator-Context-ID") != "OperatorContext-main" {
			t.Fatalf("expected OperatorContext-main, got %q", r.Header.Get("X-Operator-Context-ID"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	for _, actorType := range []string{"client", "partner", "captain", "field"} {
		t.Run(actorType, func(t *testing.T) {
			status, _, err := client.FinanceReadWalletWithOperatorContext(
				representativeWalletTestContext(),
				actorType,
				actorType+"-1",
				"corr-"+actorType,
				"OperatorContext-main",
			)
			if err != nil {
				t.Fatalf("expected %s wallet read to be allowed: %v", actorType, err)
			}
			if status != http.StatusOK {
				t.Fatalf("expected 200 for %s, got %d", actorType, status)
			}
		})
	}
}

func TestFinanceReadWalletNormalizesActorTypeCase(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.Header.Get("X-Operator-Context-ID") != "OperatorContext-main" {
			t.Fatalf("expected OperatorContext-main, got %q", r.Header.Get("X-Operator-Context-ID"))
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	if _, _, err := client.FinanceReadWalletWithOperatorContext(representativeWalletTestContext(), "CAPTAIN", "captain-9", "corr-9", "OperatorContext-main"); err != nil {
		t.Fatalf("expected uppercase representative actor type to normalize: %v", err)
	}
	if gotPath != "/wlt/wallets/captain/captain-9" {
		t.Fatalf("unexpected normalized path %q", gotPath)
	}
}
