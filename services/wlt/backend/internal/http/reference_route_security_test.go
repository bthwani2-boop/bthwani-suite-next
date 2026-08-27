package http

import "testing"

func TestFinancialReferenceRoutesRequireAuthenticatedReadBoundary(t *testing.T) {
	_, routes := newRouterWithRoutes(nil, false, nil, nil)
	required := map[string]bool{
		"GET /wlt/references/payment-status":    false,
		"GET /wlt/references/settlement-status": false,
		"GET /wlt/references/refund-status":     false,
		"GET /wlt/references/wallet-status":     false,
		"GET /wlt/references/field-commission":  false,
	}

	for _, route := range routes {
		if _, tracked := required[route.Pattern]; !tracked {
			continue
		}
		required[route.Pattern] = true
		if route.Kind != routeRead || !route.ServiceAuth {
			t.Fatalf("financial reference route %q must be authenticated routeRead, kind=%d serviceAuth=%v", route.Pattern, route.Kind, route.ServiceAuth)
		}
	}

	for pattern, found := range required {
		if !found {
			t.Fatalf("financial reference route %q is missing from the governed router inventory", pattern)
		}
	}
}
