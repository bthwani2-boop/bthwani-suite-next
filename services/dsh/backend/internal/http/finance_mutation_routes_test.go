package http

import (
	"net/http"
	"testing"
)

func TestGovernedFinanceMutationRoutesAreRegisteredExactlyOnce(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{method: http.MethodPost, path: "/dsh/control-panel/finance/payout-requests/payout-1/approve", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve"},
		{method: http.MethodPost, path: "/dsh/control-panel/finance/payout-requests/payout-1/reject", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject"},
		{method: http.MethodPost, path: "/dsh/control-panel/finance/payout-requests/payout-1/complete", pattern: "POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete"},
		{method: http.MethodGet, path: "/dsh/control-panel/finance/payout-requests/payout-1/audit", pattern: "GET /dsh/control-panel/finance/payout-requests/{payoutId}/audit"},
		{method: http.MethodPost, path: "/dsh/control-panel/finance/reconciliation-cases/case-1/assign", pattern: "POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign"},
		{method: http.MethodPost, path: "/dsh/control-panel/finance/reconciliation-cases/case-1/resolve", pattern: "POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve"},
	}

	for _, tc := range cases {
		req, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(req)
		if pattern != tc.pattern {
			t.Fatalf("%s %s: expected route %q, got %q", tc.method, tc.path, tc.pattern, pattern)
		}
	}
}
