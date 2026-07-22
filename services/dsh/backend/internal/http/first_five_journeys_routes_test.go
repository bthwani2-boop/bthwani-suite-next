package http

import (
	"net/http"
	"testing"
)

func TestFirstFiveJourneysExposeGovernedDSHRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPartnerLifecycleRoutes(router, nil, nil, nil, nil)
	RegisterPartnerSelfRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		{journey: "JRN-001 partner intake", method: http.MethodPost, path: "/dsh/operator/partners", pattern: "POST /dsh/operator/partners"},
		{journey: "JRN-001 field draft", method: http.MethodPost, path: "/dsh/field/partners/drafts", pattern: "POST /dsh/field/partners/drafts"},
		{journey: "JRN-001 partner readback", method: http.MethodGet, path: "/dsh/partner/activation/status", pattern: "GET /dsh/partner/activation/status"},
		{journey: "JRN-004 public discovery", method: http.MethodGet, path: "/dsh/stores", pattern: "GET /dsh/stores"},
		{journey: "JRN-004 public detail", method: http.MethodGet, path: "/dsh/stores/store-1", pattern: "GET /dsh/stores/{storeId}"},
		{journey: "JRN-004 operator governance", method: http.MethodPost, path: "/dsh/operator/stores/store-1/governance", pattern: "POST /dsh/operator/stores/{storeId}/governance"},
		{journey: "JRN-005 address list", method: http.MethodGet, path: "/dsh/client/addresses", pattern: "GET /dsh/client/addresses"},
		{journey: "JRN-005 address create", method: http.MethodPost, path: "/dsh/client/addresses", pattern: "POST /dsh/client/addresses"},
		{journey: "JRN-005 address update", method: http.MethodPatch, path: "/dsh/client/addresses/address-1", pattern: "PATCH /dsh/client/addresses/{addressId}"},
		{journey: "JRN-005 address delete", method: http.MethodDelete, path: "/dsh/client/addresses/address-1", pattern: "DELETE /dsh/client/addresses/{addressId}"},
		{journey: "JRN-005 default address", method: http.MethodPost, path: "/dsh/client/addresses/address-1/default", pattern: "POST /dsh/client/addresses/{addressId}/default"},
	}

	for _, tc := range cases {
		t.Run(tc.journey, func(t *testing.T) {
			request, err := http.NewRequest(tc.method, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern != tc.pattern {
				t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
			}
		})
	}
}
