package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFinanceOperationDescriptorsOwnExactCoordinates(t *testing.T) {
	cases := []struct{ id, method, path, permission string }{
		{"finance.payout_destinations.upsert", http.MethodPut, "/wlt/payout-destinations/{actorType}/{actorId}", "finance.manage"},
		{"finance.reconciliation.resolve", http.MethodPost, "/wlt/reconciliation-cases/{caseId}/resolve", "finance.manage"},
		{"finance.refunds.detail.read", http.MethodGet, "/wlt/refunds/{refundId}", "finance.read"},
	}
	for _, tc := range cases {
		op, err := Registry.GetOperation(tc.id)
		if err != nil {
			t.Fatalf("%s: %v", tc.id, err)
		}
		if op.HTTPMethod != tc.method || op.PathTemplate != tc.path || op.RequiredPermission != tc.permission {
			t.Fatalf("%s descriptor = %#v", tc.id, op)
		}
	}
}

func TestFinanceOperationRejectsMixedOrIncompleteCoordinates(t *testing.T) {
	op, _ := Registry.GetOperation("finance.payout_destinations.upsert")
	if _, err := op.Path(map[string]string{"actorType": "partner"}); err == nil {
		t.Fatal("expected missing path parameter rejection")
	}
	if _, err := op.Path(map[string]string{"actorType": "partner", "actorId": "p-1", "wrong": "x"}); err == nil {
		t.Fatal("expected unexpected path parameter rejection")
	}
}

func TestExecuteFinanceWriteEnforcesCanonicalRequirements(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	defer server.Close()
	c := NewClient(server.URL, "service-token")
	ctx := context.WithValue(WithOperatorContext(context.Background(), "operator-1"), "authorized_action", "finance.manage")
	if _, _, err := c.ExecuteFinanceWrite(ctx, "finance.reconciliation.resolve", map[string]string{"caseId": "case-1"}, []byte(`{}`), "corr-1", "", "operator-1", "actor-1"); err == nil || !strings.Contains(err.Error(), "requires an idempotency key") {
		t.Fatalf("expected idempotency rejection, got %v", err)
	}
	if _, _, err := c.ExecuteFinanceWrite(ctx, "finance.reconciliation.resolve", map[string]string{"caseId": "case-1"}, []byte(`{}`), "corr-1", "idem-1", "operator-1", ""); err == nil || !strings.Contains(err.Error(), "delegated finance principal") {
		t.Fatalf("expected delegation rejection, got %v", err)
	}
	wrong := context.WithValue(WithOperatorContext(context.Background(), "operator-1"), "authorized_action", "finance.read")
	if _, _, err := c.ExecuteFinanceWrite(wrong, "finance.reconciliation.resolve", map[string]string{"caseId": "case-1"}, []byte(`{}`), "corr-1", "idem-1", "operator-1", "actor-1"); err == nil || !strings.Contains(err.Error(), "requires permission") {
		t.Fatalf("expected permission rejection, got %v", err)
	}
	if _, _, err := c.ExecuteFinanceWrite(ctx, "finance.reconciliation.resolve", map[string]string{"caseId": "case-1"}, []byte(`{}`), "", "idem-1", "operator-1", "actor-1"); err == nil || !strings.Contains(err.Error(), "correlation id") {
		t.Fatalf("expected correlation rejection, got %v", err)
	}
}

func TestExecuteFinanceWriteUsesRegistryMethodAndPath(t *testing.T) {
	var gotMethod, gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath = r.Method, r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	c := NewClient(server.URL, "service-token")
	ctx := context.WithValue(WithOperatorContext(context.Background(), "operator-1"), "authorized_action", "finance.manage")
	if _, _, err := c.ExecuteFinanceWrite(ctx, "finance.reconciliation.resolve", map[string]string{"caseId": "case-1"}, []byte(`{}`), "corr-1", "idem-1", "operator-1", "actor-1"); err != nil {
		t.Fatal(err)
	}
	if gotMethod != http.MethodPost || gotPath != "/wlt/reconciliation-cases/case-1/resolve" {
		t.Fatalf("request = %s %s", gotMethod, gotPath)
	}
}
