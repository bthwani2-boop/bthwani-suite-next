package wlt

import (
	"context"
	"dsh-api/internal/opctx"
	"net/http"
	"net/http/httptest"
	"testing"
)

func representativeWalletTestContext() context.Context {
	return opctx.WithOperatorContext(context.Background(), "OperatorContext-main")
}

func TestExecuteFinanceReadAllowsEveryRepresentativeActorType(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Delegated-Operator-Context"); got != "OperatorContext-main" {
			t.Fatalf("expected OperatorContext-main, got %q", got)
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"wallet":{"balanceMinorUnits":0}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	for _, actorType := range []string{"client", "partner", "captain", "field"} {
		t.Run(actorType, func(t *testing.T) {
			status, _, err := client.ExecuteFinanceRead(
				representativeWalletTestContext(),
				"finance.wallet.read",
				map[string]string{"actorType": actorType, "actorId": actorType + "-1"},
				nil,
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

func TestExecuteFinanceReadUsesCanonicalActorCoordinate(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if got := r.Header.Get("X-Delegated-Operator-Context"); got != "OperatorContext-main" {
			t.Fatalf("expected OperatorContext-main, got %q", got)
		}
		if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
			t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"wallet":{"balanceMinorUnits":0}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	if _, _, err := client.ExecuteFinanceRead(representativeWalletTestContext(), "finance.wallet.read", map[string]string{"actorType": "captain", "actorId": "captain-9"}, nil, "corr-9", "OperatorContext-main"); err != nil {
		t.Fatalf("expected canonical representative actor type: %v", err)
	}
	if gotPath != "/wlt/wallets/captain/captain-9" {
		t.Fatalf("unexpected normalized path %q", gotPath)
	}
}
