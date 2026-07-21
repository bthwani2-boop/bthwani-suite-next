package http

import (
	"net/http/httptest"
	"testing"
)

func TestCommercialProgramRoutesRegistered(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	tests := []struct {
		method  string
		path    string
		pattern string
	}{
		{method: "GET", path: "/dsh/operator/marketing/loyalty-tiers", pattern: "GET /dsh/operator/marketing/loyalty-tiers"},
		{method: "POST", path: "/dsh/operator/marketing/loyalty-tiers", pattern: "POST /dsh/operator/marketing/loyalty-tiers"},
		{method: "PATCH", path: "/dsh/operator/marketing/loyalty-tiers/tier-1", pattern: "PATCH /dsh/operator/marketing/loyalty-tiers/{tierId}"},
		{method: "GET", path: "/dsh/operator/marketing/subscription-plans", pattern: "GET /dsh/operator/marketing/subscription-plans"},
		{method: "POST", path: "/dsh/operator/marketing/subscription-plans", pattern: "POST /dsh/operator/marketing/subscription-plans"},
		{method: "PATCH", path: "/dsh/operator/marketing/subscription-plans/plan-1", pattern: "PATCH /dsh/operator/marketing/subscription-plans/{planId}"},
		{method: "GET", path: "/dsh/client/benefits", pattern: "GET /dsh/client/benefits"},
	}

	for _, tt := range tests {
		t.Run(tt.method+"_"+tt.path, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.path, nil)
			_, pattern := router.Handler(request)
			if pattern != tt.pattern {
				t.Fatalf("route %s %s resolved to %q, want %q", tt.method, tt.path, pattern, tt.pattern)
			}
		})
	}
}
