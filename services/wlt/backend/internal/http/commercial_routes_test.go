package http

import (
	"net/http/httptest"
	"testing"
)

func TestCommercialBenefitRoutesRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	tests := []struct {
		method  string
		path    string
		pattern string
	}{
		{method: "GET", path: "/wlt/commercial/summary", pattern: "GET /wlt/commercial/summary"},
		{method: "GET", path: "/wlt/commercial/products/sub-basic", pattern: "GET /wlt/commercial/products/{productReference}"},
		{method: "POST", path: "/wlt/commercial/products", pattern: "POST /wlt/commercial/products"},
		{method: "PATCH", path: "/wlt/commercial/products/sub-basic", pattern: "PATCH /wlt/commercial/products/{productReference}"},
		{method: "POST", path: "/wlt/commercial/payment-sessions", pattern: "POST /wlt/commercial/payment-sessions"},
		{method: "GET", path: "/wlt/commercial/clients/client-1/benefits", pattern: "GET /wlt/commercial/clients/{clientId}/benefits"},
		{method: "POST", path: "/wlt/commercial/loyalty-entries", pattern: "POST /wlt/commercial/loyalty-entries"},
		{method: "POST", path: "/wlt/commercial/subscriptions", pattern: "POST /wlt/commercial/subscriptions"},
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
