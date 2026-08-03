package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEvaluateDispatchFinancialEligibilityUsesAbstractWltDecision(t *testing.T) {
	evaluatedAt := time.Now().UTC().Add(-time.Second)
	expiresAt := evaluatedAt.Add(2 * time.Minute)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/internal/dispatch-financial-eligibility/evaluate" {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer service-token" || r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("missing service authentication headers")
		}
		if r.Header.Get("X-Operator-Context-ID") != "OperatorContext-a" {
			t.Fatalf("missing trusted operator context")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if len(body) != 1 || body["captainId"] != "captain-1" {
			t.Fatalf("DSH sent non-identity or financial inputs: %#v", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"decision":{"eligible":true,"reasonCode":"WLT_DISPATCH_FINANCIALLY_ELIGIBLE","decisionId":"wlt_dfe_1","policyVersion":"dispatch-balance@8","evaluatedAt":"` + evaluatedAt.Format(time.RFC3339Nano) + `","expiresAt":"` + expiresAt.Format(time.RFC3339Nano) + `"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	decision, err := client.EvaluateDispatchFinancialEligibility(trustedMutationTestContext(), "captain-1", "correlation-1", "OperatorContext-a")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !decision.Eligible || decision.DecisionID != "wlt_dfe_1" || decision.PolicyVersion != "dispatch-balance@8" {
		t.Fatalf("unexpected decision: %+v", decision)
	}
}

func TestEvaluateDispatchFinancialEligibilityRejectsIncompleteDecision(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"decision":{"eligible":true}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	_, err := client.EvaluateDispatchFinancialEligibility(trustedMutationTestContext(), "captain-1", "", "OperatorContext-a")
	if err == nil {
		t.Fatal("expected invalid WLT decision to fail closed")
	}
}

func TestEvaluateDispatchFinancialEligibilityDoesNotInferOnWltFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	_, err := client.EvaluateDispatchFinancialEligibility(trustedMutationTestContext(), "captain-1", "", "OperatorContext-a")
	if err == nil {
		t.Fatal("expected WLT failure to be returned")
	}
	if statusErr, ok := err.(DispatchFinancialEligibilityHTTPError); !ok || statusErr.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("expected HTTP error, got %T %v", err, err)
	}
}

func TestEvaluateDispatchFinancialEligibilityRejectsMissingOrMismatchedTrustedContext(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))
	defer server.Close()
	client := NewClient(server.URL, "service-token")

	if _, err := client.EvaluateDispatchFinancialEligibility(context.Background(), "captain-1", "", "OperatorContext-a"); err == nil {
		t.Fatal("expected missing trusted context to fail closed")
	}
	if _, err := client.EvaluateDispatchFinancialEligibility(trustedMutationTestContext(), "captain-1", "", "OperatorContext-b"); err == nil {
		t.Fatal("expected mismatched trusted context to fail closed")
	}
	if called {
		t.Fatal("financial eligibility reached WLT without a matching trusted context")
	}
}
