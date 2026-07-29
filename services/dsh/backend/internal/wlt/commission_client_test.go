package wlt

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFinanceWriteCommissionRequiresTrustedTenant(t *testing.T) {
	client := NewClient("http://127.0.0.1:1", "service-token")
	_, _, err := client.FinanceWriteCommission(
		context.Background(),
		http.MethodPut,
		"/wlt/commission-policies",
		[]byte(`{"policyId":"policy-1"}`),
		"correlation-1",
	)
	if err == nil {
		t.Fatal("expected missing trusted tenant to fail closed")
	}
}

func TestFinanceWriteCommissionSendsTrustedTenantAndMutationHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-commission-test" {
			t.Fatalf("expected trusted tenant header, got %q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "dsh" {
			t.Fatalf("expected DSH service caller, got %q", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer service-token" {
			t.Fatalf("expected service bearer token, got %q", got)
		}
		if r.Header.Get("X-Correlation-ID") == "" || r.Header.Get("Idempotency-Key") == "" {
			t.Fatal("expected correlation and idempotency headers")
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read request body: %v", err)
		}
		if string(body) != `{"policyId":"policy-1"}` {
			t.Fatalf("unexpected request body %q", string(body))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	ctx := WithOperatorContext(context.Background(), "tenant-commission-test")
	status, body, err := client.FinanceWriteCommission(
		ctx,
		http.MethodPut,
		"/wlt/commission-policies",
		[]byte(`{"policyId":"policy-1"}`),
		"correlation-1",
	)
	if err != nil {
		t.Fatalf("finance commission write failed: %v", err)
	}
	if status != http.StatusOK || string(body) != `{"ok":true}` {
		t.Fatalf("unexpected response status=%d body=%s", status, body)
	}
}
